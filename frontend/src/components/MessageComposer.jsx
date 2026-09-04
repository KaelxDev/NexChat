export default function MessageComposer({ connected, offlineQueueLength, replyingTo, messageInput, onChange, onSubmit, onCancelReply }) {
  return (
    <div className="composer-zone">
      {replyingTo && (
        <div className="reply-composer">
          <div className="reply-composer-accent" aria-hidden="true" />
          <div className="reply-composer-content">
            <div className="reply-composer-label">
              <span>↩</span>
              <strong>Respondendo a {replyingTo.displayName || replyingTo.username}</strong>
            </div>
            <span>{replyingTo.deleted ? "Esta mensagem foi excluída" : replyingTo.message}</span>
          </div>
          <button type="button" onClick={onCancelReply} aria-label="Cancelar resposta">
            ✕
          </button>
        </div>
      )}

      <form className="message-form" onSubmit={onSubmit}>
        <div className="composer-input-shell">
          <span className={`composer-state ${connected ? "ready" : "offline"}`} aria-hidden="true" />
          <textarea
            aria-label={replyingTo ? "Digite sua resposta" : "Digite sua mensagem"}
            placeholder={
              connected
                ? replyingTo
                  ? "Digite sua resposta..."
                  : "Digite uma mensagem..."
                : "Sem conexão — a mensagem será enviada depois..."
            }
            value={messageInput}
            onChange={(event) => onChange(event.target.value)}
            rows={1}
            maxLength={1000}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSubmit(event);
              }
            }}
          />
        </div>
        <button className="composer-send" type="submit" disabled={!messageInput.trim()} aria-label="Enviar mensagem">
          <span className="composer-send-label">Enviar</span>
          <span className="composer-send-icon" aria-hidden="true">↑</span>
        </button>
      </form>

      <div className="input-hint">
        <span>Enter envia · Shift + Enter cria uma nova linha</span>
        <span className={offlineQueueLength ? "queue-active" : ""}>
          {offlineQueueLength ? `📦 ${offlineQueueLength} pendente(s)` : connected ? "● Conexão estável" : "○ Offline"}
        </span>
      </div>
    </div>
  );
}
