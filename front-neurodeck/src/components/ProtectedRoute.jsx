import { useContext } from "react";
import { Navigate } from "react-router-dom";
import AuthContext from "../context/AuthContext";
import { jwtDecode } from "jwt-decode";

// This whole code is responsible for protecting routes that require authentication. It checks if the user has valid authentication tokens and if the access token is not expired. 
// If the user is not authenticated or the token is expired, it logs them out and redirects to the login page. Otherwise, it renders the protected child components.
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