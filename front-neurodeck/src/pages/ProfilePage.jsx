import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAvatar, fetchMyCosmetics, equipCosmetic } from "../api/deckApi.js";

export default function ProfilePage() {
  const navigate = useNavigate();

  const [avatar, setAvatar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const [avatarRes, itemsRes] = await Promise.all([
          fetchAvatar(),
          fetchMyCosmetics(),
        ]);

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

      const avatarRes = await fetchAvatar();
      setAvatar(avatarRes);

      const itemsRes = await fetchMyCosmetics();
      setItems(itemsRes);

    } catch (err) {
      console.error("Equip failed:", err);
    }
  };  

  if (loading) return <div>Loading profile...</div>;

  return (
    <div className="profile-page">

      <div className="an-header">
        <button onClick={() => navigate("/main")}>
          Back
        </button>
        <h1>My Profile</h1>
      </div>

      {/* AVATAR */}
      <div className="avatar-box">
        <img
          src={avatar?.url ? `http://127.0.0.1:8000${avatar.url}` : "/default.png"}
          alt={avatar?.name || "avatar not found"}
          className="avatar-img"
        />
      </div>

      {/* COSMETIC INVENTORY */}
      <div className="inventory">
        <h2>My Cosmetics</h2>
        <div className="csm-grid">
          {items.map((c) => (
            <div key={c.cosmeticID} className="csm-card">
              <img src={`http://127.0.0.1:8000${c.image}`} alt={c.item_name} />
              <p>{c.item_name}</p>

              <button onClick={() => handleEquip(c.cosmeticID)}>
                Equip
              </button>
            </div>
          ))}
        </div>

        <button onClick={() => navigate("/shop")}>
          Go to Shop
        </button>
      </div>

    </div>
  );
}