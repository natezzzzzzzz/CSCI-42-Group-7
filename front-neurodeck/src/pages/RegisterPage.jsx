import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";


  const handleRegister = async () => {
    setError("");
    if (password !== password2) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/register/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password, password2 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(Object.values(data).flat().join(" ") || "Registration failed.");
        return;
      }
      navigate("/");
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <svg width="32" height="32" viewBox="0 0 22 22" fill="none">
            <polygon points="11,2 20,7 20,15 11,20 2,15 2,7" fill="#6366F1"/>
            <polygon points="11,5 17,8.5 17,15.5 11,19 5,15.5 5,8.5" fill="white" opacity="0.4"/>
          </svg>
          <span className="auth-logo-text">NeuroDeck</span>
        </div>

        <h1 className="auth-title">Create account</h1>
        <p className="auth-subtitle">Join NeuroDeck and start learning</p>

        {error && <div className="auth-error">{error}</div>}

        <div className="auth-field">
          <label className="auth-label">Username</label>
          <input
            className="auth-input"
            type="text"
            placeholder="username"
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
        </div>

        <div className="auth-field">
          <label className="auth-label">Email</label>
          <input
            className="auth-input"
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>

        <div className="auth-field">
          <label className="auth-label">Password</label>
          <input
            className="auth-input"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>

        <div className="auth-field">
          <label className="auth-label">Confirm Password</label>
          <input
            className="auth-input"
            type="password"
            placeholder="••••••••"
            value={password2}
            onChange={e => setPassword2(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleRegister()}
          />
        </div>

        <button
          className="auth-btn"
          onClick={handleRegister}
          disabled={loading}
        >
          {loading ? <span className="auth-spinner" /> : "Create Account"}
        </button>

        <p className="auth-footer">
          Already have an account?{" "}
          <span className="auth-link" onClick={() => navigate("/")}>Sign in</span>
        </p>
      </div>
    </div>
  );
}
