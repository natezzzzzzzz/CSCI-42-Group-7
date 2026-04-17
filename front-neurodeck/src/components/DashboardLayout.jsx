import React, { useContext, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AuthContext from "../context/AuthContext";

export default function DashboardLayout({ children, rightPanel }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logoutUser } = useContext(AuthContext);
  const [dashOpen, setDashOpen] = useState(
    location.pathname === "/analytics"
  );

  const isActive = (path) => location.pathname === path;
  const isAnalytics = location.pathname === "/analytics";

  const handleLogout = () => {
    logoutUser();
    navigate("/");
  };

  return (
    <div className="db-layout">
      <aside className="db-sidebar">
        <div className="db-logo">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <polygon points="11,2 20,7 20,15 11,20 2,15 2,7" fill="#6366F1" opacity="0.9"/>
            <polygon points="11,5 17,8.5 17,15.5 11,19 5,15.5 5,8.5" fill="white" opacity="0.3"/>
          </svg>
          <span className="db-logo-text">NeuroDeck</span>
        </div>

        <nav className="db-nav">
          <div
            className={`db-nav-item${isActive("/main") ? " db-nav-active" : ""}`}
            onClick={() => navigate("/main")}
          >
            <svg className="db-nav-icon" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h4a1 1 0 001-1v-3h2v3a1 1 0 001 1h4a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
            </svg>
            <span className="db-nav-label">Home</span>
          </div>

          <div
            className={`db-nav-item${isActive("/decks") ? " db-nav-active" : ""}`}
            onClick={() => navigate("/decks")}
          >
            <svg className="db-nav-icon" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
              <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zm-2 4a1 1 0 011-1h14a1 1 0 110 2H3a1 1 0 01-1-1z"/>
            </svg>
            <span className="db-nav-label">My Decks</span>
          </div>

          <div
            className={`db-nav-item${isActive("/multiplayer") ? " db-nav-active" : ""}`}
            onClick={() => navigate("/multiplayer")}
          >
            <svg className="db-nav-icon" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zm5 2a2 2 0 11-4 0 2 2 0 014 0zm-4 7a4 4 0 00-8 0v1h8v-1zM6 8a2 2 0 11-4 0 2 2 0 014 0zm10 7h2v-1a3 3 0 00-3-3H3a3 3 0 00-3 3v1h2"/>
            </svg>
            <span className="db-nav-label">Multiplayer</span>
          </div>

          <div className={`db-nav-item${isAnalytics && !dashOpen ? " db-nav-active" : ""}`} onClick={() => setDashOpen(p => !p)}>
            <svg className="db-nav-icon" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
            </svg>
            <span className="db-nav-label">Dashboard</span>
            <svg className={`db-nav-chevron${dashOpen ? " db-chevron-open" : ""}`} viewBox="0 0 20 20" fill="currentColor" width="12" height="12">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/>
            </svg>
          </div>

          {dashOpen && (
            <div className="db-nav-sub">
              <div className="db-nav-sub-item" onClick={() => navigate("/analytics")}>
                <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12"><path d="M8 1l7 6.5-1.4 1.5L8 3.5 2.4 9 1 7.5z"/></svg>
                <span>Trends</span>
              </div>
              <div className="db-nav-sub-item" onClick={() => navigate("/analytics")}>
                <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12"><path d="M1 3h14v2H1zm0 4h14v2H1zm0 4h14v2H1z"/></svg>
                <span>Analytics</span>
              </div>
              <div className="db-nav-sub-item" onClick={() => navigate("/analytics")}>
                <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12"><path d="M1 2h14v2H1zm0 4h14v2H1zm0 4h10v2H1z"/></svg>
                <span>Historical</span>
              </div>
            </div>
          )}

          <div
            className={`db-nav-item${isActive("/achievements") ? " db-nav-active" : ""}`}
            onClick={() => navigate("/achievements")}
          >
            <svg className="db-nav-icon" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
              <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" clipRule="evenodd"/>
            </svg>
            <span className="db-nav-label">Achievements</span>
          </div>
        </nav>

        <div className="db-sidebar-bottom">
          <div
            className={`db-nav-item${isActive("/shop") ? " db-nav-active" : ""}`}
            onClick={() => navigate("/shop")}
          >
            <svg className="db-nav-icon" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
              <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zm16 7H0v5a2 2 0 002 2h16a2 2 0 002-2v-5zM6 11a1 1 0 11-2 0 1 1 0 012 0zm2 0a1 1 0 110 2H7a1 1 0 010-2h1z"/>
            </svg>
            <span className="db-nav-label">Cosmetics</span>
          </div>
          <div
            className={`db-nav-item${isActive("/profile") ? " db-nav-active" : ""}`}
            onClick={() => navigate("/profile")}
          >
            <svg className="db-nav-icon" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
            </svg>
            <span className="db-nav-label">Profile</span>
          </div>
          <div className="db-nav-item db-nav-logout" onClick={handleLogout}>
            <svg className="db-nav-icon" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
              <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h7a1 1 0 100-2H4V5h6a1 1 0 100-2H3zm11.293 4.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L15.586 11H9a1 1 0 110-2h6.586l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd"/>
            </svg>
            <span className="db-nav-label">Logout</span>
          </div>
        </div>
      </aside>

      <div className="db-main">
        <header className="db-topbar">
          <svg className="db-topbar-bell" viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zm0 16a2 2 0 01-2-2h4a2 2 0 01-2 2z"/>
          </svg>
          <div className="db-topbar-avatar" onClick={() => navigate("/profile")} title={user?.username}>
            {user?.username?.[0]?.toUpperCase() ?? "U"}
          </div>
        </header>

        <div className="db-body">
          <main className="db-content">{children}</main>
          {rightPanel && (
            <aside className="db-right-panel">{rightPanel}</aside>
          )}
        </div>
      </div>
    </div>
  );
}
