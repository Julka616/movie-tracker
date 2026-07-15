import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API, { setToken } from '../services/api';
import PopularMovies from '../components/PopularMovies';
import { jwtDecode } from 'jwt-decode';

export default function Movies({ darkMode, setDarkMode }) {
  const [movies, setMovies] = useState([]);
  const [ratings, setRatings] = useState({});
  const [token, setTokenState] = useState(localStorage.getItem('token'));
  const [isAdmin, setIsAdmin] = useState(false);
  const [listStatus, setListStatus] = useState({}); // { [movieId]: 'toWatch'|'watching'|'watched' }
  const [currentUserId, setCurrentUserId] = useState(null);
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('');
  const [year, setYear] = useState('');
  const [type, setType] = useState('');
  const [sort, setSort] = useState('');

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      setTokenState(storedToken);
      try {
        const decoded = jwtDecode(storedToken);
        setIsAdmin(decoded.user?.role === 'admin');
        setCurrentUserId(decoded.user?.id || null);
      } catch (err) {
        console.error('Token decode error:', err);
        // Token jest nieprawidłowy, wyczyść
        localStorage.removeItem('token');
        setTokenState(null);
      }
    }
  }, []);

  useEffect(() => {
    fetchMovies();
    if (token) fetchUserLists();
  }, [currentUserId, search, genre, year, type, sort]);


  const fetchMovies = async () => {
    try {
      const res = await API.get('/movies', { params: { search, genre, year, type, sort } });
      setMovies(res.data);
      // Inicjalizacja mojej oceny na podstawie danych z backendu
      if (currentUserId) {
        const map = {};
        res.data.forEach(m => {
          const r = (m.ratings || []).find(r => (r.user?._id || r.user) === currentUserId);
          if (r) map[m._id] = r.score;
        });
        setRatings(map);
      }
    } catch (err) {
      console.error('Failed to fetch movies:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setTokenState(null);
    window.location.reload();
  };

  const fetchUserLists = async () => {
    try {
      const res = await API.get('/users/me');
      const ls = res.data?.lists || {};
      const statusMap = {};
      (ls.toWatch || []).forEach(id => { statusMap[id] = 'toWatch'; });
      (ls.watching || []).forEach(id => { statusMap[id] = 'watching'; });
      (ls.watched || []).forEach(id => { statusMap[id] = 'watched'; });
      setListStatus(statusMap);
    } catch (err) {
      console.error('Failed to fetch user lists:', err);
    }
  };

  const addToList = async (movieId, list) => {
    try {
      console.log('Dodawanie do listy:', { movieId, list, token: !!token });
      const response = await API.put('/users/lists', { movieId, list });
      console.log('Odpowiedź z backendu:', response.data);
      // Jeśli zaznaczono "Obejrzane", dodaj też do watchedMovies
      if (list === 'watched') {
        await API.post(`/movies/${movieId}/watch`);
      }
      await fetchMovies();
      await fetchUserLists();
    } catch (err) {
      console.error('Pełny błąd:', err);
      console.error('Odpowiedź backendu:', err.response?.data);
      console.error('Status:', err.response?.status);
      
      // Jeśli token jest nieprawidłowy, wyloguj użytkownika
      if (err.response?.status === 401) {
        alert('Sesja wygasła. Zaloguj się ponownie.');
        localStorage.removeItem('token');
        setToken(null);
        window.location.href = '/login';
        return;
      }
      
      alert(`Błąd podczas dodawania do listy: ${err.response?.data?.msg || err.message}`);
    }
  };

  const removeFromList = async (movieId) => {
    try {
      const resp = await API.put('/users/lists', { movieId });
      console.log('Usunięto z listy:', resp.data);
      await fetchMovies();
      await fetchUserLists();
    } catch (err) {
      console.error('Błąd usuwania z listy:', err);
      if (err.response?.status === 401) {
        alert('Sesja wygasła. Zaloguj się ponownie.');
        localStorage.removeItem('token');
        setToken(null);
        window.location.href = '/login';
      } else {
        alert(`Nie udało się usunąć z listy: ${err.response?.data?.msg || err.message}`);
      }
    }
  };

  const rateMovie = async (movieId, score) => {
    if (!score) return;
    try {
      await API.post(`/movies/${movieId}/rate`, { score: Number(score) });
      setRatings({...ratings, [movieId]: score}); // Zapisz ocenę lokalnie
      fetchMovies();
    } catch (err) {
      console.error(err);
      alert('Błąd podczas oceniania. Czy backend działa?');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Czy na pewno chcesz usunąć ten film?')) {
      try {
        await API.delete(`/movies/${id}`);
        fetchMovies();
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className={darkMode ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white min-h-screen' : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 text-gray-900 min-h-screen'}>
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className={`flex flex-col md:flex-row justify-between items-center mb-8 pb-6 border-b-2 ${darkMode ? 'border-purple-500/30' : 'border-gradient-to-r from-blue-400 to-purple-400'}`}>
        <div className="mb-4 md:mb-0">
          <h1 className={`text-4xl md:text-5xl font-bold mb-2 flex items-center gap-3 ${darkMode ? 'text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400' : 'text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600'}`}>
            MovieTracker
          </h1>
          <p className={`text-sm ${darkMode ? 'text-purple-300' : 'text-gray-600'}`}>
            Odkryj, obejrzyj i oceniaj swoje ulubione filmy i seriale
          </p>
        </div>
        {token ? (
          <div className="flex items-center gap-3 flex-wrap">
            <button 
              onClick={() => navigate('/profile')} 
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all duration-300 hover:scale-105 shadow-lg ${
                darkMode 
                  ? 'bg-white/10 backdrop-blur-sm text-white border border-white/20 hover:bg-white/20' 
                  : 'bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:from-purple-600 hover:to-pink-700'
              }`}
              title="My Profile"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
              <span>Profil</span>
            </button>
            <button 
              onClick={handleLogout} 
              className={`px-4 py-2 rounded-xl font-semibold transition-all duration-300 hover:scale-105 shadow-lg ${
                darkMode 
                  ? 'bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500 hover:text-white' 
                  : 'bg-red-500 text-white hover:bg-red-600'
              }`}
            >
              Wyloguj się
            </button>
            <button 
              onClick={() => setDarkMode(!darkMode)} 
              className={`px-4 py-2 rounded-xl font-semibold transition-all duration-300 hover:scale-105 shadow-lg ${
                darkMode 
                  ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 hover:bg-yellow-500 hover:text-white' 
                  : 'bg-gray-800 text-white hover:bg-gray-900'
              }`}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className={`px-5 py-2.5 rounded-xl font-semibold transition-all duration-300 hover:scale-105 shadow-lg ${
                darkMode 
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500 hover:text-white' 
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700'
              }`}
            >
              Log In
            </button>
            <button
              onClick={() => navigate('/register')}
              className={`px-5 py-2.5 rounded-xl font-semibold transition-all duration-300 hover:scale-105 shadow-lg ${
                darkMode 
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500 hover:text-white' 
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
              }`}
            >
              Register
            </button>
            <button 
              onClick={() => setDarkMode(!darkMode)} 
              className={`px-4 py-2.5 rounded-xl font-semibold transition-all duration-300 hover:scale-105 shadow-lg ${
                darkMode 
                  ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 hover:bg-yellow-500 hover:text-white' 
                  : 'bg-gray-800 text-white hover:bg-gray-900'
              }`}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className={`mb-6 p-4 rounded-xl shadow-lg flex flex-wrap gap-3 items-end ${darkMode ? 'bg-white/10 backdrop-blur-lg border border-white/20' : 'bg-white'}`}>
        <div className="relative w-full md:w-1/3">        
          <input
            type="text"
            placeholder="Szukaj po tytule..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg ${darkMode ? 'bg-white/10 border border-white/20 text-white placeholder-purple-300' : 'border border-gray-300'}`}
          />
          <svg className={`w-5 h-5 absolute left-3 top-2.5 ${darkMode ? 'text-purple-300' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
            <path d="M12.9 14.32a8 8 0 111.414-1.414l4.387 4.387-1.414 1.414-4.387-4.387zM10 16a6 6 0 100-12 6 6 0 000 12z"/>
          </svg>
        </div>
        <input
          type="text"
          placeholder="Gatunek..."
          value={genre}
          onChange={e => setGenre(e.target.value)}
          className={`px-3 py-2 rounded-lg w-full md:w-1/6 ${darkMode ? 'bg-white/10 border border-white/20 text-white placeholder-purple-300' : 'border border-gray-300'}`}
        />
        <input
          type="number"
          placeholder="Rok"
          value={year}
          onChange={e => setYear(e.target.value)}
          className={`px-3 py-2 rounded-lg w-full md:w-1/6 ${darkMode ? 'bg-white/10 border border-white/20 text-white placeholder-purple-300' : 'border border-gray-300'}`}
        />
        <select 
          value={type} 
          onChange={e => setType(e.target.value)} 
          className={`px-3 py-2 rounded-lg w-full md:w-1/6 ${darkMode ? 'bg-white/10 border border-white/20 text-white' : 'border border-gray-300'}`}
        >
          <option value="">Wszystkie</option>
          <option value="movie">Film</option>
          <option value="series">Serial</option>
        </select>
        <select 
          value={sort} 
          onChange={e => setSort(e.target.value)} 
          className={`px-3 py-2 rounded-lg w-full md:w-1/6 ${darkMode ? 'bg-white/10 border border-white/20 text-white' : 'border border-gray-300'}`}
        >
          <option value="">Sortuj</option>
          <option value="rating">Najwyżej oceniane</option>
          <option value="recent">Najnowsze</option>
        </select>
        <button 
          onClick={fetchMovies} 
          className="px-4 py-2 rounded-lg text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 hover:shadow-lg hover:scale-105 transition-all duration-200"
        >
          Filtruj
        </button>
        <button
          onClick={() => {
            setSearch('');
            setGenre('');
            setYear('');
            setType('');
            setSort('');
            fetchMovies();
          }}
          className="px-4 py-2 rounded-lg text-white bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 hover:shadow-lg hover:scale-105 transition-all duration-200"
        >
          Resetuj
        </button>
      </div>

      {/* Movies Grid */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className={`p-2 rounded-lg ${darkMode ? 'bg-blue-500/20' : 'bg-gradient-to-br from-blue-500 to-purple-500'}`}>
            <svg className={`w-6 h-6 ${darkMode ? 'text-blue-300' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
            </svg>
          </div>
          <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Wszystkie filmy i seriale
          </h2>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${darkMode ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>
            {movies.length} elementów
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {movies.length === 0 ? (
            <div className="col-span-full text-center py-20">
              <div className="text-6xl mb-4">🎬</div>
              <p className={`text-xl ${darkMode ? 'text-purple-300' : 'text-gray-500'}`}>Nie znaleziono filmów</p>
              <p className={`text-sm mt-2 ${darkMode ? 'text-purple-400' : 'text-gray-400'}`}>Spróbuj dostosować swoje filtry</p>
            </div>
          ) : (
            movies.map(movie => (
              <div 
                key={movie._id} 
                className={`group rounded-2xl shadow-xl overflow-hidden flex flex-col transition-all duration-300 hover:shadow-2xl hover:scale-105 cursor-pointer ${
                  darkMode 
                    ? 'bg-white/10 backdrop-blur-lg border border-white/20 hover:bg-white/15' 
                    : 'bg-white hover:shadow-purple-200'
                }`}
              >
                <div className="relative overflow-hidden">
                  <img
                    src={movie.posterUrl || 'https://via.placeholder.com/640x360?text=No+Image'}
                    alt={movie.title}
                    className="w-full h-56 md:h-64 object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute top-3 right-3 flex flex-col gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-lg ${
                      movie.type === 'movie' 
                        ? 'bg-green-500 text-white' 
                        : 'bg-purple-500 text-white'
                    }`}>
                      {movie.type === 'movie' ? '🎬 Movie' : '📺 Series'}
                    </span>
                    {listStatus[movie._id] && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold shadow-lg bg-blue-500 text-white">
                        {listStatus[movie._id] === 'toWatch' ? '📌 To Watch' : listStatus[movie._id] === 'watching' ? '▶️ Watching' : '✅ Watched'}
                      </span>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>

                <div className="p-5 flex flex-col justify-between flex-grow">
                  <div>
                    <h3 
                      className={`text-lg font-bold mb-3 line-clamp-2 transition-colors ${
                        darkMode 
                          ? 'text-purple-300 group-hover:text-pink-300' 
                          : 'text-gray-900 group-hover:text-purple-600'
                      }`}
                    >
                      {movie.title}
                    </h3>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className={darkMode ? 'text-purple-400' : 'text-gray-500'}>🎬</span>
                        <span className={darkMode ? 'text-purple-200' : 'text-gray-700'}>
                          {movie.director || 'N/A'}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className={darkMode ? 'text-purple-400' : 'text-gray-500'}>📅</span>
                        <span className={darkMode ? 'text-purple-200' : 'text-gray-700'}>
                          {movie.year || 'N/A'}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className={darkMode ? 'text-purple-400' : 'text-gray-500'}>🎭</span>
                        <span className={darkMode ? 'text-purple-200' : 'text-gray-700'}>
                          {movie.genre || 'N/A'}
                        </span>
                      </div>
                      
                      {movie.duration && (
                        <div className="flex items-center gap-2">
                          <span className={darkMode ? 'text-purple-400' : 'text-gray-500'}>⏱️</span>
                          <span className={darkMode ? 'text-purple-200' : 'text-gray-700'}>
                            {Math.floor(movie.duration / 60)}h {movie.duration % 60}m
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 pt-2">
                        <div className="flex items-center gap-1">
                          <span className="text-yellow-400 text-lg">⭐</span>
                          <span className={`font-bold ${darkMode ? 'text-yellow-300' : 'text-yellow-600'}`}>
                            {movie.averageRating?.toFixed(1) || '0.0'}
                          </span>
                        </div>
                        <span className={`text-xs ${darkMode ? 'text-purple-400' : 'text-gray-500'}`}>
                          ({movie.ratings?.length || 0} ratings)
                        </span>
                      </div>
                    </div>

                    {/* Moja ocena */}
                    {token && ratings[movie._id] && (
                      <div className={`mt-3 pt-3 border-t ${darkMode ? 'border-white/10' : 'border-gray-200'}`}>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold ${darkMode ? 'text-purple-300' : 'text-gray-600'}`}>
                            Moja ocena:
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="text-yellow-400">{'⭐'.repeat(ratings[movie._id])}</span>
                            <span className={darkMode ? 'text-gray-600' : 'text-gray-300'}>
                              {'☆'.repeat(5 - ratings[movie._id])}
                            </span>
                            <span className={`text-xs ${darkMode ? 'text-purple-400' : 'text-gray-500'}`}>
                              ({ratings[movie._id]}/5)
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <button 
                    onClick={() => navigate(`/movies/${movie._id}`)} 
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
            ))
          )}
        </div>
      </div>

      {/* Popularne */}
      <PopularMovies type="movie" darkMode={darkMode} />
      <PopularMovies type="series" darkMode={darkMode} />
      </div>
    </div>
  );
}

