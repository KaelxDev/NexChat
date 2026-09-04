import { useEffect, useRef, useState } from "react";
import { createWebSocket } from "../services/websocket";
import { notifyDirectMessage } from "../notifications";

const API_URL = import.meta.env.VITE_API_URL || "https://nexchat-backend-2cyf.onrender.com/api/auth";

function playNotificationSound() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(740, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(980, context.currentTime + 0.09);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.07, context.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.18);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.19);
    oscillator.addEventListener("ended", () => context.close(), { once: true });
  } catch (error) {
    console.debug("Som de notificação indisponível:", error);
  }
}

export default function DirectMessageNotifier() {
  const [toast, setToast] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const socketRef = useRef(null);
  const reconnectTimerRef = useRef(null);

  useEffect(() => {
    let active = true;

    async function start() {
      try {
        const response = await fetch(`${API_URL}/me`, { credentials: "include" });
        const data = await response.json().catch(() => null);
        if (!active || !response.ok || !data?.user?.id) return;
        setCurrentUserId(Number(data.user.id));

        const socket = createWebSocket("", {
          onMessage(data) {
            if (data?.type !== "direct_message") return;
            if (Number(data.senderId) === Number(data.userId) && Number(data.senderId) === Number(currentUserId)) return;
            if (Number(data.recipientId) !== Number(data.userId) && currentUserId == null) return;
            if (currentUserId != null && Number(data.recipientId) !== Number(currentUserId)) return;

            const senderId = Number(data.senderId ?? data.userId);
            if (senderId === Number(currentUserId)) return;

            const message = {
              ...data,
              senderId,
              userId: senderId,
              displayName: data.displayName || data.username || "Usuário",
            };

            notifyDirectMessage(message);
            playNotificationSound();
            setToast(message);

            if (typeof document !== "undefined") {
              const currentTitle = document.title.replace(/^\(\d+\)\s*/, "");
              document.title = `(1) ${currentTitle || "Pokinex"}`;
            }

            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
              try {
                new Notification(message.displayName, {
                  body: message.message || "Nova mensagem privada",
                  icon: "/icone.png",
                  tag: `pokinex-dm-${senderId}`,
                });
              } catch (notificationError) {
                console.debug("Notificação do sistema indisponível:", notificationError);
              }
            }
          },
          onAuthenticationRequired() {
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = window.setTimeout(start, 4000);
          },
          onError: (error) => console.debug("Notificador DM:", error),
        });
        socketRef.current = socket;
      } catch (error) {
        if (active) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = window.setTimeout(start, 5000);
        }
      }
    }

    void start();

    return () => {
      active = false;
      clearTimeout(reconnectTimerRef.current);
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    function resetTitle() {
      const title = document.title.replace(/^\(\d+\)\s*/, "");
      if (document.visibilityState === "visible") document.title = title || "Pokinex";
    }
    document.addEventListener("visibilitychange", resetTitle);
    window.addEventListener("focus", resetTitle);
    return () => {
      document.removeEventListener("visibilitychange", resetTitle);
      window.removeEventListener("focus", resetTitle);
    };
  }, []);

  if (!toast) return null;

  return (
    <button
      className="dm-notification-toast"
      type="button"
      onClick={() => {
        window.dispatchEvent(new CustomEvent("pokinex:open-dm", { detail: toast }));
        setToast(null);
      }}
      aria-label={`Abrir conversa com ${toast.displayName}`}
    >
      <span className="dm-notification-avatar">
        {toast.avatar ? <img src={toast.avatar} alt="" /> : String(toast.displayName || "U").slice(0, 1).toUpperCase()}
      </span>
      <span className="dm-notification-copy">
        <strong>{toast.displayName}</strong>
        <span>{toast.message || "Nova mensagem privada"}</span>
      </span>
      <span className="dm-notification-dot" aria-hidden="true" />
    </button>
  );
}
