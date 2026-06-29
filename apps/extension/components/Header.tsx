import { Menu, PanelLeftClose, PanelLeftOpen, User } from "lucide-react"

type Props = {
  isSidebarCollapsed: boolean
  onToggleSidebar: () => void
  userName?: string
  userAvatarUrl?: string
  recordingCount?: number
}

export default function Header({
  isSidebarCollapsed,
  onToggleSidebar,
  userName,
  userAvatarUrl,
  recordingCount
}: Props) {
  const displayName = userName || "Usuário"
  const initial = displayName.charAt(0).toUpperCase()

  const showAvatarImage = Boolean(userAvatarUrl)

  return (
    <header className="app-header">
      <div className="app-header-left">
        <button
          className="app-header-icon-btn"
          onClick={onToggleSidebar}
          title={isSidebarCollapsed ? "Expandir sidebar" : "Recolher sidebar"}
          aria-label={isSidebarCollapsed ? "Expandir sidebar" : "Recolher sidebar"}>
          {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
        <button
          className="app-header-icon-btn app-header-menu"
          onClick={onToggleSidebar}
          title="Menu"
          aria-label="Menu">
          <Menu size={18} />
        </button>
      </div>

      <div className="app-header-user" title={displayName}>
        <div className="app-header-user-text">
          <span className="app-header-user-name">{displayName}</span>
          {recordingCount !== undefined && (
            <span className="app-header-user-meta">
              {recordingCount} {recordingCount === 1 ? "gravação" : "gravações"}
            </span>
          )}
        </div>
        <div className="app-header-avatar" aria-hidden="true">
          {showAvatarImage ? (
            <img
              src={userAvatarUrl}
              alt={displayName}
              className="app-header-avatar-img"
            />
          ) : userName ? (
            initial
          ) : (
            <User size={16} />
          )}
        </div>
      </div>
    </header>
  )
}

