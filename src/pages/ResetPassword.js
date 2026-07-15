import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import API from '../services/api';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function ResetPassword() {
  const query = useQuery();
  const navigate = useNavigate();

  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const t = query.get('token');
    if (t) setToken(t);
  }, [query]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      await API.post('/users/reset', { token, password });
      setMessage('Hasło zostało zmienione. Możesz się zalogować.');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setError(err.response?.data?.msg || 'Nie udało się zresetować hasła');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-500 to-emerald-600">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
        <h2 className="text-3xl font-bold mb-6 text-center text-emerald-600">Ustaw nowe hasło</h2>
        {error && <div className="bg-red-100 text-red-700 p-3 mb-4 rounded-lg border border-red-300">{error}</div>}
        {message && <div className="bg-green-100 text-green-700 p-3 mb-4 rounded-lg border border-green-300">{message}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Token resetujący"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
          <input
            type="password"
            placeholder="Nowe hasło (min 6 znaków)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
          <button type="submit" className="w-full bg-emerald-500 text-white p-3 rounded-lg font-bold hover:bg-emerald-600 transition">
            Zapisz nowe hasło
          </button>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full border border-gray-300 text-gray-700 p-3 rounded-lg font-semibold hover:bg-gray-50"
          >
            Powrót do logowania
          </button>
        </form>
      </div>
    </div>
  );
}
