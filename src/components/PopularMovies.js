import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';

export default function PopularMovies({ type, darkMode }) {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState('added'); // 'added' | 'rating'
  const navigate = useNavigate();

  useEffect(() => {
    fetchPopular();
  }, [type, sortBy]);

  const fetchPopular = async () => {
    setLoading(true);
    try {
      const res = await API.get('/movies/popular', {
        params: { type, sortBy },
      });
      setMovies(res.data);
    } catch (err) {
      console.error('Failed to fetch popular movies:', err);
    } finally {
      setLoading(false);
    }
  };

  const title = type === 'series' ? 'Najpopularniejsze Seriale' : 'Najpopularniejsze Filmy';

  return (
    <div className={darkMode ? 'bg-gradient-to-r from-purple-800 via-indigo-800 to-blue-900 p-6 rounded-lg mb-8' : 'bg-gradient-to-r from-purple-200 via-indigo-200 to-blue-200 p-6 rounded-lg mb-8'}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">{title}</h2>
        <div className="flex items-center gap-2">
          <label className="text-sm">Sortuj:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={darkMode ? 'border px-2 py-1 rounded bg-gray-800 text-white' : 'border px-2 py-1 rounded bg-white text-gray-800'}
          >
            <option value="added">Najnowsze dodane</option>
            <option value="rating">Najwyżej oceniane</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-600">Wczytywanie...</p>
      ) : movies.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {movies.map(m => (
            <div key={m._id} className={`rounded-lg shadow-lg overflow-hidden flex flex-col hover:shadow-xl transition-shadow duration-300 hover:scale-105 ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
              <img
                src={m.posterUrl || 'https://via.placeholder.com/640x360?text=No+Image'}
                alt={m.title}
                className="w-full h-48 md:h-60 object-cover"
              />
              <div className="p-4 flex flex-col justify-between flex-grow">
                <div className="text-left text-xl font-bold text-blue-600">{m.title}</div>
                <p><strong>Reżyser:</strong> {m.director || 'N/A'}</p>
                <p><strong>Rok:</strong> {m.year || 'N/A'}</p>
                <p><strong>Gatunek:</strong> {m.genre || 'N/A'}</p>
                <p className="mt-2"><strong>Średnia ocena:</strong> {(m.averageRating || 0).toFixed(1)}</p>
                <p><strong>Dodane do list:</strong> {m.addedCount || 0}</p>
                <button 
                  onClick={() => navigate(`/movies/${m._id}`)}
                  className={`mt-4 w-full px-4 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 shadow-lg ${
                    darkMode 
                      ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:from-purple-600 hover:to-pink-700' 
                      : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700'
                  }`}
                >
                  Szczegóły
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-600">Nie znaleziono {type === 'series' ? 'seriali' : 'filmów'}.</p>
      )}
    </div>
  );
}
