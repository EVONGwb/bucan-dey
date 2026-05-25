import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useAuth } from "./AuthContext.jsx";

const RealtimeContext = createContext(null);

function buildWebSocketUrl(token) {
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
  const url = new URL(apiUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = `${url.pathname.replace(/\/$/, "")}/ws`;
  url.search = `token=${encodeURIComponent(token)}`;
  return url.toString();
}

export function RealtimeProvider({ children }) {
  const { token, isAuthenticated } = useAuth();
  const socketRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const reconnectAttemptRef = useRef(0);
  const handlersRef = useRef(new Map());
  const intentionalCloseRef = useRef(false);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState(() => new Set());
  const [unreadCount, setUnreadCount] = useState(0);

  const emitLocal = useCallback((event) => {
    const handlers = handlersRef.current.get(event.type);
    if (!handlers) return;

    handlers.forEach((handler) => handler(event.payload));
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (intentionalCloseRef.current || !token) return;

    const delay = Math.min(10000, 1000 * 2 ** reconnectAttemptRef.current);
    reconnectAttemptRef.current += 1;
    reconnectTimerRef.current = window.setTimeout(() => {
      connect();
    }, delay);
  }, [token]);

  const connect = useCallback(() => {
    if (!token) return;

    intentionalCloseRef.current = false;
    socketRef.current?.close();

    const socket = new WebSocket(buildWebSocketUrl(token));
    socketRef.current = socket;

    socket.onopen = () => {
      reconnectAttemptRef.current = 0;
      setIsConnected(true);
    };

    socket.onmessage = (event) => {
      let message;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }

      if (message.type === "connection_ready") {
        setOnlineUserIds(new Set(message.payload?.online_user_ids || []));
      }

      if (message.type === "user_online") {
        setOnlineUserIds((current) => {
          const next = new Set(current);
          next.add(message.payload.user_id);
          return next;
        });
      }

      if (message.type === "user_offline") {
        setOnlineUserIds((current) => {
          const next = new Set(current);
          next.delete(message.payload.user_id);
          return next;
        });
      }

      if (message.type === "unread_count_update") {
        setUnreadCount(message.payload?.unread_count || 0);
      }

      emitLocal(message);
    };

    socket.onclose = () => {
      setIsConnected(false);
      socketRef.current = null;
      scheduleReconnect();
    };

    socket.onerror = () => {
      socket.close();
    };
  }, [emitLocal, scheduleReconnect, token]);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      intentionalCloseRef.current = true;
      window.clearTimeout(reconnectTimerRef.current);
      socketRef.current?.close();
      socketRef.current = null;
      setIsConnected(false);
      setUnreadCount(0);
      setOnlineUserIds(new Set());
      return undefined;
    }

    connect();

    return () => {
      intentionalCloseRef.current = true;
      window.clearTimeout(reconnectTimerRef.current);
      socketRef.current?.close();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [connect, isAuthenticated, token]);

  const subscribe = useCallback((eventType, handler) => {
    const handlers = handlersRef.current.get(eventType) || new Set();
    handlers.add(handler);
    handlersRef.current.set(eventType, handlers);

    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        handlersRef.current.delete(eventType);
      }
    };
  }, []);

  const sendEvent = useCallback((type, payload = {}) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;

    socket.send(JSON.stringify({ type, payload }));
    return true;
  }, []);

  const value = useMemo(
    () => ({
      isConnected,
      onlineUserIds,
      unreadCount,
      setUnreadCount,
      sendEvent,
      subscribe,
    }),
    [isConnected, onlineUserIds, unreadCount, sendEvent, subscribe]
  );

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);

  if (!context) {
    throw new Error("useRealtime must be used inside RealtimeProvider.");
  }

  return context;
}
