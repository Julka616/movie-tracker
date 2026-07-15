import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../services/api';

export default function AdminRegister({ setToken }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', adminKey: '' });
  const [error, setError] = useState('');
  const [showAdminForm, setShowAdminForm] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await API.post('/users/admin-register', form);
      setToken(res.data.token);
      localStorage.setItem('token', res.data.token);
      navigate('/movies');
    } catch (err) {
      setError(err.response?.data?.msg || 'Błąd rejestracji admina');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-500 to-pink-600">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
        {!showAdminForm ? (
          <>
            <h2 className="text-3xl font-bold mb-6 text-center text-purple-600">Rejestracja</h2>
            <p className="text-center text-gray-600 mb-4">
              Chcesz się zarejestrować jako admin?{' '}
              <button
                onClick={() => setShowAdminForm(true)}
                className="text-purple-600 font-semibold hover:underline"
              >
                Kliknij tutaj
              </button>
            </p>
            <p className="text-center text-gray-600 mt-4">
              Masz już konto?{' '}
              <Link to="/login" className="text-purple-600 font-semibold hover:underline">
                Zaloguj się
              </Link>
            </p>
          </>
        ) : (
          <>
            <h2 className="text-3xl font-bold mb-6 text-center text-purple-600">Rejestracja Admina</h2>
            {error && <div className="bg-red-100 text-red-700 p-3 mb-4 rounded-lg border border-red-300">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                name="name"
                placeholder="Imię i nazwisko"
                type="text"
                value={form.name}
                onChange={handleChange}
                required
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              <input
                name="email"
                placeholder="Email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              <input
                name="password"
                placeholder="Hasło"
                type="password"
                value={form.password}
                onChange={handleChange}
                required
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              <input
                name="adminKey"
                placeholder="Klucz admina"
                type="password"
                value={form.adminKey}
                onChange={handleChange}
                required
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              <button
                type="submit"
                className="w-full bg-purple-500 text-white p-3 rounded-lg font-bold hover:bg-purple-600 transition"
              >
                Utwórz konto admina
              </button>
              <button
                type="button"
                onClick={() => setShowAdminForm(false)}
                className="w-full border border-gray-300 text-gray-700 p-3 rounded-lg font-semibold hover:bg-gray-50 transition"
              >
                Wróć
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
