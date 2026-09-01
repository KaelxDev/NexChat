export default function MessageComposer({ connected, offlineQueueLength, replyingTo, messageInput, onChange, onSubmit, onCancelReply }) {
  return (
    <>
      {replyingTo && (
        <div className="reply-composer">
          <div>
            <strong>↩️ Respondendo a {replyingTo.displayName || replyingTo.username}</strong>
            <span>{replyingTo.deleted ? "Esta mensagem foi excluída" : replyingTo.message}</span>
          </div>
          <button type="button" onClick={onCancelReply} aria-label="Cancelar resposta">
            ✕
          </button>
        </div>
      )}

      <form className="message-form" onSubmit={onSubmit}>
        <textarea
          placeholder={
            connected
              ? replyingTo
                ? "Digite sua resposta..."
                : "Digite uma mensagem..."
              : "Digite uma mensagem offline..."
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
        <button type="submit" disabled={!messageInput.trim()}>
          Enviar
        </button>
      </form>

      <div className="input-hint">
        Enter para enviar • {offlineQueueLength ? `📦 ${offlineQueueLength} pendente(s)` : "Conta autenticada"}
      </div>
    </>
  );
}
