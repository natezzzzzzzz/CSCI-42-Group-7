import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchCosmeticShop, purchaseCosmetic, equipCosmetic } from "../api/deckApi";

export default function CosmeticsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetchCosmeticShop()
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  const flash = (text) => {
    setMsg(text);
    setTimeout(() => setMsg(""), 2000);
  };

  const handlePurchase = async (id) => {
    try {
      const res = await purchaseCosmetic(id);
      setItems((prev) =>
        prev.map((i) =>
          i.CosmeticID === id ? { ...i, owned: true } : i
        )
      );
      flash(res.message);
    } catch (e) {
      flash("Purchase failed");
    }
  };

  const handleEquip = async (id) => {
    try {
      const res = await equipCosmetic(id);

      setItems((prev) =>
        prev.map((i) => ({
          ...i,
          is_equipped: i.CosmeticID === id ? res.is_equipped : false,
        }))
      );

      flash(res.is_equipped ? "Equipped!" : "Unequipped!");
    } catch {
      flash("Equip failed");
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="csm-page">

      <div className="an-header">
        <button onClick={() => navigate("/main")}>Back</button>
        <h1>Cosmetics Shop</h1>
        <button onClick={() => navigate("/profile")}>
          My Profile
        </button>
      </div>

      {msg && <div className="toast">{msg}</div>}

      <div className="csm-grid">
        {items.map((item) => (
          <div key={item.CosmeticID} className="csm-card">

            <img
              src={`http://127.0.0.1:8000${item.Image}`}
              alt={item.ItemName}
              className="csm-image"
            />

            <h3>{item.ItemName}</h3>

            <p>{item.owned ? "Owned" : `🪙 ${item.Cost}`}</p>

            {item.is_equipped && (
              <span className="badge">Equipped</span>
            )}

            {!item.owned ? (
              <button onClick={() => handlePurchase(item.CosmeticID)}>
                Buy
              </button>
            ) : (
              <button onClick={() => handleEquip(item.CosmeticID)}>
                {item.is_equipped ? "Unequip" : "Equip"}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}