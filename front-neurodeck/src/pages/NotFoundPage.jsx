import React from "react";
import { useNavigate } from "react-router-dom";
import '../styles/index.css';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="sg-centered-state">
      <div className="mp-panel sg-state-panel">
        <div className="sg-state-icon">🔍</div>
        <h3 className="h5">Page Not Found</h3>
        <p className="sg-state-text">The page you're looking for doesn't exist.</p>
        <button className="mp-btn mp-btn-primary" onClick={() => navigate("/")}>
          Back to Login
        </button>
      </div>
    </div>
  );
}