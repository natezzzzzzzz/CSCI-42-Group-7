import React, { useState } from "react";
import '../styles/index.css';
import 'bulma/css/bulma.min.css';
import { useNavigate } from "react-router-dom";

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/token/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        // simplejwt returns { detail: "No active account found..." } on bad creds
        setError(data.detail || "Invalid email or password.");
        return;
      }

      localStorage.setItem("access", data.access);
      localStorage.setItem("refresh", data.refresh);
      navigate("/main");
    } catch (err) {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="hero is-fullheight">
      <div className="hero-body">
        <div className="container">
          <div className="columns is-centered">
            <div className="column is-4">
              <div className="box shadow-lg">

                <h1 className="h4 has-text-centered mb-2">
                  Welcome Back
                </h1>

                <p className="tagline has-text-centered mb-5">
                  Login to continue
                </p>

                {error && (
                  <div className="notification is-danger is-light">
                    {error}
                  </div>
                )}

                <div className="field">
                  <label className="label text-small">Email</label>
                  <div className="control">
                    <input
                      className="input"
                      type="email"
                      placeholder="you@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="field">
                  <label className="label text-small">Password</label>
                  <div className="control">
                    <input
                      className="input"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    />
                  </div>
                </div>

                <button
                  className={`button is-primary is-fullwidth mt-4 ${loading ? "is-loading" : ""}`}
                  onClick={handleLogin}
                  disabled={loading}
                >
                  Login
                </button>

                <p className="has-text-centered mt-4 text-small">
                  Don't have an account?{" "}
                  <a onClick={() => navigate("/register")}>Register</a>
                </p>

              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default LoginPage;
