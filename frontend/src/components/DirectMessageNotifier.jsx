import { useEffect, useState } from "react";
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

  useEffect(() => {
    let active = true;
    let retryTimer = null;
    let socket = null;

    async function start() {
      try {
        const response = await fetch(`${API_URL}/me`, { credentials: "include" });
        const data = await response.json().catch(() => null);
        const meId = Number(data?.user?.id);

        if (!active || !response.ok || !Number.isFinite(meId)) {
          retryTimer = window.setTimeout(start, 5000);
          return;
        }

        socket = createWebSocket("", {
          onMessage(message) {
            if (message?.type !== "direct_message") return;

            const senderId = Number(message.senderId ?? message.userId);
            const recipientId = Number(message.recipientId);
            if (!Number.isFinite(senderId) || senderId === meId || recipientId !== meId) return;

            const normalized = {
              ...message,
              senderId,
              userId: senderId,
              displayName: message.displayName || message.username || "Usuário",
            };

            notifyDirectMessage(normalized);
            playNotificationSound();
            setToast(normalized);

            if (document.visibilityState !== "visible") {
              const cleanTitle = document.title.replace(/^\(\d+\)\s*/, "") || "Pokinex";
              document.title = `(1) ${cleanTitle}`;
            }

            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
              try {
                new Notification(normalized.displayName, {
                  body: normalized.message || "Nova mensagem privada",
                  icon: "/icone.png",
                  tag: `pokinex-dm-${senderId}`,
                });
              } catch (error) {
                console.debug("Notificação do sistema indisponível:", error);
              }
            }
          },
          onAuthenticationRequired() {
            socket?.close();
            socket = null;
            clearTimeout(retryTimer);
            retryTimer = window.setTimeout(start, 4000);
          },
          onError: (error) => console.debug("Notificador DM:", error),
        });
      } catch (error) {
        clearTimeout(retryTimer);
        retryTimer = window.setTimeout(start, 5000);
      }
    }

    void start();

    return () => {
      active = false;
      clearTimeout(retryTimer);
      socket?.close();
      socket = null;
    };
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    function resetTitle() {
      if (document.visibilityState !== "visible") return;
      const title = document.title.replace(/^\(\d+\)\s*/, "");
      document.title = title || "Pokinex";
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
