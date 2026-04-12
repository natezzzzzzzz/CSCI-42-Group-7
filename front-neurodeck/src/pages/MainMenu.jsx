import React from "react";
import '../styles/index.css'
import 'bulma/css/bulma.min.css';
import { useNavigate } from "react-router-dom";

function MainMenu() {
  const navigate = useNavigate();
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
          <div className="column" onClick = {() => navigate("/profile")}>
            <div className="box shadow-sm">
              <h2 className="h6">Profile</h2>
              <p className="text-small">View your account details</p>
            </div>
          </div>

          <div className="column" onClick = {() => navigate("/achievements")}>
            <div className="box shadow-sm">
              <h2 className="h6">Achievements</h2>
              <p className="text-small">View your achievements</p>
            </div>
          </div>

          <div className="column" onClick={() => navigate("/analytics")}>
            <div className="box shadow-sm">
              <h2 className="h6">Analytics</h2>
              <p className="text-small">View activity insights</p>
            </div>
          </div>
        </div>

        <div className="columns"> {/* New row */}

          <div className="column" onClick={() => navigate("/decks")}>
            <div className="box shadow-sm">
              <h2> Decks</h2>
              <p className="text-small">View and manage your flashcard decks</p>
              </div>
          </div>

          <div className="column" onClick={() => navigate("/multiplayer")}> 
            <div className="box shadow-sm">
              <h2> Multiplayer</h2>
              <p className="text-small">Play with friends</p>
              </div>
          </div>

          <div className="column" onClick={() => navigate("/shop")}>
            <div className="box shadow-sm">
              <h2>Cosmetics</h2>
              <p className="text-small">Shop and equip items</p>
            </div>
          </div>
        </div>

        

        

        <div className="has-text-centered mt-6">
          <button
            className="button is-danger"
            onClick={() => {
              localStorage.removeItem("access");
              localStorage.removeItem("refresh");
              navigate("/");
            }}
          >
            Logout
          </button>
        </div>

        

      </div>
    </section>
  );
}

export default MainMenu;