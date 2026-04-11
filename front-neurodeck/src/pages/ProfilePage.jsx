import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function ProfilePage() {
  const navigate = useNavigate();

  const [avatar, setAvatar] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [avatarRes, statsRes] = await Promise.all([
          axios.get("/cosmetics/avatar/"),
          axios.get("/achievements/stats/"),
        ]);

        setAvatar(avatarRes.data.equipped);
        setStats(statsRes.data);
      } catch (err) {
        console.error("Profile load failed:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

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

      <button onClick={() => navigate("/shop")}>
        Go to Shop
      </button>
    </div>
  );
}