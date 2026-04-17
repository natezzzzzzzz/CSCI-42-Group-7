import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchCosmeticShop, purchaseCosmetic, equipCosmetic } from "../api/deckApi";
import DashboardLayout from "../components/DashboardLayout";

const RARITY_COLORS = {
  common:    { text: "#64748b", bg: "#f1f5f9" },
  rare:      { text: "#1d4ed8", bg: "#eff6ff" },
  epic:      { text: "#7c3aed", bg: "#f5f3ff" },
  legendary: { text: "#b45309", bg: "#fffbeb" },
};

export default function CosmeticsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [currency, setCurrency] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ text: "", ok: true });

  useEffect(() => {
    fetchCosmeticShop()
      .then(res => {
        setItems(res.items || res);
        if (res.currency !== undefined) setCurrency(res.currency);
      })
      .finally(() => setLoading(false));
  }, []);

  const flash = (text, ok = true) => {
    setToast({ text, ok });
    setTimeout(() => setToast({ text: "", ok: true }), 2500);
  };

  const handlePurchase = async (id) => {
    try {
      const res = await purchaseCosmetic(id);
      setItems(prev => prev.map(i => i.CosmeticID === id ? { ...i, owned: true } : i));
      if (res.currency !== undefined) setCurrency(res.currency);
      flash(res.message || "Purchased!");
    } catch (err) {
      flash(err?.message || "Purchase failed — not enough coins.", false);
    }
  };

  const handleEquip = async (id) => {
    try {
      const res = await equipCosmetic(id);
      setItems(prev => prev.map(i => ({
        ...i,
        equipped: i.CosmeticID === id ? res.equipped : (res.equipped ? false : i.equipped),
      })));
      flash(res.equipped ? "Equipped!" : "Unequipped!");
    } catch {
      flash("Equip failed.", false);
    }
  };

  return (
    <DashboardLayout>
      <div className="db-content-header">
        <h1 className="db-page-title">Cosmetics Shop</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span className="csm-currency-badge">
            🪙 <strong>{currency}</strong> coins
          </span>
          <button className="db-new-btn" onClick={() => navigate("/profile")}>My Profile</button>
        </div>
      </div>

      <p style={{ fontSize: "0.82rem", color: "#888", margin: "0 0 1.1rem" }}>
        Earn coins by unlocking achievements. Each achievement awards its point value as coins.
      </p>

      {loading ? (
        <div className="lp-loading">Loading shop...</div>
      ) : items.length === 0 ? (
        <p className="db-empty">No items available in the shop.</p>
      ) : (
        <div className="csm-lp-grid">
          {items.map(item => {
            const rarity = RARITY_COLORS[item.Rarity] || RARITY_COLORS.common;
            return (
              <div
                key={item.CosmeticID}
                className={`csm-lp-card${item.equipped ? " csm-lp-equipped" : item.owned ? " csm-lp-owned" : ""}`}
              >
                {item.equipped && <span className="csm-lp-badge">Equipped</span>}
                <div className="csm-lp-img-wrap">
                  <img
                    src={`http://127.0.0.1:8000${item.Image}`}
                    alt={item.ItemName}
                    className="csm-lp-img"
                  />
                </div>
                <div className="csm-lp-info">
                  <p className="csm-lp-name">{item.ItemName}</p>
                  <p
                    className="csm-lp-type"
                    style={{ color: rarity.text, background: rarity.bg, display: "inline-block", padding: "0.1rem 0.4rem", borderRadius: 99, fontSize: "0.72rem", fontWeight: 600, textTransform: "capitalize" }}
                  >
                    {item.Rarity || "Common"}
                  </p>
                </div>
                <div className="csm-lp-footer">
                  {item.owned ? (
                    <button
                      className={`csm-lp-btn${item.equipped ? " csm-lp-btn-unequip" : " csm-lp-btn-equip"}`}
                      onClick={() => handleEquip(item.CosmeticID)}
                    >
                      {item.equipped ? "Unequip" : "Equip"}
                    </button>
                  ) : (
                    <button
                      className="csm-lp-btn csm-lp-btn-buy"
                      onClick={() => handlePurchase(item.CosmeticID)}
                      disabled={currency < item.Cost}
                      title={currency < item.Cost ? "Not enough coins" : `Buy for ${item.Cost} coins`}
                    >
                      <span className="csm-lp-coin">🪙</span> {item.Cost}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {toast.text && (
        <div className={`lp-toast${toast.ok ? "" : " lp-toast-error"}`}>{toast.text}</div>
      )}
    </DashboardLayout>
  );
}
