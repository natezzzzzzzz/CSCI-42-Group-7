import React from "react";
import '../styles/index.css'
import 'bulma/css/bulma.min.css';

function LoginPage({ setPage }) {
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