import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'pulsepoll-super-secret-jwt-key-change-in-production-2026';

// Support primary and alternate keys for Gemini AI generation
const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY ||
  process.env.ALTERNATE_GEMINI_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  process.env.API_KEY ||
  '';

let genAI: GoogleGenAI | null = null;
if (GEMINI_API_KEY && GEMINI_API_KEY !== 'MY_GEMINI_API_KEY') {
  try {
    genAI = new GoogleGenAI({
      apiKey: GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.warn('[Gemini] Initializing client fallback:', err);
  }
}

interface User {
  id: string;
  email: string;
  passwordHash: string;
  name?: string;
  createdAt: string;
}

interface PollOption {
  id: string;
  text: string;
}

interface Poll {
  id: string;
  code?: string;
  ownerId: string;
  ownerEmail: string;
  question: string;
  options: PollOption[];
  status: 'active' | 'closed';
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  counts: Record<string, number>;
  totalVotes: number;
}

interface Vote {
  id: string;
  pollId: string;
  optionId: string;
  voterId: string;
  createdAt: string;
}

// In-memory persistent state (mirroring MongoDB Collections + Redis Hashes)
const users: Map<string, User> = new Map();
const polls: Map<string, Poll> = new Map();
const votes: Vote[] = [];

// Helper to look up poll by either id or human-friendly join key
function findPoll(idOrCode: string): Poll | undefined {
  if (polls.has(idOrCode)) return polls.get(idOrCode);
  const normalized = idOrCode.trim().toUpperCase();
  for (const p of polls.values()) {
    if (p.code && p.code.toUpperCase() === normalized) return p;
    if (p.id.toUpperCase() === normalized) return p;
  }
  return undefined;
}

const KEY_PREFIXES = ['PULSE', 'VOTE', 'SYNC', 'LIVE', 'FAST', 'NODE', 'TEAM'];
function generateUniquePollKey(alternate = false): string {
  for (let i = 0; i < 30; i++) {
    const prefix = alternate
      ? KEY_PREFIXES[Math.floor(Math.random() * KEY_PREFIXES.length)]
      : 'PULSE';
    const num = Math.floor(100 + Math.random() * 900);
    const key = `${prefix}-${num}`;
    let exists = false;
    for (const p of polls.values()) {
      if (p.code?.toUpperCase() === key) {
        exists = true;
        break;
      }
    }
    if (!exists) return key;
  }
  return 'POLL-' + Math.random().toString(36).substring(2, 6).toUpperCase();
}

// Seed demo user
const demoPasswordHash = bcrypt.hashSync('demo1234', 10);
const demoUser: User = {
  id: 'usr_demo_8829',
  email: 'demo@pulsepoll.io',
  passwordHash: demoPasswordHash,
  name: 'Demo Organizer',
  createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
};
users.set(demoUser.id, demoUser);

// Seed 2 initial live polls with realistic votes so users can immediately test & view live results
const seedPoll1: Poll = {
  id: 'poll_tech_stack_2026',
  code: 'STACK-26',
  ownerId: demoUser.id,
  ownerEmail: demoUser.email,
  question: 'What is your primary programming language for high-performance backend systems?',
  options: [
    { id: 'opt_go', text: 'Go (Golang)' },
    { id: 'opt_rust', text: 'Rust' },
    { id: 'opt_typescript', text: 'TypeScript / Node.js' },
    { id: 'opt_python', text: 'Python (FastAPI)' },
  ],
  status: 'active',
  createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  closedAt: null,
  counts: {
    opt_go: 18,
    opt_rust: 14,
    opt_typescript: 11,
    opt_python: 7,
  },
  totalVotes: 50,
};
polls.set(seedPoll1.id, seedPoll1);

const seedPoll2: Poll = {
  id: 'poll_database_choice_2026',
  code: 'DB-2026',
  ownerId: demoUser.id,
  ownerEmail: demoUser.email,
  question: 'Which database do you rely on most for unstructured or semi-structured data?',
  options: [
    { id: 'opt_mongo', text: 'MongoDB' },
    { id: 'opt_postgres_json', text: 'PostgreSQL (JSONB)' },
    { id: 'opt_dynamo', text: 'AWS DynamoDB' },
  ],
  status: 'active',
  createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  closedAt: null,
  counts: {
    opt_mongo: 22,
    opt_postgres_json: 19,
    opt_dynamo: 6,
  },
  totalVotes: 47,
};
polls.set(seedPoll2.id, seedPoll2);

// Map of active WebSocket subscribers per pollId
const pollSubscribers: Map<string, Set<WebSocket>> = new Map();

function broadcastToPoll(pollId: string, payload: any) {
  const subscribers = pollSubscribers.get(pollId);
  if (!subscribers || subscribers.size === 0) return;
  const message = JSON.stringify(payload);
  subscribers.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
      } catch (err) {
        console.error('Failed to send message to client', err);
      }
    }
  });
}

// Authentication middleware
function authenticateJWT(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, data: null, error: 'Unauthorized: missing or invalid token' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    (req as any).user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ success: false, data: null, error: 'Unauthorized: token is invalid or expired' });
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  const server = http.createServer(app);

  // Initialize Native WebSocket Server
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = request.url || '';
    // Expected route: /api/ws/polls/:id or /ws/polls/:id
    const match = url.match(/\/(?:api\/)?ws\/polls\/([a-zA-Z0-9_-]+)/);
    if (!match) {
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
      socket.destroy();
      return;
    }

    const pollId = match[1];
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request, pollId);
    });
  });

  wss.on('connection', (ws: WebSocket, _request: http.IncomingMessage, rawPollId: string) => {
    const targetPoll = findPoll(rawPollId);
    const pollId = targetPoll ? targetPoll.id : rawPollId;

    if (!pollSubscribers.has(pollId)) {
      pollSubscribers.set(pollId, new Set());
    }
    const clients = pollSubscribers.get(pollId)!;
    clients.add(ws);

    // Send initial poll state immediately upon connection
    const poll = targetPoll || polls.get(pollId);
    if (poll) {
      ws.send(
        JSON.stringify({
          type: 'initial_state',
          pollId: poll.id,
          code: poll.code,
          counts: poll.counts,
          totalVotes: poll.totalVotes,
          status: poll.status,
          closedAt: poll.closedAt,
        })
      );
    }

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        }
      } catch {
        // ignore malformed ping
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      if (clients.size === 0) {
        pollSubscribers.delete(pollId);
      }
    });
  });

  // REST API: AUTH
  app.post('/api/auth/signup', (req: Request, res: Response) => {
    const { email, password, name } = req.body;
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({ success: false, data: null, error: 'Valid email and password are required' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ success: false, data: null, error: 'Password must be at least 6 characters' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    for (const u of users.values()) {
      if (u.email.toLowerCase() === normalizedEmail) {
        res.status(409).json({ success: false, data: null, error: 'An account with that email already exists' });
        return;
      }
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const newUser: User = {
      id: 'usr_' + Math.random().toString(36).substring(2, 9),
      email: normalizedEmail,
      passwordHash,
      name: name?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    users.set(newUser.id, newUser);

    const token = jwt.sign({ userId: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      success: true,
      data: {
        user: { id: newUser.id, email: newUser.email, name: newUser.name, createdAt: newUser.createdAt },
        token,
      },
      error: null,
    });
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ success: false, data: null, error: 'Email and password are required' });
      return;
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    let foundUser: User | null = null;
    for (const u of users.values()) {
      if (u.email.toLowerCase() === normalizedEmail) {
        foundUser = u;
        break;
      }
    }

    if (!foundUser || !bcrypt.compareSync(password, foundUser.passwordHash)) {
      res.status(401).json({ success: false, data: null, error: 'Invalid email or password' });
      return;
    }

    const token = jwt.sign({ userId: foundUser.id, email: foundUser.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      success: true,
      data: {
        user: { id: foundUser.id, email: foundUser.email, name: foundUser.name, createdAt: foundUser.createdAt },
        token,
      },
      error: null,
    });
  });

  app.get('/api/auth/me', authenticateJWT, (req: Request, res: Response) => {
    const { userId } = (req as any).user;
    const user = users.get(userId);
    if (!user) {
      res.status(404).json({ success: false, data: null, error: 'User not found' });
      return;
    }
    res.json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
      },
      error: null,
    });
  });

  // REST API: KEY GENERATION (for Poll Join Keys & alternate codes)
  app.get('/api/polls/generate-key', (req: Request, res: Response) => {
    const isAlternate = req.query.alternate === 'true';
    const key = generateUniquePollKey(isAlternate);
    res.json({ success: true, data: { key }, error: null });
  });

  // REST API: POLLS
  app.get('/api/polls', (_req: Request, res: Response) => {
    const list = Array.from(polls.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    res.json({ success: true, data: list, error: null });
  });

  app.get('/api/polls/my', authenticateJWT, (req: Request, res: Response) => {
    const { userId } = (req as any).user;
    const list = Array.from(polls.values())
      .filter((p) => p.ownerId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ success: true, data: list, error: null });
  });

  app.get('/api/polls/:id', (req: Request, res: Response) => {
    const poll = findPoll(req.params.id);
    if (!poll) {
      res.status(404).json({ success: false, data: null, error: 'Poll not found with specified ID or Join Key' });
      return;
    }
    res.json({ success: true, data: poll, error: null });
  });

  app.get('/api/polls/:id/results', (req: Request, res: Response) => {
    const poll = findPoll(req.params.id);
    if (!poll) {
      res.status(404).json({ success: false, data: null, error: 'Poll not found' });
      return;
    }
    res.json({
      success: true,
      data: {
        pollId: poll.id,
        code: poll.code,
        counts: poll.counts,
        totalVotes: poll.totalVotes,
      },
      error: null,
    });
  });

  app.post('/api/polls', authenticateJWT, (req: Request, res: Response) => {
    const { question, options, code } = req.body;
    const { userId, email } = (req as any).user;

    if (!question || typeof question !== 'string' || question.trim().length < 5 || question.trim().length > 200) {
      res.status(400).json({ success: false, data: null, error: 'Question must be between 5 and 200 characters' });
      return;
    }

    if (!Array.isArray(options) || options.length < 2 || options.length > 10) {
      res.status(400).json({ success: false, data: null, error: 'Poll must have between 2 and 10 options' });
      return;
    }

    const trimmedOptions = options.map((opt: string) => String(opt).trim());
    if (trimmedOptions.some((opt: string) => opt.length === 0 || opt.length > 100)) {
      res.status(400).json({ success: false, data: null, error: 'Each option must be between 1 and 100 characters' });
      return;
    }

    const uniqueSet = new Set(trimmedOptions.map((o: string) => o.toLowerCase()));
    if (uniqueSet.size !== trimmedOptions.length) {
      res.status(400).json({ success: false, data: null, error: 'Duplicate options are not permitted' });
      return;
    }

    // Determine poll code (Join Key)
    let assignedCode = generateUniquePollKey();
    if (code && typeof code === 'string' && code.trim().length >= 3) {
      const sanitized = code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
      const existing = findPoll(sanitized);
      if (existing) {
        res.status(409).json({ success: false, data: null, error: 'That Poll Join Key is already in use. Please try an alternate key.' });
        return;
      }
      assignedCode = sanitized;
    }

    const pollId = 'poll_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const pollOptions: PollOption[] = trimmedOptions.map((text: string, i: number) => ({
      id: `opt_${i + 1}_` + Math.random().toString(36).substring(2, 6),
      text,
    }));

    const counts: Record<string, number> = {};
    pollOptions.forEach((opt) => {
      counts[opt.id] = 0;
    });

    const now = new Date().toISOString();
    const newPoll: Poll = {
      id: pollId,
      code: assignedCode,
      ownerId: userId,
      ownerEmail: email,
      question: question.trim(),
      options: pollOptions,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      closedAt: null,
      counts,
      totalVotes: 0,
    };

    polls.set(newPoll.id, newPoll);
    res.status(201).json({ success: true, data: newPoll, error: null });
  });

  // REST API: VOTING (Atomic counter update + Redis Pub/Sub broadcast simulation)
  app.post('/api/polls/:id/votes', (req: Request, res: Response) => {
    const poll = findPoll(req.params.id);
    if (!poll) {
      res.status(404).json({ success: false, data: null, error: 'Poll not found' });
      return;
    }

    const id = poll.id;
    const { optionId, voterId } = req.body;

    if (poll.status !== 'active') {
      res.status(400).json({ success: false, data: null, error: 'Voting is closed for this poll' });
      return;
    }

    const optionExists = poll.options.some((opt) => opt.id === optionId);
    if (!optionExists) {
      res.status(400).json({ success: false, data: null, error: 'Invalid option selected for this poll' });
      return;
    }

    // Check duplicate vote if voterId is supplied
    if (voterId) {
      const alreadyVoted = votes.some((v) => v.pollId === id && v.voterId === voterId);
      if (alreadyVoted) {
        res.status(409).json({ success: false, data: null, error: 'You have already voted on this poll' });
        return;
      }
    }

    // Atomic increment (Simulating Redis HINCRBY poll:id:results optionId 1)
    poll.counts[optionId] = (poll.counts[optionId] || 0) + 1;
    poll.totalVotes += 1;
    poll.updatedAt = new Date().toISOString();

    // Persist vote record (Simulating MongoDB votes.insertOne)
    const newVote: Vote = {
      id: 'vote_' + Math.random().toString(36).substring(2, 9),
      pollId: id,
      optionId,
      voterId: voterId || 'anonymous',
      createdAt: new Date().toISOString(),
    };
    votes.push(newVote);

    // Redis Pub/Sub Broadcast to all connected WebSocket clients
    broadcastToPoll(id, {
      type: 'vote_cast',
      pollId: id,
      code: poll.code,
      optionId,
      counts: poll.counts,
      totalVotes: poll.totalVotes,
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      data: {
        success: true,
        counts: poll.counts,
        totalVotes: poll.totalVotes,
      },
      error: null,
    });
  });

  // REST API: CLOSE POLL (Owner only)
  app.post('/api/polls/:id/close', authenticateJWT, (req: Request, res: Response) => {
    const poll = findPoll(req.params.id);
    if (!poll) {
      res.status(404).json({ success: false, data: null, error: 'Poll not found' });
      return;
    }

    const id = poll.id;
    const { userId } = (req as any).user;

    if (poll.ownerId !== userId) {
      res.status(403).json({ success: false, data: null, error: 'Forbidden: you are not the creator of this poll' });
      return;
    }

    const now = new Date().toISOString();
    poll.status = 'closed';
    poll.closedAt = now;
    poll.updatedAt = now;

    // Broadcast poll closed event over WebSocket
    broadcastToPoll(id, {
      type: 'poll_closed',
      pollId: id,
      code: poll.code,
      status: 'closed',
      closedAt: now,
      counts: poll.counts,
      totalVotes: poll.totalVotes,
    });

    res.json({ success: true, data: poll, error: null });
  });

  // REST API: DELETE POLL (Owner only)
  app.delete('/api/polls/:id', authenticateJWT, (req: Request, res: Response) => {
    const poll = findPoll(req.params.id);
    if (!poll) {
      res.status(404).json({ success: false, data: null, error: 'Poll not found' });
      return;
    }

    const id = poll.id;
    const { userId } = (req as any).user;

    if (poll.ownerId !== userId) {
      res.status(403).json({ success: false, data: null, error: 'Forbidden: you are not the creator of this poll' });
      return;
    }

    polls.delete(id);
    res.json({ success: true, data: { message: 'Poll deleted successfully' }, error: null });
  });

  // REST API: AI GENERATE POLL (Powered by Gemini API with heuristic fallback)
  app.post('/api/ai/generate-poll', async (req: Request, res: Response) => {
    const { topic } = req.body || {};
    const cleanTopic = typeof topic === 'string' ? topic.trim() : '';

    const fallbackPolls = [
      {
        question: 'Which cloud architecture pattern do you rely on most for scalable services?',
        options: ['Modular Monolith with Clear Boundaries', 'Microservices over gRPC', 'Event-Driven Serverless Functions', 'CQRS + Event Sourcing'],
        category: 'Architecture',
      },
      {
        question: 'What is your top criterion when selecting a primary database?',
        options: ['Strict ACID Consistency & Relational Integrity', 'Horizontal Scale & Zero-Downtime Sharding', 'Native Vector Search / AI Embeddings', 'Rapid Developer Prototyping Speed'],
        category: 'Databases',
      },
      {
        question: 'How does your engineering organization prefer to conduct code reviews?',
        options: ['Asynchronous GitHub PRs with Strict Linters', 'Live Pair Programming / Mob Reviews', 'AI-assisted Pre-review + Senior Approval', 'Trunk-Based Development with Feature Flags'],
        category: 'Engineering Process',
      },
      {
        question: 'Which language would you choose to build a high-concurrency WebSocket server today?',
        options: ['Go (Goroutines & Channels)', 'Rust (Tokio Async Runtime)', 'TypeScript / Node.js (ws / Bun)', 'Elixir (Erlang OTP / Phoenix Channels)'],
        category: 'Backend Systems',
      },
      {
        question: 'What is the biggest bottleneck in your daily engineering velocity?',
        options: ['Unclear or Shifting Product Requirements', 'Flaky Tests and Slow CI Pipelines', 'Context Switching & Excessive Meetings', 'Legacy Codebase Technical Debt'],
        category: 'Team Velocity',
      },
      {
        question: 'What is your team’s ideal balance between remote and in-person collaboration?',
        options: ['100% Fully Remote (Async First)', 'Hybrid (2-3 Anchor Days per Week)', 'Mainly Office with Occasional Remote Days', 'Quarterly Co-located Onsites + Remote'],
        category: 'Workplace Culture',
      },
    ];

    if (genAI) {
      try {
        const prompt = `You are a live audience polling expert. Generate a crisp, thought-provoking live poll question with 3 to 4 distinct choices on the topic: "${cleanTopic || 'Technology, Modern Engineering, and Teamwork'}".
Return strictly valid JSON with this format:
{
  "question": "A clear, engaging question under 120 chars",
  "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
  "category": "Short 1-2 word tag"
}`;

        const response = await genAI.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const text = response.text || '';
        const parsed = JSON.parse(text);
        if (parsed.question && Array.isArray(parsed.options) && parsed.options.length >= 2) {
          res.json({
            success: true,
            data: {
              question: parsed.question,
              options: parsed.options.slice(0, 5),
              category: parsed.category || 'AI Generated',
              generatedWithFallback: false,
            },
            error: null,
          });
          return;
        }
      } catch (err: any) {
        console.warn('[Gemini API] Generation error, utilizing alternate heuristic engine:', err.message);
      }
    }

    // Heuristic alternate generator fallback
    const filtered = cleanTopic
      ? fallbackPolls.filter(
          (p) =>
            p.question.toLowerCase().includes(cleanTopic.toLowerCase()) ||
            p.category.toLowerCase().includes(cleanTopic.toLowerCase())
        )
      : [];
    const selected = filtered.length > 0
      ? filtered[Math.floor(Math.random() * filtered.length)]
      : fallbackPolls[Math.floor(Math.random() * fallbackPolls.length)];

    res.json({
      success: true,
      data: {
        ...selected,
        generatedWithFallback: true,
      },
      error: null,
    });
  });

  // REST API: AI ANALYZE RESULTS (Live Key Insights & Discussion Prompts)
  app.post('/api/ai/analyze-results', async (req: Request, res: Response) => {
    const { pollId } = req.body || {};
    const poll = findPoll(pollId);
    if (!poll) {
      res.status(404).json({ success: false, data: null, error: 'Poll not found' });
      return;
    }

    const totalVotes = poll.totalVotes;
    const optionStats = poll.options
      .map((opt) => {
        const votes = poll.counts[opt.id] || 0;
        const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
        return { id: opt.id, text: opt.text, votes, percentage: pct };
      })
      .sort((a, b) => b.votes - a.votes);

    const leader = optionStats[0];
    const runnerUp = optionStats[1];

    if (genAI && totalVotes > 0) {
      try {
        const statsSummary = optionStats.map((o) => `"${o.text}": ${o.votes} votes (${o.percentage}%)`).join(', ');
        const prompt = `Analyze these live audience poll results:
Poll Question: "${poll.question}"
Total Votes: ${totalVotes}
Options & Results: ${statsSummary}

Generate a concise executive summary and engagement prompts. Return strictly valid JSON:
{
  "summary": "1-2 sentence high-level takeaway of the vote outcome",
  "dominantChoice": "Highlight the leading choice and key driver behind its popularity",
  "marginAnalysis": "Analysis of the lead or close race between top choices",
  "discussionPrompts": ["Discussion question 1", "Discussion question 2"]
}`;

        const response = await genAI.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const parsed = JSON.parse(response.text || '{}');
        if (parsed.summary && Array.isArray(parsed.discussionPrompts)) {
          res.json({
            success: true,
            data: {
              ...parsed,
              generatedWithFallback: false,
            },
            error: null,
          });
          return;
        }
      } catch (err: any) {
        console.warn('[Gemini API] Analysis error, using alternate synthesis engine:', err.message);
      }
    }

    // Heuristic analytical synthesis fallback
    let marginText = 'Votes are distributed evenly across options.';
    if (totalVotes === 0) {
      marginText = 'Awaiting initial audience votes.';
    } else if (runnerUp && leader.votes > runnerUp.votes) {
      marginText = `"${leader.text}" leads by a ${leader.percentage - runnerUp.percentage}% margin over "${runnerUp.text}".`;
    } else if (runnerUp && leader.votes === runnerUp.votes) {
      marginText = `Dead heat tie between "${leader.text}" and "${runnerUp.text}" with ${leader.votes} votes each.`;
    }

    res.json({
      success: true,
      data: {
        summary:
          totalVotes === 0
            ? 'This poll is currently open and waiting for participants to cast their first vote.'
            : `With ${totalVotes} total responses recorded, "${leader.text}" emerged as the leading preference with ${leader.percentage}% of the vote.`,
        dominantChoice:
          totalVotes === 0
            ? 'No votes cast yet.'
            : `Audience strongly favored "${leader.text}" (${leader.votes} votes), indicating widespread practical adoption.`,
        marginAnalysis: marginText,
        discussionPrompts: [
          `What trade-offs or production requirements make "${leader?.text || 'the top choice'}" stand out?`,
          runnerUp
            ? `Under what specific operational constraints would your team adopt "${runnerUp.text}" instead?`
            : 'How do you anticipate these preferences evolving over the next 12-24 months?',
        ],
        generatedWithFallback: true,
      },
      error: null,
    });
  });

  // Vite middleware for development & Static file serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[PulsePoll] Full-Stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
