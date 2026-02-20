import React from "react";
import '../styles/index.css'
import 'bulma/css/bulma.min.css';

function MainMenu({ setPage }) {
  return (
    <section className="section" style={{ background: "var(--color-bg)", minHeight: "100vh" }}>
      <div className="container">

        <div className="box shadow-md mb-5" style={{ background: "var(--color-surface)" }}>
          <h1 className="h4 mb-1" style={{ color: "var(--color-text)" }}>
            Main Menu
          </h1>
          <p className="text-small" style={{ color: "var(--color-text-muted)" }}>
            Welcome to your dashboard
          </p>
        </div>

        <div className="columns">
          <div className="column">
            <div className="box shadow-sm">
              <h2 className="h6">Profile</h2>
              <p className="text-small">View your account details</p>
            </div>
          </div>

          <div className="column">
            <div className="box shadow-sm">
              <h2 className="h6">Settings</h2>
              <p className="text-small">Manage preferences</p>
            </div>
          </div>

          <div className="column">
            <div className="box shadow-sm">
              <h2 className="h6">Analytics</h2>
              <p className="text-small">View activity insights</p>
            </div>
          </div>
        </div>

        <div className="has-text-centered mt-6">
          <button
            className="button is-danger"
            onClick={() => setPage("login")}
          >
            Logout
          </button>
        </div>

      </div>
    </section>
  );
}

export default MainMenu;