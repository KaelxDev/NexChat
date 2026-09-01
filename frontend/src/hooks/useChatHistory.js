import { useEffect, useRef, useState } from "react";
import { getMessageHistory } from "../services/auth";
import {
  HISTORY_PAGE_SIZE,
  LOCAL_CACHE_LIMIT,
  QUEUE_KEY,
  STORAGE_KEY,
  loadJson,
  mergeServerHistory,
} from "../utils/chat";

export function useChatHistory(userId) {
  const [messages, setMessages] = useState(() => loadJson(STORAGE_KEY));
  const [offlineQueue, setOfflineQueue] = useState(() => loadJson(QUEUE_KEY));
  const [historyBefore, setHistoryBefore] = useState(null);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const messagesRef = useRef(null);
  const historyLoadingRef = useRef(false);
  const cacheWriteTimerRef = useRef(null);
  const initialHistoryLoadedRef = useRef(false);

  useEffect(() => {
    clearTimeout(cacheWriteTimerRef.current);
    cacheWriteTimerRef.current = window.setTimeout(() => {
      try {
        const cacheable = messages.filter((item) => item?.type === "message").slice(-LOCAL_CACHE_LIMIT);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cacheable));
      } catch (error) {
        console.error("Não foi possível atualizar o cache local:", error);
      }
    }, 200);

    return () => window.clearTimeout(cacheWriteTimerRef.current);
  }, [messages]);

  useEffect(() => {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(offlineQueue));
    } catch (error) {
      console.error("Não foi possível atualizar a fila offline:", error);
    }
  }, [offlineQueue]);

  async function loadMessageHistory(before = null, preserveScroll = false) {
    if (historyLoadingRef.current) return;
    if (before && !hasMoreHistory) return;

    historyLoadingRef.current = true;
    setHistoryLoading(true);

    const container = messagesRef.current;
    const previousScrollHeight = container?.scrollHeight || 0;
    const previousScrollTop = container?.scrollTop || 0;

    try {
      const data = await getMessageHistory(HISTORY_PAGE_SIZE, before);
      const incoming = Array.isArray(data?.messages) ? data.messages : [];
      setMessages((current) => mergeServerHistory(current, incoming));
      setHistoryBefore(data?.nextBefore || null);
      setHasMoreHistory(Boolean(data?.hasMore && data?.nextBefore));

      requestAnimationFrame(() => {
        if (!container || !preserveScroll) return;
        container.scrollTop = container.scrollHeight - previousScrollHeight + previousScrollTop;
      });
    } catch (error) {
      console.error("Não foi possível carregar o histórico:", error);
    } finally {
      historyLoadingRef.current = false;
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    if (!userId || initialHistoryLoadedRef.current) return;
    initialHistoryLoadedRef.current = true;
    void loadMessageHistory();
  }, [userId]);

  function handleMessagesScroll(event) {
    if (event.currentTarget.scrollTop > 80) return;
    if (!hasMoreHistory || historyLoadingRef.current || !historyBefore) return;
    void loadMessageHistory(historyBefore, true);
  }

  function clearLocalHistory() {
    setMessages([]);
    setHistoryBefore(null);
    setHasMoreHistory(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("Não foi possível limpar o cache local:", error);
    }
  }

  return {
    messages,
    setMessages,
    offlineQueue,
    setOfflineQueue,
    historyLoading,
    messagesRef,
    handleMessagesScroll,
    clearLocalHistory,
  };
}
