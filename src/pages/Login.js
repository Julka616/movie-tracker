import React, { useState } from "react";
import API from "../services/api";
import { Link, useNavigate } from "react-router-dom";

export default function Login({ setToken }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await API.post("/users/login", form);
      setToken(res.data.token);
      navigate('/movies');
    } catch (err) {
      setError(err.response?.data?.msg || "Błąd logowania");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-500 to-indigo-600">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
        <h2 className="text-3xl font-bold mb-6 text-center text-blue-600">🎬 Logowanie</h2>
        {error && <div className="bg-red-100 text-red-700 p-3 mb-4 rounded-lg border border-red-300">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            name="email"
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />
          <input
            name="password"
            placeholder="Hasło"
            type="password"
            value={form.password}
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />
          <div className="text-right text-sm">
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="text-blue-500 font-semibold hover:underline"
            >
              Nie pamiętam hasła
            </button>
          </div>
          <button className="w-full bg-blue-500 text-white p-3 rounded-lg font-bold hover:bg-blue-600 transition">Zaloguj się</button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-700">
          Nie masz konta? <Link to="/register" className="text-blue-500 font-semibold hover:underline">Zarejestruj się</Link>
        </p>
      </div>
    </div>
  );
}
