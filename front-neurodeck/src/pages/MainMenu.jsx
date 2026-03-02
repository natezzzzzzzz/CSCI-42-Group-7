import React from "react";
import '../styles/index.css'
import 'bulma/css/bulma.min.css';

function MainMenu({ setPage }) {
  return (
    <section className="section">
      <div className="container">

        <div className="box shadow-md mb-5">
          <h1 className="h4 mb-1">
            Main Menu
          </h1>
          <p className="text-small">
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