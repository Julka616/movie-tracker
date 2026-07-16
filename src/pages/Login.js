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
      setError(err.response?.data?.msg || "Blad logowania");
    }
  };

  return (
    <div className="min-h-screen bg-ink text-paper font-body flex items-center justify-center px-4 relative">
      <div className="film-grain" />
      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-6">
          <span className="text-marquee text-2xl">&#9679;</span>
          <h1 className="font-display text-4xl tracking-wide text-marquee mt-1">WEJSCIOWKA</h1>
          <p className="font-mono text-xs text-paper/50 mt-1 uppercase tracking-widest">Zaloguj sie, aby wejsc na seans</p>
        </div>

        <div className="bg-stage border border-reel rounded-lg p-6">
          {error && (
            <div className="mb-4 px-3 py-2 rounded-md border border-velvet text-velvet font-mono text-xs">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              name="email"
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={handleChange}
              className="w-full px-3 py-2.5 rounded-md bg-ink border border-reel text-paper placeholder-paper/40 font-mono text-sm outline-none focus:border-marquee transition-colors"
              required
            />
            <input
              name="password"
              placeholder="Haslo"
              type="password"
              value={form.password}
              onChange={handleChange}
              className="w-full px-3 py-2.5 rounded-md bg-ink border border-reel text-paper placeholder-paper/40 font-mono text-sm outline-none focus:border-marquee transition-colors"
              required
            />
            <div className="text-right">
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="font-mono text-[11px] text-paper/50 hover:text-marquee transition-colors"
              >
                Nie pamietam hasla
              </button>
            </div>
            <button className="w-full py-2.5 rounded-md bg-marquee text-ink font-mono text-xs uppercase tracking-wider font-semibold hover:bg-marquee2 transition-colors">
              Zaloguj sie
            </button>
          </form>
          <p className="mt-5 text-center font-mono text-xs text-paper/50">
            Nie masz konta? <Link to="/register" className="text-marquee hover:underline">Zarejestruj sie</Link>
          </p>
        </div>
      </div>
    </div>
  );
}