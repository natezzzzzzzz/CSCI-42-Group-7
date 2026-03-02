import { useEffect, useState } from 'react'
// import AuthContext from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import MainMenu from "./pages/MainMenu";
import './styles/App.css';

function App() {
  const [page, setPage] = useState("login");

  const renderPage = () => {
    switch (page) {
      case "login":
        return <LoginPage setPage={setPage} />;
      case "register":
        return <RegisterPage setPage={setPage} />;
      case "main":
        return <MainMenu setPage={setPage} />;
      default:
        return <LoginPage setPage={setPage} />;
    }
  };

  return <div>{renderPage()}</div>;
}

export default App
