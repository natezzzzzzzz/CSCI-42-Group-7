import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchCosmeticShop, purchaseCosmetic, equipCosmetic } from "../api/deckApi";

const TYPE_ICONS = { Hat: "🎩", Shirt: "👕", Pants: "👖", Glasses: "🕶️", Shoes: "👟" };

export default function CosmeticsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState("");

  useEffect(() => {
    fetchCosmeticShop()
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const flash = (msg) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(""), 2500);
  };

  const handlePurchase = async (cosmeticId) => {
    try {
      const res = await purchaseCosmetic(cosmeticId);
      setItems((prev) =>
        prev.map((i) => i.CosmeticID === cosmeticId ? { ...i, owned: true } : i)
      );
      flash(res.message);
    } catch (e) {
      flash(e.message || "Purchase failed.");
    }
  };

  const handleEquip = async (cosmeticId, itemType) => {
    try {
      const res = await equipCosmetic(cosmeticId);
      setItems((prev) =>
        prev.map((i) => {
          if (i.ItemType === itemType) return { ...i, is_equipped: false };
          return i;
        }).map((i) =>
          i.CosmeticID === cosmeticId ? { ...i, is_equipped: res.is_equipped } : i
        )
      );
      flash(res.is_equipped ? "Equipped!" : "Unequipped.");
    } catch (e) {
      flash(e.message || "Failed to equip.");
    }
  };

  const types = ["All", ...new Set(items.map((i) => i.ItemType))];
  const displayed = filter === "All" ? items : items.filter((i) => i.ItemType === filter);
  const equipped = items.filter((i) => i.is_equipped);

  if (loading) return <div className="ach-loading">Loading shop...</div>;

  return (
    <div className="csm-page">

      {/* Header */}
      <div className="an-header">
        <button className="mp-back-btn" onClick={() => navigate("/main")}>
          Back to Menu
        </button>
        <h1 className="h4">Cosmetics Shop</h1>
      </div>

      {actionMsg && <div className="csm-toast">{actionMsg}</div>}

      {/* Currently Equipped */}
      <div className="csm-equipped-section">
        <p className="csm-section-label">Currently Equipped</p>
        {equipped.length === 0 ? (
          <p className="mp-empty">Nothing equipped yet.</p>
        ) : (
          <div className="csm-equipped-row">
            {equipped.map((i) => (
              <div key={i.CosmeticID} className="csm-equipped-chip">
                <span>{TYPE_ICONS[i.ItemType] ?? "🎁"}</span>
                <span>{i.ItemName}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Type filter tabs */}
      <div className="ach-filters">
        {types.map((t) => (
          <button
            key={t}
            className={`ach-filter-btn ${filter === t ? "active" : ""}`}
            onClick={() => setFilter(t)}
          >
            {TYPE_ICONS[t] ?? ""} {t}
          </button>
        ))}
      </div>

      {/* Item grid */}
      <div className="csm-grid">
        {displayed.map((item) => (
          <div
            key={item.CosmeticID}
            className={`csm-card ${item.owned ? "csm-owned" : ""} ${item.is_equipped ? "csm-equipped" : ""}`}
          >
            <div className="csm-card-icon">
              {TYPE_ICONS[item.ItemType] ?? "🎁"}
            </div>
            <div className="csm-card-name">{item.ItemName}</div>
            <div className="csm-card-type">{item.ItemType}</div>
            <div className="csm-card-cost">
              {item.owned ? (
                <span className="csm-owned-badge">Owned</span>
              ) : (
                <span className="csm-cost">🪙 {item.Cost}</span>
              )}
            </div>

            {item.is_equipped && (
              <span className="csm-equipped-badge">Equipped</span>
            )}

            <div className="csm-card-actions">
              {!item.owned ? (
                <button
                  className="mp-btn mp-btn-primary"
                  onClick={() => handlePurchase(item.CosmeticID)}
                >
                  Buy
                </button>
              ) : (
                <button
                  className={`mp-btn ${item.is_equipped ? "mp-btn-ghost" : "mp-btn-secondary"}`}
                  onClick={() => handleEquip(item.CosmeticID, item.ItemType)}
                >
                  {item.is_equipped ? "Unequip" : "Equip"}
                </button>
              )}
            </div>
          </div>
        ))}

        {displayed.length === 0 && (
          <p className="mp-empty">No items in this category.</p>
        )}
      </div>
    </div>
  );
}