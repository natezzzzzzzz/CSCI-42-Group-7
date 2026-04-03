import React, { useState } from "react";
import '../styles/index.css';
import 'bulma/css/bulma.min.css';
import { useNavigate } from "react-router-dom";

function RegisterPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setError("");

    // Client-side password match check before hitting the server
    if (password !== password2) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/register/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password, password2 }),
      });

      const data = await res.json();

      if (!res.ok) {
        // DRF returns field-keyed errors e.g. { email: ["already exists"] }
        const messages = Object.values(data).flat().join(" ");
        setError(messages || "Registration failed. Please try again.");
        return;
      }

      // Success — send to login so they authenticate properly
      navigate("/");
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
                  Create Account
                </h1>

                <p className="tagline has-text-centered mb-5">
                  Join us today
                </p>

                {error && (
                  <div className="notification is-danger is-light">
                    {error}
                  </div>
                )}

                <div className="field">
                  <label className="label text-small">Username</label>
                  <div className="control">
                    <input
                      className="input"
                      type="text"
                      placeholder="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                </div>

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
                    />
                  </div>
                </div>

                <div className="field">
                  <label className="label text-small">Confirm Password</label>
                  <div className="control">
                    <input
                      className="input"
                      type="password"
                      placeholder="••••••••"
                      value={password2}
                      onChange={(e) => setPassword2(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                    />
                  </div>
                </div>

                <button
                  className={`button is-primary is-fullwidth mt-4 ${loading ? "is-loading" : ""}`}
                  onClick={handleRegister}
                  disabled={loading}
                >
                  Register
                </button>

                <p className="has-text-centered mt-4 text-small">
                  Already have an account?{" "}
                  <a onClick={() => navigate("/")}>Login</a>
                </p>

              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default RegisterPage;
