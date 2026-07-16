import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API, { setToken } from '../services/api';
import PopularMovies from '../components/PopularMovies';
import { jwtDecode } from 'jwt-decode';

export default function Movies() {
  const [movies, setMovies] = useState([]);
  const [ratings, setRatings] = useState({});
  const [token, setTokenState] = useState(localStorage.getItem('token'));
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
        setCurrentUserId(decoded.user?.id || null);
      } catch (err) {
        console.error('Token decode error:', err);
        localStorage.removeItem('token');
        setTokenState(null);
      }
    }
  }, []);

  useEffect(() => {
    fetchMovies();
    if (token) fetchUserLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, search, genre, year, type, sort]);

  const fetchMovies = async () => {
    try {
      const res = await API.get('/movies', { params: { search, genre, year, type, sort } });
      setMovies(res.data);
      if (currentUserId) {
        const map = {};
        res.data.forEach((m) => {
          const r = (m.ratings || []).find((r) => (r.user?._id || r.user) === currentUserId);
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
      (ls.toWatch || []).forEach((id) => { statusMap[id] = 'toWatch'; });
      (ls.watching || []).forEach((id) => { statusMap[id] = 'watching'; });
      (ls.watched || []).forEach((id) => { statusMap[id] = 'watched'; });
      setListStatus(statusMap);
    } catch (err) {
      console.error('Failed to fetch user lists:', err);
    }
  };

  const resetFilters = () => {
    setSearch('');
    setGenre('');
    setYear('');
    setType('');
    setSort('');
  };

  const statusLabel = {
    toWatch: 'Do obejrzenia',
    watching: 'W trakcie',
    watched: 'Obejrzane',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 text-transparent bg-clip-text">
                MovieTracker
              </span>
            </h1>
            <p className="text-purple-300 text-sm">Twoja kolekcja filmów i seriali</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {token ? (
              <>
                <button
                  onClick={() => navigate('/stats')}
                  className="px-5 py-2.5 bg-white/10 backdrop-blur-sm text-white rounded-xl hover:bg-white/20 font-semibold transition-all duration-300 border border-white/20 text-sm"
                >
                  Statystyki
                </button>
                <button
                  onClick={() => navigate('/friends')}
                  className="px-5 py-2.5 bg-white/10 backdrop-blur-sm text-white rounded-xl hover:bg-white/20 font-semibold transition-all duration-300 border border-white/20 text-sm"
                >
                  Znajomi
                </button>
                <button
                  onClick={() => navigate('/profile')}
                  className="px-5 py-2.5 bg-white/10 backdrop-blur-sm text-white rounded-xl hover:bg-white/20 font-semibold transition-all duration-300 border border-white/20 text-sm"
                >
                  Profil
                </button>
                <button
                  onClick={handleLogout}
                  className="px-5 py-2.5 bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white rounded-xl font-semibold transition-all duration-300 border border-red-500/30 text-sm"
                >
                  Wyloguj
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="px-5 py-2.5 bg-white/10 backdrop-blur-sm text-white rounded-xl hover:bg-white/20 font-semibold transition-all duration-300 border border-white/20 text-sm"
                >
                  Zaloguj się
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all duration-300 text-sm"
                >
                  Zarejestruj się
                </button>
              </>
            )}
          </div>
        </div>

        {/* Search & filters */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-5 md:p-6 mb-8 border border-white/20">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[220px]">
              <label className="block text-purple-300 text-xs uppercase tracking-wide mb-1">Szukaj</label>
              <input
                type="text"
                placeholder="Tytuł filmu lub serialu..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="w-full md:w-36">
              <label className="block text-purple-300 text-xs uppercase tracking-wide mb-1">Gatunek</label>
              <input
                type="text"
                placeholder="np. dramat"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="w-full md:w-28">
              <label className="block text-purple-300 text-xs uppercase tracking-wide mb-1">Rok</label>
              <input
                type="number"
                placeholder="2024"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="w-full md:w-36">
              <label className="block text-purple-300 text-xs uppercase tracking-wide mb-1">Typ</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option className="text-black" value="">Wszystkie</option>
                <option className="text-black" value="movie">Filmy</option>
                <option className="text-black" value="series">Seriale</option>
              </select>
            </div>
            <div className="w-full md:w-44">
              <label className="block text-purple-300 text-xs uppercase tracking-wide mb-1">Sortuj</label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option className="text-black" value="">Domyślnie</option>
                <option className="text-black" value="rating">Najwyżej oceniane</option>
                <option className="text-black" value="recent">Najnowsze</option>
              </select>
            </div>
            <button
              onClick={resetFilters}
              className="px-5 py-3 bg-white/10 hover:bg-white/20 text-purple-200 rounded-xl font-semibold transition border border-white/20 text-sm"
            >
              Wyczyść
            </button>
          </div>
        </div>

        {/* Library grid */}
        <div className="mb-12">
          <div className="flex items-baseline gap-3 mb-5">
            <h2 className="text-2xl md:text-3xl font-bold text-white">Biblioteka</h2>
            <span className="text-purple-300 text-sm">{movies.length} {movies.length === 1 ? 'pozycja' : 'pozycji'}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {movies.length === 0 ? (
              <div className="col-span-full text-center py-20 border border-dashed border-white/20 rounded-2xl">
                <p className="text-xl font-semibold text-white mb-1">Brak wyników</p>
                <p className="text-purple-300 text-sm">Zmień kryteria wyszukiwania, aby zobaczyć więcej pozycji</p>
              </div>
            ) : (
              movies.map((movie) => (
                <Link
                  key={movie._id}
                  to={`/movies/${movie._id}`}
                  className="group bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
                >
                  <div className="relative">
                    <img
                      src={movie.posterUrl || 'https://via.placeholder.com/400x600?text=Brak+plakatu'}
                      alt={movie.title}
                      className="w-full h-64 object-cover"
                    />
                    <span
                      className={`absolute top-3 left-3 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                        movie.type === 'movie' ? 'bg-blue-500/90 text-white' : 'bg-pink-500/90 text-white'
                      }`}
                    >
                      {movie.type === 'movie' ? 'Film' : 'Serial'}
                    </span>
                    {listStatus[movie._id] && (
                      <span className="absolute top-3 right-3 px-2.5 py-1 rounded-lg text-xs font-semibold bg-black/60 text-purple-200 border border-white/20">
                        {statusLabel[listStatus[movie._id]]}
                      </span>
                    )}
                    <span className="absolute bottom-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-black/70 text-yellow-400">
                      ★ {movie.averageRating?.toFixed(1) || '—'}
                    </span>
                  </div>

                  <div className="p-4 flex flex-col flex-grow">
                    <h3 className="text-white font-semibold text-lg leading-tight mb-2 group-hover:text-pink-300 transition-colors">
                      {movie.title}
                    </h3>
                    <div className="text-purple-300 text-xs space-y-1">
                      <div>Reżyseria: {movie.director || 'brak danych'}</div>
                      <div>{movie.year || '—'} · {movie.genre || 'brak gatunku'}</div>
                      {movie.duration && (
                        <div>{Math.floor(movie.duration / 60)}h {movie.duration % 60}min · {movie.ratings?.length || 0} ocen</div>
                      )}
                    </div>

                    {token && ratings[movie._id] && (
                      <div className="mt-3 pt-3 border-t border-white/10 text-xs text-pink-300 font-semibold">
                        Twoja ocena: {ratings[movie._id]}/5
                      </div>
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <PopularMovies type="movie" darkMode={true} />
        <PopularMovies type="series" darkMode={true} />
      </div>
    </div>
  );
}