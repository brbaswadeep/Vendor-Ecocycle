import React from 'react';
import { APILoader } from '@googlemaps/extended-component-library/react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Requests from './pages/Requests';
import Earnings from './pages/Earnings';
import Messages from './pages/Messages';
import MyProducts from './pages/MyProducts';
import EcoWaste from './pages/EcoWaste';
import Layout from './components/Layout';
import EcoBot from './components/EcoBot';

function PrivateRoute({ children }) {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Navigate to="/" />;
  }

  return children;
}

function App() {
  const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  return (
    <AuthProvider>
      <APILoader apiKey={GOOGLE_MAPS_API_KEY} solutionChannel="GMP_GE_mapsandplacesautocomplete_v2" />
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
// ... (rest of routes)

          {/* Protected Routes wrapped in Layout */}
          <Route element={<Layout />}>
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              }
            />
            <Route
              path="/requests"
              element={
                <PrivateRoute>
                  <Requests />
                </PrivateRoute>
              }
            />
            <Route
              path="/earnings"
              element={
                <PrivateRoute>
                  <Earnings />
                </PrivateRoute>
              }
            />
            <Route
              path="/messages"
              element={
                <PrivateRoute>
                  <Messages />
                </PrivateRoute>
              }
            />
            <Route
              path="/messages"
              element={
                <PrivateRoute>
                  <Messages />
                </PrivateRoute>
              }
            />
            <Route
              path="/products"
              element={
                <PrivateRoute>
                  <MyProducts />
                </PrivateRoute>
              }
            />
            <Route
              path="/ecowaste"
              element={
                <PrivateRoute>
                  <EcoWaste />
                </PrivateRoute>
              }
            />
          </Route>

        </Routes>
        <EcoBot />
      </Router>
    </AuthProvider>
  );
}

export default App;
