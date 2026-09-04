export default function MessageComposer({ connected, offlineQueueLength, replyingTo, messageInput, onChange, onSubmit, onCancelReply }) {
  return (
    <div className="composer-zone">
      {replyingTo && (
        <div className="reply-composer">
          <div className="reply-composer-accent" aria-hidden="true" />
          <div className="reply-composer-content">
            <span className="reply-composer-label">Respondendo a {replyingTo.displayName || replyingTo.username}</span>
            <strong>{replyingTo.deleted ? "Esta mensagem foi excluída" : replyingTo.message}</strong>
          </div>
          <button type="button" onClick={onCancelReply} aria-label="Cancelar resposta">✕</button>
        </div>
      )}

      <form className="message-form" onSubmit={onSubmit}>
        <div className="composer-input-shell">
          <span className={`composer-state ${connected ? "ready" : "offline"}`} aria-hidden="true" />
          <textarea
            aria-label={replyingTo ? "Digite sua resposta" : "Digite sua mensagem"}
            placeholder={connected ? (replyingTo ? "Escreva sua resposta..." : "Envie uma mensagem para #geral") : "Você está offline. A mensagem ficará na fila."}
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
        <span>Enter envia · Shift + Enter quebra a linha</span>
        <span className={offlineQueueLength ? "queue-active" : ""}>
          {offlineQueueLength ? `${offlineQueueLength} pendente(s)` : connected ? "Conectado" : "Offline"}
        </span>
      </div>
    </div>
  );
}
