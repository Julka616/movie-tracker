import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import API, { setToken } from '../services/api';
import EpisodesAccordion from "../components/EpisodesAccordion";

export default function MovieDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasToken, setHasToken] = useState(!!localStorage.getItem('token'));
  const [isAdmin, setIsAdmin] = useState(false);
  const [userWatchedEpisodes, setUserWatchedEpisodes] = useState([]);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [ratings, setRatings] = useState({});
  const [currentList, setCurrentList] = useState(null); // 'toWatch'|'watching'|'watched'|null
  const [hoverRating, setHoverRating] = useState(0);

  const statusOptions = [
    { key: 'toWatch', label: 'Do obejrzenia', icon: '📋' },
    { key: 'watching', label: 'W trakcie', icon: '▶️' },
    { key: 'watched', label: 'Obejrzane', icon: '✅' },
  ];

  const parseScore = (score) => {
    if (typeof score === 'string' && score.includes('/')) {
      const [num] = score.split('/');
      const parsed = Number(num.trim());
      return isNaN(parsed) ? 0 : parsed;
    }
    const parsed = Number(score);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Normalize legacy 1–10 scores to 1–5 (round(raw/2) if >5), clamp to [0,5]
  const renderStars = (score) => {
    const raw = parseScore(score);
    const normalized = Math.max(0, Math.min(5, raw > 5 ? Math.round(raw / 2) : raw));
    return {
      stars: '⭐'.repeat(normalized) + '☆'.repeat(5 - normalized),
      normalized,
    };
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    console.log('MovieDetails - Token check:', storedToken ? 'TOKEN EXISTS' : 'NO TOKEN');
    if (storedToken) {
      setToken(storedToken);
      setHasToken(true);
      console.log('MovieDetails - hasToken set to TRUE');
      try {
        const decoded = jwtDecode(storedToken);
        console.log('MovieDetails - Decoded token:', decoded);
        setIsAdmin(decoded.user?.role === 'admin');
        fetchUserData();
      } catch (err) {
        console.error('Token decode error:', err);
      }
    } else {
      setHasToken(false);
      console.log('MovieDetails - hasToken set to FALSE');
    }
    fetchMovie();
  }, [id]);

  const fetchUserData = async () => {
    try {
      const res = await API.get('/users/me');
      const currentUserId = res.data._id;
      setUserWatchedEpisodes(res.data.watchedEpisodes || []);
      const lists = res.data?.lists || {};
      let status = null;
      const sid = String(id);
      if ((lists.toWatch || []).some(mid => String(mid) === sid)) status = 'toWatch';
      if ((lists.watching || []).some(mid => String(mid) === sid)) status = 'watching';
      if ((lists.watched || []).some(mid => String(mid) === sid)) status = 'watched';
      setCurrentList(status);
      
      // Pobierz aktualną ocenę użytkownika dla tego filmu
      const movieRes = await API.get(`/movies/${id}`);
      const userRating = (movieRes.data.ratings || []).find(r => 
        (r.user?._id || r.user) === currentUserId
      );
      if (userRating) {
        setRatings({ [id]: parseScore(userRating.score) });
      }
    } catch (err) {
      console.error('Failed to fetch user data:', err);
    }
  };

  const fetchMovie = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await API.get(`/movies/${id}`);
      setMovie(res.data);
      
      // Jeśli użytkownik jest zalogowany, pobierz jego ocenę
      if (hasToken) {
        try {
          const userRes = await API.get('/users/me');
          const currentUserId = userRes.data._id;
          const userRating = (res.data.ratings || []).find(r => 
            (r.user?._id || r.user) === currentUserId
          );
          if (userRating) {
            setRatings({ [id]: parseScore(userRating.score) });
          }
        } catch (err) {
          console.error('Failed to fetch user rating:', err);
        }
      }
    } catch (err) {
      console.error('Failed to fetch movie:', err);
      setError(err.response?.data?.msg || 'Nie udało się wczytać filmu.');
    } finally {
      setLoading(false);
    }
  };

  const addToList = async (movieId, list) => {
    if (!hasToken) {
      alert('Zaloguj się, aby zmieniać status oglądania.');
      navigate('/login');
      return;
    }
    try {
      // Zapamiętaj pozycję scrolla
      const scrollPosition = window.scrollY;
      
      await API.put('/users/lists', { movieId, list });
      if (list === 'watched') {
        await API.post(`/movies/${movieId}/watch`);
      }
      fetchMovie();
      fetchUserData();
      
      // Przywróć scroll po aktualizacji
      setTimeout(() => {
        window.scrollTo(0, scrollPosition);
      }, 50);
    } catch (err) {
      console.error('Błąd dodawania do listy:', err);
      if (err.response?.status === 401) {
        alert('Musisz być zalogowany, aby zarządzać listami.');
        localStorage.removeItem('token');
        window.location.href = '/login';
        return;
      }
      alert(`Nie udało się dodać do listy: ${err.response?.data?.msg || err.message}`);
    }
  };

  const removeFromList = async (movieId) => {
    try {
      // Zapamiętaj pozycję scrolla
      const scrollPosition = window.scrollY;
      
      const resp = await API.put('/users/lists', { movieId });
      console.log('Usunięto z listy:', resp.data);
      fetchMovie();
      fetchUserData();
      
      // Przywróć scroll po aktualizacji
      setTimeout(() => {
        window.scrollTo(0, scrollPosition);
      }, 50);
    } catch (err) {
      console.error('Błąd usuwania z listy:', err);
      if (err.response?.status === 401) {
        alert('Sesja wygasła. Zaloguj się ponownie.');
        localStorage.removeItem('token');
        window.location.href = '/login';
      } else {
        alert(`Nie udało się usunąć z listy: ${err.response?.data?.msg || err.message}`);
      }
    }
  };

  const rateMovie = async (movieId, score) => {
    if (!score) return;
    if (!hasToken) {
      alert('Zaloguj się, aby oceniać filmy/seriale.');
      navigate('/login');
      return;
    }
    try {
      // Zapamiętaj pozycję scrolla
      const scrollPosition = window.scrollY;
      
      const response = await API.post(`/movies/${movieId}/rate`, { score: Number(score) });
      console.log('Rating saved:', response.data);
      setRatings({ ...ratings, [movieId]: Number(score) });
      await fetchMovie();
      
      // Przywróć scroll po aktualizacji
      setTimeout(() => {
        window.scrollTo(0, scrollPosition);
      }, 50);
    } catch (err) {
      console.error('Rating error:', err);
      if (err.response?.status === 401) {
        alert('Sesja wygasła. Zaloguj się ponownie.');
        localStorage.removeItem('token');
        window.location.href = '/login';
      } else {
        alert(`Błąd podczas oceniania: ${err.response?.data?.msg || err.message}`);
      }
    }
  };

  const handleDelete = async (movieId) => {
    if (window.confirm('Czy na pewno chcesz usunąć ten film?')) {
      try {
        await API.delete(`/movies/${movieId}`);
        navigate('/movies');
      } catch (err) {
        console.error(err);
        alert('Błąd podczas usuwania. Czy backend działa?');
      }
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-700">Wczytywanie filmu...</div>;
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={() => navigate(-1)} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Wróć
        </button>
      </div>
    );
  }

  if (!movie) return null;

  const sortedRatings = (movie.ratings || [])
    .map((rating) => {
      const { stars, normalized } = renderStars(rating.score);
      return { ...rating, stars, normalized };
    })
    .sort((a, b) => b.normalized - a.normalized);

  return (
    <div className={darkMode ? "min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white" : "min-h-screen bg-gradient-to-br from-slate-50 to-slate-100"}>
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white py-12">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Poster */}
            {movie.posterUrl && (
              <div className="flex-shrink-0">
                <img 
                  src={movie.posterUrl} 
                  alt={movie.title}
                  className="h-80 w-60 object-cover rounded-lg shadow-2xl"
                />
              </div>
            )}
            
            {/* Title & Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-5xl font-bold mb-2">{movie.title}</h1>
                  <div className="flex items-center gap-4 text-lg">
                    <span className="text-slate-300">{movie.year || 'N/A'}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-300">{movie.genre || 'N/A'}</span>
                    {movie.type === 'series' ? (
                      <span className="px-3 py-1 bg-purple-600 rounded-full text-sm font-semibold">Serie TV</span>
                    ) : (
                      <span className="px-3 py-1 bg-blue-600 rounded-full text-sm font-semibold">Film</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link to={hasToken ? '/movies' : '/'} className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors">
                    Wróć
                  </Link>
                </div>
              </div>

              {/* Rating Badge */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <div className="text-4xl font-bold text-yellow-400">{(movie.averageRating || 0).toFixed(1)}</div>
                  <div className="flex flex-col">
                    <div className="text-yellow-400 text-2xl">
                      {'⭐'.repeat(Math.round(movie.averageRating || 0))}
                      {'☆'.repeat(5 - Math.round(movie.averageRating || 0))}
                    </div>
                    <div className="text-sm text-slate-300">({movie.ratings?.length || 0} ocen)</div>
                  </div>
                </div>
              </div>

              {/* Director */}
              <div className="text-slate-200">
                <span className="text-slate-400">Reżyser:</span> {movie.director || 'N/A'}
              </div>
              {movie.duration && (
                <div className="text-slate-200 mt-2">
                  <span className="text-slate-400">Czas trwania:</span> {Math.floor(movie.duration / 60)}h {movie.duration % 60}m
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Description */}
        {movie.description && (
          <div className="bg-white rounded-xl shadow-md p-8 mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Opis</h2>
            <p className="text-slate-700 leading-relaxed text-lg">{movie.description}</p>
          </div>
        )}

        {/* Trailer */}
        {movie.trailerUrl && (
          <div className="bg-white rounded-xl shadow-md p-8 mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Zwiastun</h2>
            <div className="w-full aspect-video bg-slate-900 rounded-lg overflow-hidden">
              <iframe
                width="100%"
                height="100%"
                src={movie.trailerUrl}
                title="Trailer"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        )}

        {/* Manage Lists & Rating */}
        <div className="bg-white rounded-xl shadow-md p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Moje działania</h2>
          
          {!hasToken && (
            <div className="mb-6 p-4 bg-amber-50 border-l-4 border-amber-400 text-amber-700 rounded">
              Zaloguj się, aby dodawać do list i oceniać
            </div>
          )}

          {/* Status Buttons */}
          <div className="mb-8">
            <h3 className="font-semibold text-slate-700 mb-3">Status oglądania</h3>
            <div className="flex flex-wrap gap-3">
              {statusOptions.map((option) => {
                const active = currentList === option.key;
                return (
                  <button
                    key={option.key}
                    onClick={() => addToList(movie._id, option.key)}
                    className={`flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition-all duration-200 ${
                      active
                        ? 'bg-emerald-500 text-white shadow-lg'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span className="text-xl">{option.icon}</span>
                    {option.label}
                  </button>
                );
              })}
            </div>
            {currentList && (
              <button
                onClick={() => removeFromList(movie._id)}
                className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                disabled={!hasToken}
              >
                Usuń z listy
              </button>
            )}
          </div>

          {/* Rating */}
          <div>
            <h3 className="font-semibold text-slate-700 mb-3">Oceń (1–5 gwiazdek)</h3>
            <div className="flex gap-2" onMouseLeave={() => setHoverRating(0)}>
              {[1, 2, 3, 4, 5].map(star => {
                const currentRating = ratings[movie._id] || 0;
                const displayRating = hoverRating || currentRating;
                const isFilled = star <= displayRating;
                
                return (
                  <button
                    key={star}
                    onClick={() => rateMovie(movie._id, star)}
                    onMouseEnter={() => setHoverRating(star)}
                    className="transition-all duration-200 hover:scale-125 focus:outline-none"
                    title={`${star}/5`}
                    disabled={!hasToken}
                  >
                    <span className={`text-5xl ${isFilled ? 'text-yellow-400' : 'text-slate-300'}`}>
                      {isFilled ? '⭐' : '☆'}
                    </span>
                  </button>
                );
              })}
            </div>
            {ratings[movie._id] && (
              <p className="text-sm text-slate-600 mt-2">Twoja ocena: {ratings[movie._id]}/5</p>
            )}
          </div>
        </div>

        {/* User Ratings */}
        <div className="bg-white rounded-xl shadow-md p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Oceny użytkowników ({movie.ratings?.length || 0})</h2>
          {sortedRatings.length > 0 ? (
            <div className="space-y-3">
              {sortedRatings.map((rating) => (
                <div
                  key={rating._id || `${rating.user?._id}-${rating.score}`}
                  className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg px-5 py-4 flex items-center justify-between border border-slate-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                      {(rating.user?.name || 'U').charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">{rating.user?.name || 'Anonimowy'}</div>
                      <div className="text-sm text-slate-500">Ocena: {rating.normalized}/5</div>
                    </div>
                  </div>
                  <div className="text-yellow-400 text-2xl">{rating.stars}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-600 text-center py-8">Brak ocen. Bądź pierwszy, aby ocenić!</p>
          )}
        </div>

        {/* Series Info */}
        {movie.type === 'series' && (
          <div className="bg-white rounded-xl shadow-md p-8 mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Informacje o serialu</h2>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                <div className="text-4xl font-bold text-blue-600">
                  {Array.from(new Set((movie.episodes || []).map(e => e.seasonNumber))).length || 0}
                </div>
                <div className="text-slate-700 font-medium">Sezonów</div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                <div className="text-4xl font-bold text-purple-600">
                  {movie.episodes?.length || 0}
                </div>
                <div className="text-slate-700 font-medium">Odcinków</div>
              </div>
            </div>
          </div>
        )}

       {/* Episodes */}
        {movie.type === 'series' && (
          <div className="bg-white rounded-xl shadow-md p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Odcinki</h2>
            <EpisodesAccordion 
              episodes={movie.episodes || []} 
              userWatchedEpisodes={userWatchedEpisodes}
              movieId={movie._id}
              onUpdate={() => { fetchMovie(); fetchUserData(); }}
            />
          </div>
        )}
      </div>
    </div>
  );
}