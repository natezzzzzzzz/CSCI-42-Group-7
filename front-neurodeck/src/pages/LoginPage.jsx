import React, { useState, useContext } from "react";
import '../styles/index.css';
import 'bulma/css/bulma.min.css';
import { useNavigate } from "react-router-dom";
import AuthContext from "../context/AuthContext";

function LoginPage() {
  const navigate = useNavigate();
  const { loginUser } = useContext(AuthContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      const success = await loginUser(email, password);
      if (success) {
        navigate("/main");
      } else {
        setError("Invalid email or password.");
      }
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
