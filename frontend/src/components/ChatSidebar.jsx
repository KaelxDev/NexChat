import { normalizeAvatarUrl, userInitial } from "../utils/chat";

export default function ChatSidebar({ user, profile, users, onOpenProfile, onClearHistory }) {
  const displayName = profile?.displayName || user?.displayName || user?.username || "Usuário";
  const avatar = normalizeAvatarUrl(profile?.avatar || user?.avatar, user?.id);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="pokinex-brand" aria-label="Pokinex">
          <img src="/icone.png?v=2" alt="" />
          <div className="pokinex-brand-copy">
            <strong>Pokinex</strong>
            <span>Comunicação em tempo real</span>
          </div>
        </div>

        <button className="profile-summary" type="button" onClick={onOpenProfile}>
          <div className="avatar profile-avatar">
            {avatar ? <img src={avatar} alt="" /> : displayName.slice(0, 1).toUpperCase()}
            <span className="profile-online-indicator" aria-hidden="true" />
          </div>
          <div className="profile-summary-copy">
            <div className="profile-name-row">
              <h2>{displayName}</h2>
              <span className="profile-edit-mark" aria-hidden="true">↗</span>
            </div>
            <p>@{user.username}</p>
            <small>{profile?.status || user?.status || "Disponível para conversar"}</small>
          </div>
        </button>
      </div>

      <div className="sidebar-section-heading">
        <span>Conectados agora</span>
        <span className="users-count-badge">{users.length}</span>
      </div>

      <ul className="users">
        {users.map((onlineUser) => {
          const onlineAvatar = normalizeAvatarUrl(onlineUser.avatar, onlineUser.id);
          const name = onlineUser.displayName || onlineUser.username;

          return (
            <li className="user" key={onlineUser.id}>
              <div className="avatar user-avatar">
                {onlineAvatar ? (
                  <img src={onlineAvatar} alt="" />
                ) : (
                  userInitial(onlineUser)
                )}
                <span className="user-online-indicator" aria-hidden="true" />
              </div>
              <div className="user-info">
                <strong>{name}</strong>
                <span>@{onlineUser.username}</span>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="sidebar-footer">
        <button className="history-button" type="button" onClick={onClearHistory}>
          <span className="history-button-icon" aria-hidden="true">⌫</span>
          <span>
            <strong>Limpar histórico</strong>
            <small>Somente neste dispositivo</small>
          </span>
        </button>
        <div className="sidebar-signature">
          <img src="/icone.png?v=2" alt="" />
          <span>Pokinex</span>
        </div>
      </div>
    </aside>
  );
}
