import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import MainMenu from "./pages/MainMenu";
import DeckPage from "./pages/DeckPage";
import MultiplayerPage from "./pages/MultiplayerPage";
import './styles/App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/main" element={<MainMenu />} />
        <Route path="/decks" element={<DeckPage />} />
        <Route path="/multiplayer" element={<MultiplayerPage />} />
      </Routes>
    </Router>
  );
}

export default App;