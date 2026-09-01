import { useEffect, useRef, useState } from "react";
import { createWebSocket } from "../services/websocket";

export function useChatConnection(token, { onMessage, onOpen } = {}) {
  const socketRef = useRef(null);
  const callbackRef = useRef({ onMessage, onOpen });
  const generationRef = useRef(0);
  const activeRef = useRef(Boolean(token));
  const [connected, setConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(token ? "connecting" : "disconnected");
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [reconnectSeconds, setReconnectSeconds] = useState(0);

  useEffect(() => {
    callbackRef.current = { onMessage, onOpen };
  }, [onMessage, onOpen]);

  useEffect(() => {
    activeRef.current = Boolean(token);
  }, [token]);

  useEffect(() => {
    if (!token) {
      socketRef.current?.close();
      socketRef.current = null;
      setConnected(false);
      setConnectionStatus("disconnected");
      setReconnectAttempt(0);
      setReconnectSeconds(0);
      return undefined;
    }

    const generation = ++generationRef.current;
    let disposed = false;
    socketRef.current?.close();
    setConnected(false);
    setConnectionStatus("connecting");
    setReconnectAttempt(0);
    setReconnectSeconds(0);

    const socket = createWebSocket(token, {
      onOpen() {
        if (disposed || generation !== generationRef.current) return;
        setConnected(true);
        setConnectionStatus("connected");
        setReconnectAttempt(0);
        setReconnectSeconds(0);
        callbackRef.current.onOpen?.();
      },
      onMessage(data) {
        if (disposed || generation !== generationRef.current) return;
        callbackRef.current.onMessage?.(data);
      },
      onClose() {
        if (disposed || generation !== generationRef.current) return;
        setConnected(false);
        setConnectionStatus(activeRef.current ? "reconnecting" : "disconnected");
        if (activeRef.current) setReconnectSeconds(10);
      },
      onReconnecting(_delay, attempt) {
        if (disposed || generation !== generationRef.current || !activeRef.current) return;
        setConnected(false);
        setConnectionStatus("reconnecting");
        setReconnectAttempt(attempt);
        setReconnectSeconds(10);
      },
      onError: (error) => console.error("Erro no WebSocket:", error),
    });

    socketRef.current = socket;

    return () => {
      disposed = true;
      ++generationRef.current;
      socket.close();
    };
  }, [token]);

  useEffect(() => {
    if (connectionStatus !== "reconnecting") return undefined;
    const id = window.setInterval(() => {
      setReconnectSeconds((value) => (value > 1 ? value - 1 : 10));
    }, 1000);
    return () => window.clearInterval(id);
  }, [connectionStatus]);

  return {
    socketRef,
    connected,
    connectionStatus,
    reconnectAttempt,
    reconnectSeconds,
  };
}
