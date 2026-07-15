import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import API, { setToken } from '../services/api';
import EpisodeManager from '../components/EpisodeManager';

export default function MovieForm() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    director: '',
    year: '',
    genre: '',
    posterUrl: '',
    type: searchParams.get('type') || 'movie', // Ustawiamy type z query lub 'movie'
    description: '',
    trailerUrl: '',
    duration: '', // Czas trwania w minutach
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(id ? true : false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Musisz być zalogowany');
      navigate('/login');
      return;
    }

    try {
      const decoded = jwtDecode(token);
      if (decoded.user?.role !== 'admin') {
        setError('Tylko admini mogą edytować filmy');
        setTimeout(() => navigate('/movies'), 2000);
        return;
      }
      setIsAdmin(true);

      // Pobieramy film DOPIERO jak wiemy, że użytkownik jest adminem
      if (id) {
        fetchMovie();
      }
    } catch (err) {
      setError('Nieprawidłowy token');
      navigate('/login');
    }
  }, [id, navigate]);

  const fetchMovie = useCallback(async () => {
    try {
      const res = await API.get(`/movies/${id}`);
      // Konwertuj null na empty string aby uniknąć React warning
      const movieData = {
        ...res.data,
        title: res.data.title || '',
        director: res.data.director || '',
        year: res.data.year || '',
        genre: res.data.genre || '',
        posterUrl: res.data.posterUrl || '',
        description: res.data.description || '',
        trailerUrl: res.data.trailerUrl || '',
        duration: res.data.duration || '',
      };
      setForm(movieData);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch movie:', err);
      setError('Nie udało się wczytać filmu.');
      setLoading(false);
    }
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (id) {
        await API.put(`/movies/${id}`, form);
      } else {
        await API.post('/movies', form);
      }
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.msg || 'Błąd zapisywania filmu.');
    }
  };

  if (!isAdmin) {
    return <div className="p-6 text-center text-red-600">Dostęp tylko dla adminów.</div>;
  }

  if (loading) {
    return <div className="p-6 text-center text-gray-700">Wczytywanie...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center p-6">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-2xl">
        <h1 className="text-3xl font-bold mb-6 text-center text-blue-600">
          {id ? 'Edytuj' : 'Dodaj nowy'} {form.type === 'series' ? 'serial' : 'film'}
        </h1>
        {error && <div className="bg-red-100 text-red-700 p-3 mb-4 rounded-lg border border-red-300">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              name="title"
              placeholder="Tytuł"
              value={form.title}
              onChange={handleChange}
              required
              className="col-span-1 md:col-span-2 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />

            <input
              name="director"
              placeholder="Reżyser"
              value={form.director}
              onChange={handleChange}
              className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />

            <input
              name="year"
              type="number"
              placeholder="Rok"
              value={form.year}
              onChange={handleChange}
              className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />

            <input
              name="genre"
              placeholder="Gatunek"
              value={form.genre}
              onChange={handleChange}
              className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />

            <select
              name="type"
              value={form.type}
              onChange={handleChange}
              className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="movie">Film</option>
              <option value="series">Serial</option>
            </select>

            <input
              name="posterUrl"
              placeholder="URL plakatu"
              value={form.posterUrl}
              onChange={handleChange}
              className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />

            <input
              name="duration"
              type="number"
              placeholder="Czas trwania (min)"
              value={form.duration}
              onChange={handleChange}
              className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <textarea
            name="description"
            placeholder="Opis..."
            value={form.description}
            onChange={handleChange}
            rows="4"
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          />

          <input
            name="trailerUrl"
            placeholder="URL zwiastunu (np. https://www.youtube.com/embed/xxxxx)"
            value={form.trailerUrl}
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          />

          {/* Episode Manager for Series */}
          {form.type === 'series' && id && (
            <div className="border-t-2 border-gray-200 pt-6 mt-6">
              <h2 className="text-2xl font-bold mb-4 text-blue-600">Zarządzanie odcinkami</h2>
              <EpisodeManager
                movie={form}
                isAdmin={true}
                onUpdate={fetchMovie}
                userWatchedEpisodes={[]}
              />
            </div>
          )}

          {form.type === 'series' && !id && (
            <div className="bg-blue-50 border border-blue-300 rounded-lg p-4 text-blue-700">
              💡 Najpierw dodaj serial, a potem będziesz mógł zarządzać odcinkami.
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <button
              type="submit"
              className="px-6 py-3 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 transition"
            >
              {id ? 'Zaktualizuj' : 'Dodaj'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
            >
              Anuluj
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
