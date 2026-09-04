export default function ChatHeader({ connectionStatus, reconnectAttempt, reconnectSeconds, onLogout }) {
  return (
    <header className="chat-header">
      <div className="channel-brand">
        <img src="/icone.png?v=2" alt="" />
        <div className="channel-brand-copy">
          <h1># geral</h1>
          {connectionStatus === "reconnecting" ? (
            <div className="connection connecting">
              🟡 Reconectando... tentativa #{reconnectAttempt || 1} • próxima tentativa em {reconnectSeconds || 10}s
            </div>
          ) : connectionStatus === "connecting" ? (
            <div className="connection connecting">🟡 Conectando...</div>
          ) : (
            <div className="connection">
              <span className="online-dot" />Online
            </div>
          )}
        </div>
      </div>

      <button className="logout" type="button" onClick={onLogout}>
        Sair
      </button>
    </header>
  );
}
