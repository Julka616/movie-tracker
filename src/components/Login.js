import React, { useState } from 'react';
import API, { setToken } from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function Login({ setToken: setAppToken }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    try {
      const res = await API.post('/users/login', form);
      setToken(res.data.token);
      setAppToken(res.data.token);
      localStorage.setItem('token', res.data.token);
      navigate('/movies');
    } catch (err) {
      setError(err.response?.data?.msg || 'Błąd logowania');
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Logowanie</h2>
        {error && <p className="mb-4 text-red-600">{error}</p>}
        <input
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          className="w-full mb-4 p-2 border rounded"
        />
        <input
          type="password"
          name="password"
          placeholder="Hasło"
          value={form.password}
          onChange={handleChange}
          className="w-full mb-4 p-2 border rounded"
        />
        <button
          type="submit"
          className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition"
        >
          Logowanie
        </button>
      </form>
    </div>
  );
}
