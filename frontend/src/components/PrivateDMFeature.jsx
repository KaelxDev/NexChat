import { useEffect, useRef, useState } from "react";
import { createWebSocket } from "../services/websocket";
import { getDirectMessageHistory } from "../services/directMessages";
import MessageContextMenu from "./MessageContextMenu";
import EmojiPicker from "./EmojiPickerExtra";
import { normalizeAvatarUrl, userInitial, copyText } from "../utils/chat";

const HISTORY_LIMIT = 50;
const CACHE_LIMIT = 100;
const REACTIONS = ["❤️", "😂", "😮", "😢", "😡", "👍"];

function conversationKey(a, b) {
  return `poknex:dm:${Math.min(Number(a), Number(b))}:${Math.max(Number(a), Number(b))}`;
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
  } catch {}
}

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function sameMessage(a, b) {
  return String(a?.messageId || "") === String(b?.messageId || "");
}

export default function PrivateDMFeature() {
  const [target, setTarget] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const [contextMenu, setContextMenu] = useState(null);
  const [reactionPickerId, setReactionPickerId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState(null);
  const socketRef = useRef(null);
  const messagesRef = useRef(null);
  const targetRef = useRef(null);
  const currentUserRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { targetRef.current = target; }, [target]);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  useEffect(() => {
    let active = true;
    fetch(`${import.meta.env.VITE_API_URL || "https://nexchat-backend-2cyf.onrender.com/api/auth"}/me`, { credentials: "include" })
      .then((response) => response.json().catch(() => null).then((data) => ({ response, data })))
      .then(({ response, data }) => { if (active && response.ok && data?.user) setCurrentUser(data.user); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    function openFromSidebar(event) {
      const trigger = event.target.closest?.("[data-dm-user-id]");
      if (!trigger || trigger.dataset.dmSelf === "true") return;
      event.preventDefault();
      event.stopPropagation();
      setError("");
      setContextMenu(null);
      setReactionPickerId(null);
      setTarget({
        id: Number(trigger.dataset.dmUserId),
        username: trigger.dataset.dmUsername || "usuario",
        displayName: trigger.dataset.dmDisplayName || trigger.dataset.dmUsername || "Usuário",
        avatar: trigger.dataset.dmAvatar || "",
        online: trigger.dataset.dmOnline === "true",
      });
    }
    document.addEventListener("click", openFromSidebar, true);
    return () => document.removeEventListener("click", openFromSidebar, true);
  }, []);

  useEffect(() => {
    function close(event) {
      if (event.key === "Escape") {
        setTarget(null);
        setContextMenu(null);
        setReactionPickerId(null);
        setEditingId(null);
        setReplyingTo(null);
        setEmojiOpen(false);
      }
    }
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  useEffect(() => {
    if (!target || !currentUser?.id) {
      socketRef.current?.close();
      socketRef.current = null;
      setConnected(false);
      setMessages([]);
      return undefined;
    }

    const key = conversationKey(currentUser.id, target.id);
    setMessages(readCache(key));
    setInput("");
    setError("");
    setContextMenu(null);
    setReactionPickerId(null);
    setReplyingTo(null);
    setEditingId(null);
    setEmojiOpen(false);
    setLoading(true);

    getDirectMessageHistory(target.id, HISTORY_LIMIT)
      .then((data) => {
        const incoming = Array.isArray(data?.messages) ? data.messages : [];
        setMessages(incoming);
        writeCache(key, incoming);
      })
      .catch((requestError) => setError(requestError.message || "Não foi possível carregar esta conversa."))
      .finally(() => setLoading(false));

    socketRef.current?.close();
    const socket = createWebSocket("", {
      onOpen: () => setConnected(true),
      onClose: () => setConnected(false),
      onReconnecting: () => setConnected(false),
      onMessage(data) {
        const liveTarget = targetRef.current;
        const liveUser = currentUserRef.current;
        if (!liveTarget || !liveUser) return;

        if (data?.type === "direct_message") {
          const participantMatch =
            (Number(data.senderId) === Number(liveUser.id) && Number(data.recipientId) === Number(liveTarget.id)) ||
            (Number(data.senderId) === Number(liveTarget.id) && Number(data.recipientId) === Number(liveUser.id));
          if (!participantMatch) return;
          setMessages((current) => {
            if (current.some((item) => sameMessage(item, data))) return current;
            const next = [...current, data];
            writeCache(conversationKey(liveUser.id, liveTarget.id), next);
            return next;
          });
          return;
        }

        if (data?.type === "direct_message_edited" || data?.type === "direct_message_deleted") {
          setMessages((current) => {
            const next = current.map((item) => item.messageId === data.messageId ? { ...item, ...data, deleted: data.type === "direct_message_deleted" || data.deleted, message: data.deleted ? "Esta mensagem foi excluída" : data.message } : item);
            writeCache(conversationKey(liveUser.id, liveTarget.id), next);
            return next;
          });
          setEditingId(null);
          return;
        }

        if (data?.type === "direct_message_reaction") {
          setMessages((current) => {
            const next = current.map((item) => item.messageId === data.messageId ? { ...item, reactions: data.reactions || {} } : item);
            writeCache(conversationKey(liveUser.id, liveTarget.id), next);
            return next;
          });
        }
      },
      onError: (socketError) => console.debug("DM:", socketError),
    });
    socketRef.current = socket;
    return () => {
      socket.close();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [target, currentUser?.id]);

  useEffect(() => {
    const container = messagesRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages]);

  function updateLocal(mutator) {
    setMessages((current) => {
      const next = mutator(current);
      if (currentUser?.id && target?.id) writeCache(conversationKey(currentUser.id, target.id), next);
      return next;
    });
  }

  function insertEmoji(emoji) {
    const textarea = inputRef.current;
    if (!textarea) { setInput((value) => `${value}${emoji}`); return; }
    const start = textarea.selectionStart ?? input.length;
    const end = textarea.selectionEnd ?? input.length;
    const next = `${input.slice(0, start)}${emoji}${input.slice(end)}`;
    setInput(next);
    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + emoji.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  }

  function sendMessage(event) {
    event?.preventDefault();
    const text = input.trim();
    if (!text || !target || !connected || !socketRef.current) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    if (!socketRef.current.sendDirectMessage(text, id, target.id, replyingTo?.messageId || null)) return;
    setInput("");
    setReplyingTo(null);
    setEmojiOpen(false);
  }

  function openContextMenu(event, message) {
    event.preventDefault();
    event.stopPropagation();
    const isMine = Number(message.senderId ?? message.userId) === Number(currentUser?.id);
    setReactionPickerId(null);
    setContextMenu({ x: Math.max(8, Math.min(event.clientX, window.innerWidth - 190)), y: Math.max(8, Math.min(event.clientY, window.innerHeight - 230)), message, isMine });
  }

  function startLongPress(event, message) {
    if (event.touches?.length !== 1) return;
    clearTimeout(longPressTimer);
    const timer = window.setTimeout(() => {
      const touch = event.touches[0];
      openContextMenu({ preventDefault(){}, stopPropagation(){}, clientX: touch.clientX, clientY: touch.clientY }, message);
      navigator.vibrate?.(20);
    }, 550);
    setLongPressTimer(timer);
  }

  function endLongPress() { clearTimeout(longPressTimer); }

  function beginEdit(message) {
    setContextMenu(null);
    setEditingId(message.messageId);
    setEditingText(message.message || "");
    setReplyingTo(null);
    setReactionPickerId(null);
    requestAnimationFrame(() => document.querySelector(".private-dm-edit-input")?.focus());
  }

  function saveEdit(event) {
    event?.preventDefault();
    const text = editingText.trim();
    if (!text || !editingId || !socketRef.current || !connected) return;
    if (!socketRef.current.sendDirectEditMessage(editingId, text)) return;
    updateLocal((current) => current.map((item) => item.messageId === editingId ? { ...item, message: text, edited: true, editedAt: new Date().toISOString() } : item));
    setEditingId(null);
    setEditingText("");
  }

  function deleteMessage(message) {
    setContextMenu(null);
    if (!message?.messageId || !socketRef.current || !connected) return;
    if (!window.confirm("Excluir esta mensagem privada?")) return;
    if (!socketRef.current.sendDirectDeleteMessage(message.messageId)) return;
    updateLocal((current) => current.map((item) => item.messageId === message.messageId ? { ...item, deleted: true, message: "Esta mensagem foi excluída" } : item));
  }

  function react(messageId, reaction) {
    if (!socketRef.current || !connected) return;
    socketRef.current.sendDirectReaction(messageId, reaction);
    setReactionPickerId(null);
    setContextMenu(null);
  }

  async function copyMessage(message) {
    if (message.deleted) return;
    try { await copyText(message.message); } catch {}
    setContextMenu(null);
  }

  if (!target) return null;

  return (
    <section className="private-dm-overlay" aria-label={`Conversa privada com ${target.displayName}`}>
      <header className="private-dm-header">
        <div className="private-dm-person">
          <button className="private-dm-back" type="button" onClick={() => setTarget(null)} aria-label="Voltar">←</button>
          <div className="private-dm-avatar">
            {normalizeAvatarUrl(target.avatar, target.id) ? <img src={normalizeAvatarUrl(target.avatar, target.id)} alt="" /> : userInitial(target)}
            <span className={target.online ? "online" : "offline"} />
          </div>
          <div><strong>{target.displayName}</strong><span>@{target.username}</span></div>
        </div>
        <div className="private-dm-status"><span className={connected ? "connected" : "disconnected"} />{connected ? "Privado" : "Reconectando"}</div>
      </header>

      <div className="private-dm-messages" ref={messagesRef}>
        {loading && messages.length === 0 && <div className="private-dm-loading">Carregando conversa...</div>}
        {!loading && messages.length === 0 && <div className="private-dm-empty"><div className="private-dm-lock">⌁</div><span>MENSAGEM DIRETA</span><h2>Conversa privada</h2><p>Somente você e <strong>@{target.username}</strong> recebem estas mensagens.</p></div>}

        {messages.map((message) => {
          const mine = Number(message.senderId ?? message.userId) === Number(currentUser?.id);
          const avatar = normalizeAvatarUrl(message.avatar, message.senderId);
          const reactions = message.reactions || {};
          return (
            <article
              className={`private-dm-message ${mine ? "mine" : "other"}`}
              key={message.messageId}
              onContextMenu={(event) => openContextMenu(event, message)}
              onTouchStart={(event) => startLongPress(event, message)}
              onTouchEnd={endLongPress}
              onTouchMove={endLongPress}
            >
              <div className="private-dm-message-row">
                {!mine && <div className="private-dm-message-avatar">{avatar ? <img src={avatar} alt="" /> : userInitial(message)}</div>}
                <div className="private-dm-message-content">
                  <div className="private-dm-meta"><strong>{message.displayName || message.username}</strong><time>{formatTime(message.timestamp)}{message.edited ? " · editada" : ""}</time></div>
                  {message.replyTo && <button className="private-dm-reply-preview" type="button" onClick={() => document.getElementById(`dm-${message.replyTo.messageId}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}><span>↩ {message.replyTo.displayName}</span><small>{message.replyTo.message}</small></button>}
                  {editingId === message.messageId ? (
                    <form className="private-dm-edit-form" onSubmit={saveEdit}>
                      <textarea className="private-dm-edit-input" value={editingText} onChange={(event) => setEditingText(event.target.value)} rows={2} maxLength={1000} />
                      <div><button type="button" onClick={() => setEditingId(null)}>Cancelar</button><button type="submit" disabled={!editingText.trim()}>Salvar</button></div>
                    </form>
                  ) : (
                    <div className={`private-dm-bubble${message.deleted ? " deleted" : ""}`} id={`dm-${message.messageId}`}>
                      {message.deleted ? "Esta mensagem foi excluída" : message.message}
                      {Object.entries(reactions).length > 0 && <span className="private-dm-reactions">{Object.entries(reactions).map(([emoji, count]) => <button type="button" key={emoji} onClick={() => react(message.messageId, emoji)}>{emoji} <b>{count}</b></button>)}</span>}
                    </div>
                  )}
                  {!message.deleted && <button className="private-dm-react-hint" type="button" onClick={() => setReactionPickerId((id) => id === message.messageId ? null : message.messageId)}>＋ Reagir</button>}
                  {reactionPickerId === message.messageId && <div className="private-dm-reaction-picker">{REACTIONS.map((reaction) => <button key={reaction} type="button" onClick={() => react(message.messageId, reaction)}>{reaction}</button>)}</div>}
                </div>
                {mine && <div className="private-dm-message-avatar">{avatar ? <img src={avatar} alt="" /> : userInitial(message)}</div>}
              </div>
            </article>
          );
        })}
      </div>

      {contextMenu && <MessageContextMenu contextMenu={contextMenu} onReact={() => { setReactionPickerId(contextMenu.message.messageId); setContextMenu(null); }} onReply={() => { setReplyingTo(contextMenu.message); setContextMenu(null); setReactionPickerId(null); inputRef.current?.focus(); }} onCopy={() => copyMessage(contextMenu.message)} onEdit={() => contextMenu.isMine && beginEdit(contextMenu.message)} onDelete={() => contextMenu.isMine && deleteMessage(contextMenu.message)} />}

      {error && <div className="private-dm-error">{error}</div>}

      <div className="private-dm-composer-zone">
        {replyingTo && <div className="private-dm-reply-composer"><div><span>Respondendo a {replyingTo.displayName}</span><strong>{replyingTo.deleted ? "Esta mensagem foi excluída" : replyingTo.message}</strong></div><button type="button" onClick={() => setReplyingTo(null)}>✕</button></div>}
        <form className="private-dm-composer" onSubmit={sendMessage}>
          <div className="private-dm-input-shell">
            {emojiOpen && <EmojiPicker onSelect={insertEmoji} />}
            <textarea ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} placeholder={`Mensagem para @${target.username}`} rows={1} maxLength={1000} disabled={!connected} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(event); } }} />
            <button className={`private-dm-emoji-toggle${emojiOpen ? " active" : ""}`} type="button" onClick={() => setEmojiOpen((value) => !value)} aria-label="Emojis">☺️</button>
          </div>
          <button className="private-dm-send" type="submit" disabled={!connected || !input.trim()}>↑</button>
        </form>
        <div className="private-dm-hint">Enter envia · Shift + Enter quebra a linha</div>
      </div>
    </section>
  );
}
