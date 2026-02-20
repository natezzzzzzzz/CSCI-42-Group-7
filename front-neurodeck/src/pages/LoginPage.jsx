import React from "react";
import '../styles/index.css'
import 'bulma/css/bulma.min.css';

function LoginPage({ setPage }) {
  return (
    <section className="hero is-fullheight" style={{ background: "var(--color-bg)" }}>
      <div className="hero-body">
        <div className="container">
          <div className="columns is-centered">
            <div className="column is-4">
              <div className="box shadow-lg" style={{ background: "var(--color-surface)" }}>

                <h1 className="h4 has-text-centered mb-2" style={{ color: "var(--color-text)" }}>
                  Welcome Back
                </h1>

                <p className="tagline has-text-centered mb-5" style={{ color: "var(--color-text-muted)" }}>
                  Login to continue
                </p>

                <div className="field">
                  <label className="label text-small">Email</label>
                  <div className="control">
                    <input className="input" type="email" placeholder="you@email.com" />
                  </div>
                </div>

                <div className="field">
                  <label className="label text-small">Password</label>
                  <div className="control">
                    <input className="input" type="password" placeholder="••••••••" />
                  </div>
                </div>

                <button
                  className="button is-fullwidth mt-4"
                  style={{ background: "var(--color-primary)", color: "white" }}
                  onClick={() => setPage("main")}
                >
                  Login
                </button>

                <p className="has-text-centered mt-4 text-small">
                  Don’t have an account?{" "}
                  <a onClick={() => setPage("register")}>Register</a>
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