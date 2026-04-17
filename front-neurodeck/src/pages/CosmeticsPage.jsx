import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchCosmeticShop, purchaseCosmetic, equipCosmetic } from "../api/deckApi";
import DashboardLayout from "../components/DashboardLayout";

export default function CosmeticsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  useEffect(() => {
    fetchCosmeticShop().then(setItems).finally(() => setLoading(false));
  }, []);

  const flash = (text) => {
    setToast(text);
    setTimeout(() => setToast(""), 2500);
  };

  const handlePurchase = async (id) => {
    try {
      const res = await purchaseCosmetic(id);
      setItems(prev => prev.map(i => i.CosmeticID === id ? { ...i, owned: true } : i));
      flash(res.message || "Purchased!");
    } catch {
      flash("Purchase failed.");
    }
  };

  const handleEquip = async (id) => {
    try {
      const res = await equipCosmetic(id);
      setItems(prev => prev.map(i => ({
        ...i,
        is_equipped: i.CosmeticID === id ? res.is_equipped : false,
      })));
      flash(res.is_equipped ? "Equipped!" : "Unequipped!");
    } catch {
      flash("Equip failed.");
    }
  };

  return (
    <DashboardLayout>
      <div className="db-content-header">
        <h1 className="db-page-title">Cosmetics Shop</h1>
        <button className="db-new-btn" onClick={() => navigate("/profile")}>My Profile</button>
      </div>

      {loading ? (
        <div className="lp-loading">Loading shop...</div>
      ) : items.length === 0 ? (
        <p className="db-empty">No items available in the shop.</p>
      ) : (
        <div className="csm-lp-grid">
          {items.map(item => (
            <div key={item.CosmeticID} className={`csm-lp-card${item.is_equipped ? " csm-lp-equipped" : item.owned ? " csm-lp-owned" : ""}`}>
              {item.is_equipped && <span className="csm-lp-badge">Equipped</span>}
              <div className="csm-lp-img-wrap">
                <img
                  src={`http://127.0.0.1:8000${item.Image}`}
                  alt={item.ItemName}
                  className="csm-lp-img"
                />
              </div>
              <div className="csm-lp-info">
                <p className="csm-lp-name">{item.ItemName}</p>
                <p className="csm-lp-type">{item.ItemType || "Cosmetic"}</p>
              </div>
              <div className="csm-lp-footer">
                {item.owned ? (
                  <button
                    className={`csm-lp-btn${item.is_equipped ? " csm-lp-btn-unequip" : " csm-lp-btn-equip"}`}
                    onClick={() => handleEquip(item.CosmeticID)}
                  >
                    {item.is_equipped ? "Unequip" : "Equip"}
                  </button>
                ) : (
                  <button className="csm-lp-btn csm-lp-btn-buy" onClick={() => handlePurchase(item.CosmeticID)}>
                    <span className="csm-lp-coin">🪙</span> {item.Cost}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && <div className="lp-toast">{toast}</div>}
    </DashboardLayout>
  );
}
