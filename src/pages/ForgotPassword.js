import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [token, setToken] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setToken('');
    try {
      const res = await API.post('/users/forgot', { email });
      setMessage('Link resetujący został wygenerowany. Sprawdź konsolę serwera lub użyj tokenu poniżej.');
      if (res.data?.resetToken) setToken(res.data.resetToken);
    } catch (err) {
      setError(err.response?.data?.msg || 'Błąd resetu hasła');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-blue-600">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
        <h2 className="text-3xl font-bold mb-6 text-center text-blue-600">Zapomniałeś hasła</h2>
        {error && <div className="bg-red-100 text-red-700 p-3 mb-4 rounded-lg border border-red-300">{error}</div>}
        {message && <div className="bg-green-100 text-green-700 p-3 mb-4 rounded-lg border border-green-300">{message}</div>}
        {token && (
          <div className="bg-gray-100 text-gray-800 p-3 mb-4 rounded border border-gray-200">
            <p className="text-sm font-semibold">Reset token:</p>
            <p className="font-mono break-all">{token}</p>
            <button
              onClick={() => navigate(`/reset-password?token=${token}`)}
              className="mt-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Przejdź do resetowania hasła
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button type="submit" className="w-full bg-blue-500 text-white p-3 rounded-lg font-bold hover:bg-blue-600 transition">
            Wyślij link resetujący
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
