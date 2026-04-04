import React from "react";
import '../styles/index.css'
import 'bulma/css/bulma.min.css';
import {useNavigate} from "react-router-dom";

function RegisterPage({ setPage }) {
  const navigate = useNavigate();
  return (
    <section className="hero is-fullheight" style={{ background: "var(--color-bg)" }}>
      <div className="hero-body">
        <div className="container">
          <div className="columns is-centered">
            <div className="column is-4">
              <div className="box shadow-lg" style={{ background: "var(--color-surface)" }}>

                <h1 className="h4 has-text-centered mb-2" style={{ color: "var(--color-text)" }}>
                  Create Account
                </h1>

                <p className="tagline has-text-centered mb-5" style={{ color: "var(--color-text-muted)" }}>
                  Join us today
                </p>

                <div className="field">
                  <label className="label text-small">Username</label>
                  <input className="input" placeholder="username" />
                </div>

                <div className="field">
                  <label className="label text-small">Email</label>
                  <input className="input" placeholder="email" />
                </div>

                <div className="field">
                  <label className="label text-small">Password</label>
                  <input className="input" type="password" />
                </div>

                <div className="field">
                  <label className="label text-small">Confirm Password</label>
                  <input className="input" type="password" />
                </div>

                <button
                  className="button is-fullwidth mt-4"
                  style={{ background: "var(--color-primary)", color: "white" }}
                  onClick={() => navigate("/deck")}
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