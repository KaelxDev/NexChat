import { userInitial } from "../utils/chat";

export default function ChatSidebar({ user, profile, users, onOpenProfile, onClearHistory }) {
  const displayName = profile?.displayName || user?.displayName || user?.username || "Usuário";
  const avatar = profile?.avatar || "";

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <button className="profile-summary" type="button" onClick={onOpenProfile}>
          <div className="avatar profile-avatar">
            {avatar ? <img src={avatar} alt="" /> : displayName.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <h2>{displayName}</h2>
            <p>@{user.username}</p>
            <small>{profile?.status || "Sem status"}</small>
          </div>
        </button>
      </div>

      <div className="users-title">Usuários online — {users.length}</div>
      <ul className="users">
        {users.map((onlineUser) => (
          <li className="user" key={onlineUser.id}>
            <div className="avatar user-avatar">
              {onlineUser.avatar ? (
                <img src={onlineUser.avatar} alt="" />
              ) : (
                userInitial(onlineUser)
              )}
            </div>
            <div className="user-info">
              <strong>{onlineUser.displayName || onlineUser.username}</strong>
              <span>
                <span className="online-dot" />@{onlineUser.username}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <button className="logout" type="button" onClick={onClearHistory}>
        Limpar histórico local
      </button>
    </aside>
  );
}
