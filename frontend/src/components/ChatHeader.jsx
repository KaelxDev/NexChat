export default function ChatHeader({ connectionStatus, reconnectAttempt, reconnectSeconds, onLogout }) {
  const connectionState =
    connectionStatus === "reconnecting"
      ? "reconnecting"
      : connectionStatus === "connecting"
        ? "connecting"
        : "online";

  return (
    <header className="chat-header">
      <div className="channel-brand">
        <div className="channel-brand-icon-wrap">
          <img src="/icone.png?v=2" alt="" />
        </div>
        <div className="channel-brand-copy">
          <div className="channel-kicker">SALA PRINCIPAL</div>
          <h1><span className="channel-hash">#</span>geral</h1>
          {connectionState === "reconnecting" ? (
            <div className="connection connecting">
              <span className="connection-dot" />
              <span>Reconectando</span>
              <small>tentativa #{reconnectAttempt || 1} · {reconnectSeconds || 10}s</small>
            </div>
          ) : connectionState === "connecting" ? (
            <div className="connection connecting">
              <span className="connection-dot" />
              <span>Conectando...</span>
            </div>
          ) : (
            <div className="connection connection-online">
              <span className="connection-dot" />
              <span>Conectado em tempo real</span>
            </div>
          )}
        </div>
      </div>

      <div className="header-actions">
        <div className="header-badge" aria-label="WebSocket em tempo real">
          <span className="header-badge-pulse" aria-hidden="true" />
          <span>LIVE</span>
        </div>
        <button className="logout" type="button" onClick={onLogout}>
          <span className="logout-icon" aria-hidden="true">↪</span>
          <span>Sair</span>
        </button>
      </div>
    </header>
  );
}
