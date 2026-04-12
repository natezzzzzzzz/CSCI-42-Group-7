import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { fetchAvatar, fetchMyCosmetics, equipCosmetic, fetchAchievementStats } from "../api/deckApi.js";

export default function ProfilePage() {
  const navigate = useNavigate();

  const [avatar, setAvatar] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const [avatarRes, itemsRes, statsRes] = await Promise.all([
          fetchAvatar(),
          fetchMyCosmetics(),
          fetchAchievementStats(),
,        ]);

        setAvatar(avatarRes.equipped);
        setItems(itemsRes);
        setStats(statsRes);
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

      // refresh avatar
      const res = await fetchAvatar();
      setAvatar(res.equipped);

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
          src={avatar || "/default_avatar.png"}
          alt="avatar"
          className="avatar-img"
        />
      </div>

      {/* COSMETIC INVENTORY */}
      <div className="inventory">
        <h2>My Cosmetics</h2>
        <div className="csm-grid">
          {items.map((c) => (
            <div key={c.item.cosmeticID} className="csm-card">
              <img src={c.item.image} alt="" width={80} />
              <p>{c.item.item_name}</p>

              <button onClick={() => handleEquip(c.item.cosmeticID)}>
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