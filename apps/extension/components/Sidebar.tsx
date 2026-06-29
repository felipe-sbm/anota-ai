import { History, Mic, SquareArrowOutUpRight } from "lucide-react";
import React from "react"

const logoImg = new URL("../assets/logo.png", import.meta.url).toString()
const iconImg = new URL("../assets/icon.png", import.meta.url).toString()

type SidebarTab = "recorder" | "history"

type Props = {
  activeTab: SidebarTab
  onTabChange: (tab: SidebarTab) => void
  userName?: string
  recordingCount?: number
  isCollapsed: boolean
  onLogout?: () => void
  isInsideTab?: boolean
  onOpenInTab?: () => void
}

export default function Sidebar({
  activeTab,
  onTabChange,
  userName,
  recordingCount,
  isCollapsed,
  onLogout,
  isInsideTab,
  onOpenInTab
}: Props) {
  return (
    <aside className={`sidebar ${isCollapsed ? "sidebar-collapsed" : ""}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <img
            src={isCollapsed ? iconImg : logoImg}
            alt="Anota AI"
            className="sidebar-logo-img"
          />
        </div>

      </div>

      <nav className="sidebar-nav">
        <button
          className={`sidebar-nav-item ${activeTab === "recorder" ? "active" : ""}`}
          onClick={() => onTabChange("recorder")}
          title="Gravador">
          <Mic size={16} />
          {!isCollapsed && <span>Gravador</span>}
        </button>

        <button
          className={`sidebar-nav-item ${activeTab === "history" ? "active" : ""}`}
          onClick={() => onTabChange("history")}
          title="Histórico">
          <History size={16} />
          {!isCollapsed && <span>Histórico</span>}
          {!isCollapsed &&
            recordingCount !== undefined &&
            recordingCount > 0 && (
              <span className="sidebar-badge">{recordingCount}</span>
            )}
        </button>

        {!isInsideTab && (
          <button
            className="sidebar-nav-item sidebar-open-page"
            onClick={onOpenInTab}
            title="Abrir na página">
            <SquareArrowOutUpRight size={16} />
            {!isCollapsed && <span>Abrir na página</span>}
          </button>
        )}
      </nav>

      {!isCollapsed && onLogout && (
        <div className="sidebar-footer">
          <button
            className="sidebar-nav-item sidebar-logout"
            onClick={onLogout}
            title="Sair">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Sair</span>
          </button>
        </div>
      )}
    </aside>
  )
}
