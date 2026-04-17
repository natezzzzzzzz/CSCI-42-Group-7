import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import AuthContext from "../context/AuthContext";
import DashboardLayout from "../components/DashboardLayout";

const CARDS = [
  {
    path: "/decks",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
        <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
      </svg>
    ),
    title: "My Decks",
    desc: "Create and manage your flashcard decks",
    color: "#6366f1",
    bg: "#f0f0fd",
  },
  {
    path: "/multiplayer",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
      </svg>
    ),
    title: "Multiplayer",
    desc: "Challenge friends in real-time flashcard battles",
    color: "#0ea5e9",
    bg: "#f0f9ff",
  },
  {
    path: "/analytics",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
        <path d="M3.5 18.5l6-6 4 4L22 6.92 20.59 5.5l-7.09 8-4-4L2 17l1.5 1.5z"/>
      </svg>
    ),
    title: "Analytics",
    desc: "Track your learning progress and accuracy",
    color: "#10b981",
    bg: "#f0fdf4",
  },
  {
    path: "/achievements",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
        <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0011 15.9V18H9v2h6v-2h-2v-2.1a5.01 5.01 0 003.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"/>
      </svg>
    ),
    title: "Achievements",
    desc: "View badges and milestones you've earned",
    color: "#f59e0b",
    bg: "#fffbeb",
  },
  {
    path: "/shop",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
        <path d="M20 4H4v2l16 .01V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z"/>
      </svg>
    ),
    title: "Cosmetics",
    desc: "Customize your experience with items from the shop",
    color: "#ec4899",
    bg: "#fdf2f8",
  },
  {
    path: "/profile",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
      </svg>
    ),
    title: "Profile",
    desc: "View and manage your account details",
    color: "#8b5cf6",
    bg: "#f5f3ff",
  },
];

export default function MainMenu() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  return (
    <DashboardLayout>
      <div className="mm-header">
        <h1 className="db-page-title">Welcome back{user?.username ? `, ${user.username}` : ""}!</h1>
        <p className="mm-subtitle">What would you like to do today?</p>
      </div>

      <div className="mm-grid">
        {CARDS.map((card) => (
          <div key={card.path} className="mm-card" onClick={() => navigate(card.path)}>
            <div className="mm-card-icon" style={{ background: card.bg, color: card.color }}>
              {card.icon}
            </div>
            <div className="mm-card-body">
              <h3 className="mm-card-title">{card.title}</h3>
              <p className="mm-card-desc">{card.desc}</p>
            </div>
            <svg className="mm-card-arrow" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd"/>
            </svg>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
