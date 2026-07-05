// App.jsx (Conceptual - Adjust to your actual main file)

import React from 'react';
import DashboardLayout from './layouts/DashboardLayout.jsx';
import Login from './pages/Login.jsx';
import { useAuth } from './context/AuthContext.jsx';
// import { UIProvider } from './context/UIContext.jsx'; // Removed

export default function App() {
  const { user } = useAuth();

  // Use the isAuthenticated status to switch between Login and Dashboard
  if (!user || !user.isAuthenticated) {
    return <Login />;
  }

  // Show the full dashboard layout if authenticated
  // Wrap in UIProvider for customization context
  return (
    <DashboardLayout />
  );
}