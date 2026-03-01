import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import DeckPage from "./pages/DeckPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<DeckPage />} />
      </Routes>
    </Router>
  );
}

export default App;