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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const resetFilters = () => {
    setSearch('');
    setGenre('');
    setYear('');
    setType('');
    setSort('');
    fetchMovies();
  };

  const statusLabel = {
    toWatch: 'Do obejrzenia',
    watching: 'W trakcie',
    watched: 'Obejrzane',
  };

  const bg = darkMode ? 'bg-ink text-paper' : 'bg-paper text-ink';
  const surface = darkMode ? 'bg-stage border border-reel' : 'bg-white border border-reel/20';
  const surfaceHover = darkMode ? 'hover:bg-stage2' : 'hover:bg-black/[0.02]';
  const mutedText = darkMode ? 'text-paper/60' : 'text-ink/60';
  const inputCls = `w-full px-3 py-2 rounded-md font-mono text-sm outline-none transition-colors focus:border-marquee ${
    darkMode
      ? 'bg-ink border border-reel text-paper placeholder-paper/40'
      : 'bg-paper border border-reel/30 text-ink placeholder-ink/40'
  }`;

  return (
    <div className={`min-h-screen font-body relative ${bg}`}>
      <div className="film-grain" />

      <header className={`relative z-10 border-b ${darkMode ? 'border-reel' : 'border-reel/20'}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-marquee text-2xl leading-none">&#9679;</span>
            <div>
              <h1 className="font-display text-4xl md:text-5xl tracking-wide leading-none text-marquee">
                MOVIETRACKER
              </h1>
              <p className={`font-mono text-xs mt-1 tracking-widest uppercase ${mutedText}`}>
                seans trwa &mdash; odkrywaj, oceniaj, sledz
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {token ? (
              <>
                <button
                  onClick={() => navigate('/stats')}
                  className={`px-4 py-2 rounded-md font-mono text-xs uppercase tracking-wider border transition-colors ${
                    darkMode ? 'border-reel text-paper hover:border-marquee hover:text-marquee' : 'border-reel/30 text-ink hover:border-marquee hover:text-velvet'
                  }`}
                >
                  Statystyki
                </button>
                <button
                  onClick={() => navigate('/profile')}
                  className={`px-4 py-2 rounded-md font-mono text-xs uppercase tracking-wider border transition-colors ${
                    darkMode ? 'border-reel text-paper hover:border-marquee hover:text-marquee' : 'border-reel/30 text-ink hover:border-marquee hover:text-velvet'
                  }`}
                >
                  Profil
                </button>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-md font-mono text-xs uppercase tracking-wider border border-velvet text-velvet hover:bg-velvet hover:text-paper transition-colors"
                >
                  Wyloguj
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className={`px-4 py-2 rounded-md font-mono text-xs uppercase tracking-wider border transition-colors ${
                    darkMode ? 'border-reel text-paper hover:border-marquee hover:text-marquee' : 'border-reel/30 text-ink hover:border-marquee hover:text-velvet'
                  }`}
                >
                  Zaloguj
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="px-4 py-2 rounded-md font-mono text-xs uppercase tracking-wider bg-marquee text-ink font-semibold hover:bg-marquee2 transition-colors"
                >
                  Rejestracja
                </button>
              </>
            )}
            <button
              onClick={() => setDarkMode(!darkMode)}
              title="Zmien seans (motyw)"
              className={`w-9 h-9 rounded-md border font-mono text-sm transition-colors ${
                darkMode ? 'border-reel text-marquee hover:border-marquee' : 'border-reel/30 text-ink hover:border-marquee'
              }`}
            >
              {darkMode ? '☾' : '☀'}
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className={`mb-10 rounded-lg p-4 md:p-5 ${surface}`}>
          <div className={`font-mono text-[11px] uppercase tracking-[0.2em] mb-3 ${mutedText}`}>Kasa biletowa &mdash; wyszukiwarka</div>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="relative flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Tytul filmu lub serialu..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className={inputCls}
              />
            </div>
            <input
              type="text"
              placeholder="Gatunek"
              value={genre}
              onChange={e => setGenre(e.target.value)}
              className={`${inputCls} w-full md:w-36`}
            />
            <input
              type="number"
              placeholder="Rok"
              value={year}
              onChange={e => setYear(e.target.value)}
              className={`${inputCls} w-full md:w-28`}
            />
            <select value={type} onChange={e => setType(e.target.value)} className={`${inputCls} w-full md:w-36`}>
              <option value="">Wszystkie</option>
              <option value="movie">Film</option>
              <option value="series">Serial</option>
            </select>
            <select value={sort} onChange={e => setSort(e.target.value)} className={`${inputCls} w-full md:w-44`}>
              <option value="">Sortuj</option>
              <option value="rating">Najwyzej oceniane</option>
              <option value="recent">Najnowsze</option>
            </select>
            <button
              onClick={fetchMovies}
              className="px-5 py-2 rounded-md font-mono text-xs uppercase tracking-wider bg-marquee text-ink font-semibold hover:bg-marquee2 transition-colors"
            >
              Filtruj
            </button>
            <button
              onClick={resetFilters}
              className={`px-5 py-2 rounded-md font-mono text-xs uppercase tracking-wider border transition-colors ${
                darkMode ? 'border-reel text-paper/70 hover:text-paper hover:border-paper/50' : 'border-reel/30 text-ink/70 hover:text-ink hover:border-ink/40'
              }`}
            >
              Resetuj
            </button>
          </div>
        </div>

        <div className="mb-14">
          <div className="flex items-baseline gap-3 mb-6">
            <h2 className="font-display text-3xl tracking-wide text-marquee">REPERTUAR</h2>
            <span className={`font-mono text-xs ${mutedText}`}>{movies.length} pozycji</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
            {movies.length === 0 ? (
              <div className={`col-span-full text-center py-24 border border-dashed rounded-lg ${darkMode ? 'border-reel' : 'border-reel/30'}`}>
                <p className="font-display text-2xl tracking-wide text-marquee mb-1">SEANS ODWOLANY</p>
                <p className={`font-mono text-xs ${mutedText}`}>Brak wynikow &mdash; sprobuj zmienic filtry</p>
              </div>
            ) : (
              movies.map(movie => (
                <div
                  key={movie._id}
                  onClick={() => navigate(`/movies/${movie._id}`)}
                  className={`group cursor-pointer rounded-lg overflow-hidden flex flex-col transition-transform duration-300 hover:-translate-y-1 ${surface} ${surfaceHover}`}
                >
                  <div className="relative overflow-hidden">
                    <img
                      src={movie.posterUrl || 'https://via.placeholder.com/640x360?text=No+Image'}
                      alt={movie.title}
                      className="w-full h-64 object-cover grayscale-[15%] group-hover:grayscale-0 transition-all duration-500"
                    />
                    <span className={`absolute top-3 left-3 px-2 py-0.5 rounded font-mono text-[10px] uppercase tracking-wider ${
                      movie.type === 'movie' ? 'bg-marquee text-ink' : 'bg-velvet text-paper'
                    }`}>
                      {movie.type === 'movie' ? 'Film' : 'Serial'}
                    </span>
                    {listStatus[movie._id] && (
                      <span className="absolute top-3 right-3 px-2 py-0.5 rounded font-mono text-[10px] uppercase tracking-wider bg-ink/80 text-marquee border border-marquee/40">
                        {statusLabel[listStatus[movie._id]]}
                      </span>
                    )}

                    <div className={`absolute -bottom-5 right-4 w-12 h-12 rounded-full flex flex-col items-center justify-center font-mono rating-stamp ${darkMode ? 'bg-stage text-marquee' : 'bg-white text-velvet'}`}>
                      <span className="text-sm font-semibold leading-none">{movie.averageRating?.toFixed(1) || '0.0'}</span>
                      <span className="text-[8px] leading-none mt-0.5">/5</span>
                    </div>
                  </div>

                  <div className={`ticket-tear ${surface} px-5 pt-7 pb-5 flex flex-col justify-between flex-grow`}>
                    <div>
                      <h3 className="font-display text-xl tracking-wide leading-tight mb-2 group-hover:text-marquee transition-colors">
                        {movie.title}
                      </h3>
                      <div className={`font-mono text-[11px] space-y-1 ${mutedText}`}>
                        <div>REZ. {movie.director || 'brak danych'}</div>
                        <div>{movie.year || '----'} &middot; {movie.genre || 'brak gatunku'}</div>
                        {movie.duration && (
                          <div>{Math.floor(movie.duration / 60)}h {movie.duration % 60}m &middot; {movie.ratings?.length || 0} ocen</div>
                        )}
                      </div>

                      {token && ratings[movie._id] && (
                        <div className={`mt-3 pt-3 border-t font-mono text-[11px] ${darkMode ? 'border-reel text-marquee' : 'border-reel/20 text-velvet'}`}>
                          Twoja ocena: {ratings[movie._id]}/5
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <PopularMovies type="movie" darkMode={darkMode} />
        <PopularMovies type="series" darkMode={darkMode} />
      </main>
    </div>
  );
}