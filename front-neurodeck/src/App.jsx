import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import MainMenu from "./pages/MainMenu";
import DeckPage from "./pages/DeckPage";
import MultiplayerPage from "./pages/MultiplayerPage";
import { AchievementNotificationProvider } from "./components/AchievementToast";
import './styles/App.css';
import SoloGamePage from "./pages/SoloGamePage";
import AchievementsPage from "./pages/AchievementsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import CosmeticsPage from "./pages/CosmeticsPage";
import ProfilePage from "./pages/ProfilePage";

function App() {
  return (
    <AchievementNotificationProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/main" element={<MainMenu />} />
          <Route path="/decks" element={<DeckPage />} />
          <Route path="/multiplayer" element={<MultiplayerPage />} />
          <Route path="/solo/:deckId" element={<SoloGamePage />} />
          <Route path="/achievements" element={<AchievementsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/shop" element={<CosmeticsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </Router>
    </AchievementNotificationProvider>
  );
}

export default App;