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
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <AchievementNotificationProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/main" element={
            <ProtectedRoute><MainMenu /></ProtectedRoute>
          } />
          <Route path="/decks" element={
            <ProtectedRoute><DeckPage /></ProtectedRoute>
          } />
          <Route path="/multiplayer" element={
            <ProtectedRoute><MultiplayerPage /></ProtectedRoute>
          } />
          <Route path="/solo/:deckId" element={
            <ProtectedRoute><SoloGamePage /></ProtectedRoute>
          } />
          <Route path="/achievements" element={
            <ProtectedRoute><AchievementsPage /></ProtectedRoute>
          } />
          <Route path="/analytics" element={
            <ProtectedRoute><AnalyticsPage /></ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AchievementNotificationProvider>
  );
}

export default App;