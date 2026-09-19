import { useState, useEffect, useRef, useCallback } from 'react';
import { RealtimeEvent, ConnectionStatus } from '../types';

interface UsePollSocketOptions {
  onEvent?: (event: RealtimeEvent) => void;
  enabled?: boolean;
}

export function usePollSocket(pollId: string | undefined, options: UsePollSocketOptions = {}) {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const [eventHistory, setEventHistory] = useState<RealtimeEvent[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const isMountedRef = useRef(true);
  const reconnectAttemptsRef = useRef(0);

  const { onEvent, enabled = true } = options;
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const connect = useCallback(() => {
    if (!pollId || !enabled) return;

    // Clean up previous socket if existing
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setStatus('connecting');

    // Build WebSocket URL from current host
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/ws/polls/${pollId}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMountedRef.current) return;
        setStatus('connected');
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        if (!isMountedRef.current) return;
        try {
          const parsed: RealtimeEvent = JSON.parse(event.data);
          setLastEvent(parsed);
          setEventHistory((prev) => [parsed, ...prev].slice(0, 20));
          if (onEventRef.current) {
            onEventRef.current(parsed);
          }
        } catch (err) {
          console.error('[WS] Failed to parse message', err);
        }
      };

      ws.onerror = (err) => {
        console.warn('[WS] Error encountered', err);
      };

      ws.onclose = (e) => {
        if (!isMountedRef.current) return;
        setStatus('disconnected');
        wsRef.current = null;

        // Attempt reconnection with exponential backoff if not closed cleanly intentionally
        if (e.code !== 1000 && e.code !== 1001) {
          const timeout = Math.min(1000 * Math.pow(1.5, reconnectAttemptsRef.current), 10000);
          reconnectAttemptsRef.current += 1;
          setStatus('connecting');
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              connect();
            }
          }, timeout);
        }
      };
    } catch (err) {
      console.error('[WS] Connection exception', err);
      setStatus('disconnected');
    }
  }, [pollId, enabled]);

  useEffect(() => {
    isMountedRef.current = true;
    connect();

    return () => {
      isMountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounted');
        wsRef.current = null;
      }
    };
  }, [connect]);

  // Ping keepalive every 25 seconds
  useEffect(() => {
    if (status !== 'connected') return;

    const interval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25000);

    return () => clearInterval(interval);
  }, [status]);

  return {
    status,
    lastEvent,
    eventHistory,
    reconnect: connect,
  };
}
