import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from './context/AuthContext'
import './styles/index.css'
import App from './App.jsx'

// This is the main entry point of the React application. It wraps the entire app in the AuthProvider 
// to provide authentication context to all components, and renders the App component which contains the routing logic for the application.

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
)