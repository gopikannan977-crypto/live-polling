import React, { useState } from 'react';
import { X, Layers, Cpu, Database, Radio, Shield, CheckCircle2, Terminal, HelpCircle } from 'lucide-react';

interface ArchitectureDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureDocsModal: React.FC<ArchitectureDocsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'architecture' | 'redis' | 'interview'>('architecture');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                PulsePoll System Architecture &amp; Tech Specs
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Production Ready
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Go (Gin) • Redis (Pub/Sub &amp; Live Counters) • MongoDB • WebSockets • React (TypeScript)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800/80 bg-slate-950/30">
          <button
            onClick={() => setActiveTab('architecture')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'architecture'
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Realtime Pipeline</span>
          </button>
          <button
            onClick={() => setActiveTab('redis')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'redis'
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>Redis Role &amp; Concurrency</span>
          </button>
          <button
            onClick={() => setActiveTab('interview')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'interview'
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Interview Questions &amp; Answers</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-slate-300">
          {activeTab === 'architecture' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <h4 className="text-xs uppercase font-mono font-bold text-indigo-400 mb-3 tracking-wider flex items-center gap-2">
                  <Terminal className="w-4 h-4" /> Live Vote Flow Pipeline
                </h4>
                <div className="font-mono text-xs text-slate-300 space-y-2 leading-relaxed bg-slate-900/90 p-4 rounded-lg border border-slate-800/80">
                  <p className="text-emerald-400">1. Client casts vote via HTTP POST /api/polls/:id/votes</p>
                  <p className="text-slate-400 pl-4">↳ Backend validates: poll exists, status == 'active', option valid, duplicate token check.</p>
                  <p className="text-indigo-300">2. Persistence: Writes immutable Vote document into MongoDB collection</p>
                  <p className="text-amber-400">3. Redis Atomic Counter: Executes HINCRBY poll:{"{pollId}"}:results {"{optionId}"} 1</p>
                  <p className="text-cyan-400">4. Redis Pub/Sub: PUBLISH poll:{"{pollId}"}:events &#123; type: "vote_cast", counts, totalVotes &#125;</p>
                  <p className="text-violet-400">5. Go Background Subscriber intercepts event on channel</p>
                  <p className="text-emerald-300">6. WebSocket Hub broadcasts payload to all connected clients viewing poll</p>
                  <p className="text-indigo-200">7. React Hook (usePollSocket) receives message &amp; updates state in milliseconds</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold mb-2">
                    <Database className="w-4 h-4" />
                    <span>MongoDB (Durable Source of Truth)</span>
                  </div>
                  <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                    <li><strong className="text-slate-200">users</strong>: email (unique index), bcrypt password hash.</li>
                    <li><strong className="text-slate-200">polls</strong>: ownerId index, question, status, options.</li>
                    <li><strong className="text-slate-200">votes</strong>: pollId index, compound (pollId + voterId).</li>
                    <li>Guarantees ACID durability and audit history.</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold mb-2">
                    <Radio className="w-4 h-4" />
                    <span>Redis (Real-time Accelerator)</span>
                  </div>
                  <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                    <li><strong className="text-slate-200">Live Counters</strong>: in-memory Redis Hashes avoid heavy DB queries.</li>
                    <li><strong className="text-slate-200">Pub/Sub Channels</strong>: decouple web workers across multiple nodes.</li>
                    <li><strong className="text-slate-200">Rate Limiting</strong>: temporary key tracking to stop ballot stuffing.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'redis' && (
            <div className="space-y-4">
              <h4 className="text-base font-bold text-white">How Redis Solves Concurrency &amp; Race Conditions</h4>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                If 500 audience members click an option simultaneously in a live presentation, traditional <code className="bg-slate-800 px-1 py-0.5 rounded text-amber-300">GET count → increment in Go → SET count</code> patterns cause severe race conditions resulting in lost votes.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/40">
                  <h5 className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-2">❌ Naive Read-Modify-Write</h5>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    User A reads count (10). User B reads count (10). User A writes 11. User B writes 11. <strong>One vote is lost forever!</strong>
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/40">
                  <h5 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">✅ Redis Atomic HINCRBY</h5>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Redis executes single-threaded commands sequentially. <code className="text-emerald-300">HINCRBY poll:id:results option 1</code> increments in one atomic CPU operation.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 mt-4">
                <h5 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Shield className="w-4 h-4" /> Failover &amp; Recovery Strategy
                </h5>
                <p className="text-xs text-slate-400 leading-relaxed">
                  If Redis restarts or is temporarily unavailable, the Go backend falls back to calculating counts directly from MongoDB <code className="text-slate-300">votes.aggregate([&#123;$match: &#123;pollId&#125;&#125;, &#123;$group: &#123;_id: "$optionId", count: &#123;$sum: 1&#125;&#125;&#125;])</code> and restores the Redis hash cache automatically.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'interview' && (
            <div className="space-y-4">
              <h4 className="text-base font-bold text-white">Essential Technical Interview Prep</h4>

              <div className="space-y-3">
                <details className="group p-3.5 rounded-xl bg-slate-950 border border-slate-800 open:border-indigo-500/50 transition-colors">
                  <summary className="font-semibold text-xs sm:text-sm text-slate-200 cursor-pointer list-none flex items-center justify-between">
                    <span>1. Why use Redis Pub/Sub instead of having Go broadcast directly to local WebSockets?</span>
                    <span className="text-indigo-400 text-xs group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <p className="mt-2.5 text-xs text-slate-400 leading-relaxed">
                    In a production cluster with multiple instances behind a load balancer, Browser A and Browser B might be connected to separate Go server instances. Direct memory broadcasting would only reach clients connected to the same instance. With Redis Pub/Sub, instance 1 publishes to Redis, and all Go instances subscribed to that channel broadcast to their local WebSocket clients!
                  </p>
                </details>

                <details className="group p-3.5 rounded-xl bg-slate-950 border border-slate-800 open:border-indigo-500/50 transition-colors">
                  <summary className="font-semibold text-xs sm:text-sm text-slate-200 cursor-pointer list-none flex items-center justify-between">
                    <span>2. Why shouldn't Redis be the primary database?</span>
                    <span className="text-indigo-400 text-xs group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <p className="mt-2.5 text-xs text-slate-400 leading-relaxed">
                    Redis is an in-memory datastore optimized for speed. While it supports snapshotting (RDB) and append-only files (AOF), storing complex relational or document structures, historical audit logs, and user credentials in Redis can cause memory exhaustion and lacks rich indexing capabilities compared to MongoDB.
                  </p>
                </details>

                <details className="group p-3.5 rounded-xl bg-slate-950 border border-slate-800 open:border-indigo-500/50 transition-colors">
                  <summary className="font-semibold text-xs sm:text-sm text-slate-200 cursor-pointer list-none flex items-center justify-between">
                    <span>3. How does duplicate voting prevention work for anonymous audience?</span>
                    <span className="text-indigo-400 text-xs group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <p className="mt-2.5 text-xs text-slate-400 leading-relaxed">
                    We use a multi-tiered approach: 1) Client-side tracking in localStorage blocks repeat UI submissions; 2) Anonymous cryptographic voter identifier token sent with vote; 3) Backend checks compound uniqueness in MongoDB votes collection; 4) Optional IP/token rate-limiting key in Redis.
                  </p>
                </details>

                <details className="group p-3.5 rounded-xl bg-slate-950 border border-slate-800 open:border-indigo-500/50 transition-colors">
                  <summary className="font-semibold text-xs sm:text-sm text-slate-200 cursor-pointer list-none flex items-center justify-between">
                    <span>4. How are closed polls protected from late votes?</span>
                    <span className="text-indigo-400 text-xs group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <p className="mt-2.5 text-xs text-slate-400 leading-relaxed">
                    Poll status check happens strictly on the backend inside the atomic transaction/service layer before accepting any vote. Even if an attacker uses curl or postman to POST a vote, the backend returns <code className="text-rose-400 font-mono">400 Bad Request: voting is closed for this poll</code>.
                  </p>
                </details>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between text-xs text-slate-400">
          <span>PulsePoll Architecture Spec v1.0</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            Close Spec
          </button>
        </div>
      </div>
    </div>
  );
};
