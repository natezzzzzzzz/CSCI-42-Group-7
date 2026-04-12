import { useContext } from "react";
import { Navigate } from "react-router-dom";
import AuthContext from "../context/AuthContext";
import { jwtDecode } from "jwt-decode";

function isTokenExpired(token) {
  try {
    const decoded = jwtDecode(token);
    // exp is in seconds, Date.now() is in milliseconds
    return decoded.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export default function ProtectedRoute({ children }) {
  const { authTokens, logoutUser } = useContext(AuthContext);

  if (!authTokens || isTokenExpired(authTokens.access)) {
    logoutUser();
    return <Navigate to="/" replace />;
  }

  return children;
}