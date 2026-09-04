import { normalizeAvatarUrl, userInitial } from "../utils/chat";

export default function ChatSidebar({ user, profile, users, onOpenProfile, onClearHistory }) {
  const displayName = profile?.displayName || user?.displayName || user?.username || "Usuário";
  const avatar = normalizeAvatarUrl(profile?.avatar || user?.avatar, user?.id);

  return (
    <aside className="sidebar">
      <div className="sidebar-rail" aria-hidden="true">
        <div className="rail-brand">
          <img src="/icone.png?v=2" alt="" />
        </div>
        <span className="rail-divider" />
        <div className="rail-room active">
          <span className="rail-room-mark">#</span>
        </div>
        <div className="rail-spacer" />
        <div className="rail-status-dot" />
      </div>

      <div className="sidebar-main">
        <div className="sidebar-topbar">
          <div>
            <span className="sidebar-eyebrow">Workspace</span>
            <strong>Pokinex</strong>
          </div>
          <span className="workspace-dot" />
        </div>

        <div className="sidebar-heading">
          <span>Conversas</span>
          <span className="sidebar-heading-count">1</span>
        </div>

        <button className="channel-entry active" type="button">
          <span className="channel-entry-icon">#</span>
          <span className="channel-entry-copy">
            <strong>geral</strong>
            <small>Sala principal</small>
          </span>
          <span className="channel-entry-live" />
        </button>

        <div className="sidebar-heading users-heading">
          <span>Pessoas online</span>
          <span className="sidebar-heading-count">{users.length}</span>
        </div>

        <ul className="users">
          {users.map((onlineUser) => {
            const onlineAvatar = normalizeAvatarUrl(onlineUser.avatar, onlineUser.id);
            const name = onlineUser.displayName || onlineUser.username;

            return (
              <li className="user" key={onlineUser.id}>
                <div className="avatar user-avatar">
                  {onlineAvatar ? <img src={onlineAvatar} alt="" /> : userInitial(onlineUser)}
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
          <button className="profile-summary" type="button" onClick={onOpenProfile}>
            <div className="avatar profile-avatar">
              {avatar ? <img src={avatar} alt="" /> : displayName.slice(0, 1).toUpperCase()}
              <span className="profile-online-indicator" aria-hidden="true" />
            </div>
            <div className="profile-summary-copy">
              <strong>{displayName}</strong>
              <span>@{user.username}</span>
            </div>
            <span className="profile-arrow" aria-hidden="true">↗</span>
          </button>

          <button className="history-button" type="button" onClick={onClearHistory}>
            <span className="history-button-icon" aria-hidden="true">⌫</span>
            <span>
              <strong>Limpar histórico</strong>
              <small>Somente neste dispositivo</small>
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
}
