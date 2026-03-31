import { useEffect, useRef, useState } from 'react';

const TOKEN_KEY = 'exam_backend_token';

/**
 * Hook that connects to the backend SSE endpoint for real-time notification count.
 * Falls back gracefully if SSE is unavailable.
 */
export function useNotificationSSE(userId: string | undefined) {
  const [unreadCount, setUnreadCount] = useState(0);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!userId) return;

    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) return;

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';
    const url = `${API_URL}/api/sse/notifications?token=${encodeURIComponent(token)}`;

    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (typeof payload.unreadCount === 'number') {
          setUnreadCount(payload.unreadCount);
        }
      } catch {
        // ignore malformed events
      }
    };

    es.onerror = () => {
      // SSE connection failed — silently close, fallback polling in Header still runs
      es.close();
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [userId]);

  return unreadCount;
}
