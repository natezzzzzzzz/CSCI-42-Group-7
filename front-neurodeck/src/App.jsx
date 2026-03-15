import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import MainMenu from "./pages/MainMenu";
import SoloGamePage from "./pages/SoloGamePage";
import DeckPage from "./pages/DeckPage";
import './styles/App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/main" element={<MainMenu />} />
        <Route path="/decks/:deckId/study" element={<SoloGamePage />} />
        <Route path="/decks" element={<DeckPage />} />
      </Routes>
    </Router>
  );
}

export default App;
