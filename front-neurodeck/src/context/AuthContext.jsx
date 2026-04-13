import { createContext, useState } from "react";
import { jwtDecode } from "jwt-decode";

const AuthContext = createContext();
export default AuthContext;

export const AuthProvider = ({ children }) => {
  const [authTokens, setAuthTokens] = useState(() => {
    const access = localStorage.getItem("access");
    const refresh = localStorage.getItem("refresh");
    return access ? { access, refresh } : null;
  });

  const [user, setUser] = useState(() => {
    const access = localStorage.getItem("access");
    try {
      return access ? jwtDecode(access) : null;
    } catch {
      return null;
    }
  });

  const loginUser = async (email, password) => {
    const response = await fetch("http://127.0.0.1:8000/api/token/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (response.status === 200) {
      localStorage.setItem("access", data.access);
      localStorage.setItem("refresh", data.refresh);
      setAuthTokens({ access: data.access, refresh: data.refresh });
      setUser(jwtDecode(data.access));
      return true;
    } else {
      alert("Login failed");
      return false;
    }
  };

  const logoutUser = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    setAuthTokens(null);
    setUser(null);
  };

  const contextData = {
    user,
    authTokens,
    loginUser,
    logoutUser,
  };

  return (
    <AuthContext.Provider value={contextData}>
      {children}
    </AuthContext.Provider>
  );
};