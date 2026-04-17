import React, { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAvatar, fetchMyCosmetics, equipCosmetic } from "../api/deckApi.js";
import AuthContext from "../context/AuthContext";
import DashboardLayout from "../components/DashboardLayout";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [avatar, setAvatar] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [avatarRes, itemsRes] = await Promise.all([fetchAvatar(), fetchMyCosmetics()]);
        setAvatar(avatarRes);
        setItems(itemsRes);
      } catch (err) {
        console.error("Profile load failed:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleEquip = async (id) => {
    try {
      await equipCosmetic(id);
      const [avatarRes, itemsRes] = await Promise.all([fetchAvatar(), fetchMyCosmetics()]);
      setAvatar(avatarRes);
      setItems(itemsRes);
      setToast("Equipped!");
      setTimeout(() => setToast(""), 2000);
    } catch {
      setToast("Equip failed.");
      setTimeout(() => setToast(""), 2000);
    }
  };

  return (
    <DashboardLayout>
      <div className="db-content-header">
        <h1 className="db-page-title">My Profile</h1>
        <button className="db-new-btn" onClick={() => navigate("/shop")}>Visit Shop</button>
      </div>

      {loading ? (
        <div className="lp-loading">Loading profile...</div>
      ) : (
        <div className="pf-layout">
          <div className="pf-avatar-card">
            <div className="pf-avatar-wrap">
              <img
                src={avatar?.url ? `http://127.0.0.1:8000${avatar.url}` : "/default.png"}
                alt={avatar?.name || "Avatar"}
                className="pf-avatar-img"
              />
            </div>
            <h2 className="pf-username">{user?.username ?? "Player"}</h2>
            {avatar?.name && <p className="pf-avatar-name">Avatar: {avatar.name}</p>}
          </div>

          <div className="pf-inventory">
            <h3 className="pf-section-title">My Cosmetics</h3>
            {items.length === 0 ? (
              <p className="db-empty">No cosmetics yet. <span className="auth-link" onClick={() => navigate("/shop")}>Visit the shop →</span></p>
            ) : (
              <div className="csm-lp-grid">
                {items.map(c => (
                  <div key={c.cosmeticID} className="csm-lp-card">
                    <div className="csm-lp-img-wrap">
                      <img src={`http://127.0.0.1:8000${c.image}`} alt={c.item_name} className="csm-lp-img" />
                    </div>
                    <div className="csm-lp-info">
                      <p className="csm-lp-name">{c.item_name}</p>
                    </div>
                    <div className="csm-lp-footer">
                      <button className="csm-lp-btn csm-lp-btn-equip" onClick={() => handleEquip(c.cosmeticID)}>
                        Equip
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {toast && <div className="lp-toast">{toast}</div>}
    </DashboardLayout>
  );
}
