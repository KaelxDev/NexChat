import { useEffect, useRef, useState } from "react";
import { createWebSocket } from "../services/websocket";
import { getDirectMessageHistory } from "../services/directMessages";

const HISTORY_LIMIT = 50;
const CACHE_LIMIT = 100;

function conversationKey(currentUserId, targetUserId) {
  return `poknex:dm:${Math.min(Number(currentUserId), Number(targetUserId))}:${Math.max(Number(currentUserId), Number(targetUserId))}`;
}

function readCache(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeCache(key, messages) {
  try {
    localStorage.setItem(key, JSON.stringify(messages.slice(-CACHE_LIMIT)));
  } catch (error) {
    console.error("Não foi possível salvar a conversa privada no cache:", error);
  }
}

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function PrivateDMFeature() {
  const [target, setTarget] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const socketRef = useRef(null);
  const messagesRef = useRef(null);
  const targetRef = useRef(null);
  const currentUserRef = useRef(null);

  useEffect(() => {
    targetRef.current = target;
  }, [target]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    let active = true;

    async function loadCurrentUser() {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || "https://nexchat-backend-2cyf.onrender.com/api/auth"}/me`,
          { credentials: "include" },
        );
        const data = await response.json().catch(() => null);
        if (active && response.ok && data?.user) {
          setCurrentUser(data.user);
        }
      } catch (requestError) {
        console.error("Não foi possível identificar o usuário atual:", requestError);
      }
    }

    void loadCurrentUser();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function openFromSidebar(event) {
      const trigger = event.target.closest?.("[data-dm-user-id]");
      if (!trigger) return;
      if (trigger.dataset.dmSelf === "true") return;

      event.preventDefault();
      event.stopPropagation();
      setError("");
      setTarget({
        id: Number(trigger.dataset.dmUserId),
        username: trigger.dataset.dmUsername || "usuario",
        displayName: trigger.dataset.dmDisplayName || trigger.dataset.dmUsername || "Usuário",
        avatar: trigger.dataset.dmAvatar || "",
        online: trigger.dataset.dmOnline === "true",
      });
    }

    function closeWithEscape(event) {
      if (event.key === "Escape") setTarget(null);
    }

    document.addEventListener("click", openFromSidebar, true);
    window.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("click", openFromSidebar, true);
      window.removeEventListener("keydown", closeWithEscape);
    };
  }, []);

  useEffect(() => {
    if (!target || !currentUser?.id) {
      socketRef.current?.close();
      socketRef.current = null;
      setConnected(false);
      setMessages([]);
      setInput("");
      return undefined;
    }

    const key = conversationKey(currentUser.id, target.id);
    setMessages(readCache(key));
    setInput("");
    setError("");
    setLoading(true);

    getDirectMessageHistory(target.id, HISTORY_LIMIT)
      .then((data) => {
        const incoming = Array.isArray(data?.messages) ? data.messages : [];
        setMessages(incoming);
        writeCache(key, incoming);
      })
      .catch((requestError) => {
        console.error("Não foi possível carregar a conversa privada:", requestError);
        setError(requestError.message || "Não foi possível carregar esta conversa.");
      })
      .finally(() => setLoading(false));

    socketRef.current?.close();
    const socket = createWebSocket("", {
      onOpen() {
        setConnected(true);
      },
      onClose() {
        setConnected(false);
      },
      onReconnecting() {
        setConnected(false);
      },
      onMessage(data) {
        if (data?.type !== "direct_message") return;
        const liveTarget = targetRef.current;
        const liveUser = currentUserRef.current;
        if (!liveTarget || !liveUser) return;

        const participantMatch =
          (Number(data.senderId) === Number(liveUser.id) && Number(data.recipientId) === Number(liveTarget.id)) ||
          (Number(data.senderId) === Number(liveTarget.id) && Number(data.recipientId) === Number(liveUser.id));
        if (!participantMatch) return;

        setMessages((current) => {
          if (current.some((item) => item.messageId === data.messageId)) return current;
          const next = [...current, data];
          writeCache(conversationKey(liveUser.id, liveTarget.id), next);
          return next;
        });
      },
      onError: (socketError) => console.error("Erro na conversa privada:", socketError),
    });

    socketRef.current = socket;

    return () => {
      socket.close();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [target, currentUser?.id]);

  useEffect(() => {
    const container = messagesRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [messages]);

  function sendMessage(event) {
    event.preventDefault();
    const text = input.trim();
    if (!text || !target || !socketRef.current || !connected) return;

    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const sent = socketRef.current.sendDirectMessage(text, id, target.id);
    if (!sent) return;
    setInput("");
  }

  if (!target) return null;

  return (
    <section className="private-dm-overlay" aria-label={`Conversa privada com ${target.displayName}`}>
      <header className="private-dm-header">
        <div className="private-dm-person">
          <button className="private-dm-back" type="button" onClick={() => setTarget(null)} aria-label="Voltar ao chat público">←</button>
          <div className="private-dm-avatar">
            {target.avatar ? <img src={target.avatar} alt="" /> : target.displayName.slice(0, 1).toUpperCase()}
            <span className={target.online ? "online" : "offline"} />
          </div>
          <div>
            <strong>{target.displayName}</strong>
            <span>@{target.username}</span>
          </div>
        </div>
        <div className="private-dm-status">
          <span className={connected ? "connected" : "disconnected"} />
          {connected ? "Privado" : "Reconectando"}
        </div>
      </header>

      <div className="private-dm-messages" ref={messagesRef}>
        {loading && messages.length === 0 && (
          <div className="private-dm-loading">Carregando conversa...</div>
        )}

        {!loading && messages.length === 0 && (
          <div className="private-dm-empty">
            <div className="private-dm-lock">⌁</div>
            <span>MENSAGEM DIRETA</span>
            <h2>Conversa privada</h2>
            <p>Somente você e <strong>@{target.username}</strong> recebem estas mensagens.</p>
          </div>
        )}

        {messages.map((message) => {
          const mine = Number(message.senderId ?? message.userId) === Number(currentUser?.id);
          return (
            <article className={`private-dm-message ${mine ? "mine" : "other"}`} key={message.messageId}>
              <div className="private-dm-bubble">
                {message.deleted ? "Esta mensagem foi excluída" : message.message}
              </div>
              <time>{formatTime(message.timestamp)}</time>
            </article>
          );
        })}
      </div>

      {error && <div className="private-dm-error">{error}</div>}

      <form className="private-dm-composer" onSubmit={sendMessage}>
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              sendMessage(event);
            }
          }}
          placeholder={`Mensagem para @${target.username}`}
          rows={1}
          maxLength={1000}
          disabled={!connected}
        />
        <button type="submit" disabled={!connected || !input.trim()} aria-label="Enviar mensagem privada">↑</button>
      </form>
      <div className="private-dm-hint">Enter envia · Shift + Enter quebra a linha</div>
    </section>
  );
}
