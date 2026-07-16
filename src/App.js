import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Register from "./pages/Register";
import Login from "./pages/Login";
import AdminRegister from "./pages/AdminRegister";
import AdminPanel from "./pages/AdminPanel";
import Movies from "./pages/Movies";
import MovieDetails from "./pages/MovieDetails";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import MovieForm from "./pages/MovieForm";
import Profile from "./pages/Profile";
import Stats from "./pages/Stats";
import { setToken as setAPIToken } from "./services/api";

function App() {
  const [token, setTokenState] = useState(localStorage.getItem("token"));
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : false;
  });

  const handleDarkMode = (value) => {
    setDarkMode(value);
    localStorage.setItem("darkMode", JSON.stringify(value));
  };

  const handleSetToken = (t) => {
    if (t) {
      // Ustawiamy token w localStorage
      localStorage.setItem("token", t);
      // Ustawiamy token w API headers
      setAPIToken(t);
      // Ustawiamy token w state
      setTokenState(t);
    } else {
      // Usuwamy token
      localStorage.removeItem("token");
      setAPIToken(null);
      setTokenState(null);
    }
  };

  useEffect(() => {
    // Przy każdej zmianie tokenu, ustawiamy go w API headers
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      setAPIToken(storedToken);
      setTokenState(storedToken);
    }
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Movies darkMode={darkMode} setDarkMode={handleDarkMode} />} />
        <Route path="/movies" element={<Movies darkMode={darkMode} setDarkMode={handleDarkMode} />} />
        <Route path="/movies/:id" element={<MovieDetails />} />
        <Route path="/movies/add" element={<MovieForm />} />
        <Route path="/movies/:id/edit" element={<MovieForm />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/admin" element={<AdminPanel />} />
        {!token ? (
          <>
            <Route path="/register" element={<Register setToken={handleSetToken} />} />
            <Route path="/admin-register" element={<AdminRegister setToken={handleSetToken} />} />
            <Route path="/login" element={<Login setToken={handleSetToken} />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </>
        ) : null}
        <Route path="*" element={<Navigate to={token ? "/movies" : "/"} />} />
      </Routes>
    </Router>
  );
}

export default App;
