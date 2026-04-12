import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import MainMenu from "./pages/MainMenu";
import DeckPage from "./pages/DeckPage";
import MultiplayerPage from "./pages/MultiplayerPage";
import { AchievementNotificationProvider } from "./components/AchievementToast";
import SoloGamePage from "./pages/SoloGamePage";
import AchievementsPage from "./pages/AchievementsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import NotFoundPage from "./pages/NotFoundPage";
import PrivateRoute from "./components/PrivateRoute";

function App() {
  return (
    <AchievementNotificationProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/main" element={<PrivateRoute><MainMenu /></PrivateRoute>} />
          <Route path="/decks" element={<PrivateRoute><DeckPage /></PrivateRoute>} />
          <Route path="/multiplayer" element={<PrivateRoute><MultiplayerPage /></PrivateRoute>} />
          <Route path="/solo/:deckId" element={<PrivateRoute><SoloGamePage /></PrivateRoute>} />
          <Route path="/achievements" element={<PrivateRoute><AchievementsPage /></PrivateRoute>} />
          <Route path="/analytics" element={<PrivateRoute><AnalyticsPage /></PrivateRoute>} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Router>
    </AchievementNotificationProvider>
  );
}

export default App;