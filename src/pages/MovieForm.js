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

  // --- TMDB import ---
  const [tmdbQuery, setTmdbQuery] = useState('');
  const [tmdbResults, setTmdbResults] = useState([]);
  const [tmdbSearching, setTmdbSearching] = useState(false);
  const [tmdbImporting, setTmdbImporting] = useState(false);
  const [tmdbError, setTmdbError] = useState('');
  // --- TMDB episode import (for existing series) ---
  const [episodeQuery, setEpisodeQuery] = useState('');
  const [episodeResults, setEpisodeResults] = useState([]);
  const [episodeSearching, setEpisodeSearching] = useState(false);
  const [episodeImporting, setEpisodeImporting] = useState(false);
  const [episodeImportMsg, setEpisodeImportMsg] = useState('');

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

  const handleTmdbSearch = async (e) => {
    e.preventDefault();
    if (!tmdbQuery.trim()) return;
    setTmdbSearching(true);
    setTmdbError('');
    try {
      const tmdbType = form.type === 'series' ? 'tv' : 'movie';
      const res = await API.get('/tmdb/search', { params: { query: tmdbQuery, type: tmdbType } });
      setTmdbResults(res.data);
    } catch (err) {
      setTmdbError(err.response?.data?.msg || 'Nie udało się wyszukać w TMDB.');
      setTmdbResults([]);
    } finally {
      setTmdbSearching(false);
    }
  };

  const handleTmdbImport = async (result) => {
    setTmdbImporting(true);
    setTmdbError('');
    try {
      const tmdbType = result.mediaType === 'tv' ? 'tv' : 'movie';
      const res = await API.get(`/tmdb/details/${tmdbType}/${result.tmdbId}`);
      const d = res.data;
      setForm((prev) => ({
        ...prev,
        title: d.title || prev.title,
        director: d.director || prev.director,
        year: d.year || prev.year,
        genre: d.genre || prev.genre,
        posterUrl: d.posterUrl || prev.posterUrl,
        description: d.description || prev.description,
        trailerUrl: d.trailerUrl || prev.trailerUrl,
        duration: d.duration || prev.duration,
        type: d.type || prev.type,
      }));
      setTmdbResults([]);
      setTmdbQuery('');
    } catch (err) {
      setTmdbError(err.response?.data?.msg || 'Nie udało się pobrać danych z TMDB.');
    } finally {
      setTmdbImporting(false);
    }
  };

  const handleEpisodeSearch = async (e) => {
    e.preventDefault();
    if (!episodeQuery.trim()) return;
    setEpisodeSearching(true);
    setEpisodeImportMsg('');
    try {
      const res = await API.get('/tmdb/search', { params: { query: episodeQuery, type: 'tv' } });
      setEpisodeResults(res.data);
    } catch (err) {
      setEpisodeImportMsg(err.response?.data?.msg || 'Nie udało się wyszukać w TMDB.');
      setEpisodeResults([]);
    } finally {
      setEpisodeSearching(false);
    }
  };

  const handleImportEpisodes = async (tmdbId) => {
    setEpisodeImporting(true);
    setEpisodeImportMsg('');
    try {
      const res = await API.post(`/movies/${id}/import-episodes`, { tmdbId });
      setEpisodeImportMsg(`Zaimportowano ${res.data.addedCount} nowych odcinków.`);
      setEpisodeResults([]);
      setEpisodeQuery('');
      fetchMovie();
    } catch (err) {
      setEpisodeImportMsg(err.response?.data?.msg || 'Nie udało się zaimportować odcinków.');
    } finally {
      setEpisodeImporting(false);
    }
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

        <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
          <h2 className="text-sm font-bold text-indigo-700 uppercase tracking-wide mb-2">
            Zaimportuj dane z TMDB
          </h2>
          <p className="text-xs text-indigo-500 mb-3">
            Wyszukaj tytuł, a plakat, opis, rok, gatunek, reżysera i zwiastun uzupełnimy automatycznie.
          </p>
          <form onSubmit={handleTmdbSearch} className="flex gap-2">
            <input
              type="text"
              placeholder={`Szukaj ${form.type === 'series' ? 'serialu' : 'filmu'} w TMDB...`}
              value={tmdbQuery}
              onChange={(e) => setTmdbQuery(e.target.value)}
              className="flex-1 p-3 border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button
              type="submit"
              disabled={tmdbSearching}
              className="px-5 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {tmdbSearching ? 'Szukam...' : 'Szukaj'}
            </button>
          </form>

          {tmdbError && (
            <div className="mt-3 text-sm text-red-600">{tmdbError}</div>
          )}

          {tmdbResults.length > 0 && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {tmdbResults.map((r) => (
                <button
                  type="button"
                  key={r.tmdbId}
                  onClick={() => handleTmdbImport(r)}
                  disabled={tmdbImporting}
                  className="text-left bg-white border border-indigo-200 rounded-lg overflow-hidden hover:shadow-lg hover:border-indigo-400 transition disabled:opacity-50"
                >
                  <img
                    src={r.posterUrl || 'https://via.placeholder.com/200x300?text=Brak+plakatu'}
                    alt={r.title}
                    className="w-full h-40 object-cover"
                  />
                  <div className="p-2">
                    <div className="text-xs font-semibold text-gray-800 truncate">{r.title}</div>
                    <div className="text-[11px] text-gray-500">{r.year || '—'}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

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

            <select
              name="year"
              value={form.year}
              onChange={handleChange}
              className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Wybierz rok</option>
              {Array.from({ length: new Date().getFullYear() + 1 - 1900 }, (_, i) => new Date().getFullYear() + 1 - i).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

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
              <div className="mb-6 p-4 bg-cyan-50 border border-cyan-200 rounded-lg">
                <h2 className="text-sm font-bold text-cyan-700 uppercase tracking-wide mb-2">
                  Zaimportuj sezony i odcinki z TMDB
                </h2>
                <p className="text-xs text-cyan-600 mb-3">
                  Wyszukaj ten serial w TMDB, żeby jednym kliknięciem dodać wszystkie sezony i odcinki.
                </p>
                <form onSubmit={handleEpisodeSearch} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Szukaj serialu w TMDB..."
                    value={episodeQuery}
                    onChange={(e) => setEpisodeQuery(e.target.value)}
                    className="flex-1 p-3 border border-cyan-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  />
                  <button
                    type="submit"
                    disabled={episodeSearching}
                    className="px-5 py-3 bg-cyan-600 text-white rounded-lg font-semibold hover:bg-cyan-700 transition disabled:opacity-50"
                  >
                    {episodeSearching ? 'Szukam...' : 'Szukaj'}
                  </button>
                </form>

                {episodeImportMsg && (
                  <div className="mt-3 text-sm text-cyan-700 font-semibold">{episodeImportMsg}</div>
                )}

                {episodeResults.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {episodeResults.map((r) => (
                      <button
                        type="button"
                        key={r.tmdbId}
                        onClick={() => handleImportEpisodes(r.tmdbId)}
                        disabled={episodeImporting}
                        className="text-left bg-white border border-cyan-200 rounded-lg overflow-hidden hover:shadow-lg hover:border-cyan-400 transition disabled:opacity-50"
                      >
                        <img
                          src={r.posterUrl || 'https://via.placeholder.com/200x300?text=Brak+plakatu'}
                          alt={r.title}
                          className="w-full h-40 object-cover"
                        />
                        <div className="p-2">
                          <div className="text-xs font-semibold text-gray-800 truncate">{r.title}</div>
                          <div className="text-[11px] text-gray-500">{r.year || '—'}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

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