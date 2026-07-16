import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import API, { setToken } from '../services/api';

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({
    totalWatchTime: 0,
    moviesWatched: 0,
    episodesWatched: 0,
  });
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ name: '', privacy: 'private' });
  const [lists, setLists] = useState({ toWatch: [], watching: [], watched: [] });
  const [expandedSections, setExpandedSections] = useState(() => {
    const saved = localStorage.getItem('profileExpandedSections');
    return saved ? JSON.parse(saved) : {
      toWatch: false,
      watching: false,
      watched: false,
      recentlyWatched: true
    };
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => {
      const newState = { ...prev, [section]: !prev[section] };
      localStorage.setItem('profileExpandedSections', JSON.stringify(newState));
      return newState;
    });
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    setToken(token);
    try {
      const decoded = jwtDecode(token);
      setIsAdmin(decoded.user?.role === 'admin');
    } catch (err) {
      console.error('Token decode error:', err);
    }
    fetchUserData();
    fetchMovies();
  }, [navigate]);

  const fetchUserData = async () => {
    try {
      const res = await API.get('/users/me');
      setUser(res.data);
      setForm({ name: res.data.name || '', privacy: res.data.privacy || 'private' });
      calculateStats(res.data);
      // dodatkowo pobierz zapełnione listy
      fetchPopulatedLists();
    } catch (err) {
      console.error('Failed to fetch user:', err);
    }
  };

  const fetchPopulatedLists = async () => {
    try {
      const res = await API.get('/users/lists');
      setLists(res.data || { toWatch: [], watching: [], watched: [] });
    } catch (err) {
      console.error('Failed to fetch populated lists:', err);
    }
  };

  const removeFromList = async (movieId) => {
    try {
      await API.put('/users/lists', { movieId });
      await fetchPopulatedLists();
      await fetchUserData();
    } catch (err) {
      alert(err.response?.data?.msg || 'Nie udało się usunąć z listy');
    }
  };

  const fetchMovies = async () => {
    try {
      const res = await API.get('/movies');
      setMovies(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch movies:', err);
      setLoading(false);
    }
  };

  const calculateStats = (userData) => {
    if (!userData) return;

    let totalMinutes = 0;
    let moviesCount = 0;
    let episodesCount = 0;
    const genreCount = {};

    // Filmy obejrzane (z duration)
    userData.watchedMovies?.forEach((wm) => {
      const movie = movies.find((m) => m._id === wm.movieId);
      if (movie && movie.duration) {
        totalMinutes += movie.duration;
      }
      if (movie?.genre) {
        genreCount[movie.genre] = (genreCount[movie.genre] || 0) + 1;
      }
      moviesCount++;
    });

    // Odcinki obejrzane (z duration)
    userData.watchedEpisodes?.forEach((we) => {
      const movie = movies.find((m) => m._id === we.movieId);
      if (movie) {
        const episode = movie.episodes?.find((ep) => ep._id === we.episodeId);
        if (episode && episode.duration) {
          totalMinutes += episode.duration;
        }
        if (movie?.genre) {
          genreCount[movie.genre] = (genreCount[movie.genre] || 0) + 1;
        }
      }
      episodesCount++;
    });

    setStats({
      totalWatchTime: totalMinutes,
      moviesWatched: moviesCount,
      episodesWatched: episodesCount,
      topGenres: Object.entries(genreCount).sort((a,b)=>b[1]-a[1]).slice(0,3),
    });
  };

  useEffect(() => {
    if (user && movies.length > 0) {
      calculateStats(user);
    }
  }, [user, movies]);

  if (loading) {
    return <div className="p-6 text-center">Wczytywanie profilu...</div>;
  }

  if (!user) {
    return <div className="p-6 text-center text-red-600">User not found</div>;
  }

  const totalHours = Math.floor(stats.totalWatchTime / 60);
  const totalMinutes = stats.totalWatchTime % 60;
  const userId = user?._id;
  const bestRated = movies
    .map(m => ({
      movie: m,
      myRating: (m.ratings || []).find(r => r.user?._id === userId || r.user?.toString?.() === userId)
    }))
    .filter(x => x.myRating)
    .sort((a,b) => b.myRating.score - a.myRating.score)
    .slice(0,5);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 flex items-center gap-3">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 text-transparent bg-clip-text">
                👤 Mój Profil
              </span>
            </h1>
            <p className="text-purple-300 text-sm">Zarządzaj kontem i śledź historię oglądania</p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/stats"
              className="group px-6 py-3 bg-white/10 backdrop-blur-sm text-white rounded-xl hover:bg-white/20 font-semibold transition-all duration-300 border border-white/20 flex items-center gap-2"
            >
              📊 Statystyki
            </Link>
            {isAdmin && (
              <Link 
                to="/admin" 
                className="group px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-xl hover:from-yellow-600 hover:to-orange-700 font-semibold transition-all duration-300 hover:scale-105 shadow-lg flex items-center gap-2"
              >
                Panel Administratora
              </Link>
            )}
            <Link 
              to="/movies" 
              className="group px-6 py-3 bg-white/10 backdrop-blur-sm text-white rounded-xl hover:bg-white/20 font-semibold transition-all duration-300 border border-white/20 flex items-center gap-2"
            >
              <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Powrót do Filmów
            </Link>
          </div>
        </div>

        {/* User Info Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-6 md:p-8 mb-8 border border-white/20">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white">Informacje o Koncie</h2>
              <p className="text-purple-300 text-sm">Twoje dane osobowe</p>
            </div>
          </div>
          {!editMode ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <p className="text-purple-300 text-sm mb-1">Name</p>
                  <p className="text-white text-lg font-semibold">{user.name}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <p className="text-purple-300 text-sm mb-1">Email</p>
                  <p className="text-white text-lg font-semibold">{user.email}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <p className="text-purple-300 text-sm mb-1">Rola</p>
                  <p className="text-white text-lg font-semibold">
                    {user.role === 'admin' ? 'Administrator' : 'Użytkownik'}
                  </p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <p className="text-purple-300 text-sm mb-1">Prywatność profilu</p>
                  <p className="text-white text-lg font-semibold">
                    {user.privacy === 'public' ? '🌐 Publiczny' : '🔒 Prywatny'}
                  </p>
                </div>
              </div>
              <button 
                onClick={()=>setEditMode(true)} 
                className="mt-4 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 font-semibold transition-all duration-300 hover:scale-105 shadow-lg"
              >
                Edytuj Profil
              </button>
            </div>
          ) : (
            <form 
              className="space-y-4" 
              onSubmit={async (e)=>{
                e.preventDefault(); 
                try{ 
                  const res = await API.put('/users/me', form); 
                  setUser(res.data); 
                  setEditMode(false);
                } catch(err){ 
                  alert(err.response?.data?.msg || 'Error saving changes'); 
                }
              }}
            >
              <div>
                <label className="block text-white text-sm font-semibold mb-2">Name</label>
                <input 
                  value={form.name} 
                  onChange={e=>setForm({...form, name:e.target.value})} 
                  className="w-full p-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500" 
                  required 
                />
              </div>
              <div>
                <label className="block text-white text-sm font-semibold mb-2">Profile Privacy</label>
                <select 
                  value={form.privacy} 
                  onChange={e=>setForm({...form, privacy:e.target.value})} 
                  className="w-full p-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="private">🔒 Private</option>
                  <option value="public">🌐 Public</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button 
                  type="submit" 
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 font-semibold transition-all duration-300 hover:scale-105 shadow-lg"
                >
                  ✓ Zapisz Zmiany
                </button>
                <button 
                  type="button" 
                  onClick={()=>setEditMode(false)} 
                  className="px-6 py-3 bg-white/10 backdrop-blur-sm text-purple-200 rounded-xl hover:bg-white/20 font-semibold transition-all duration-300 border border-white/20"
                >
                  ✗ Anuluj
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Stats Cards */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-6 md:p-8 mb-8 border border-white/20">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white">Statystyki Oglądania</h2>
              <p className="text-purple-300 text-sm">Twoja aktywność oglądania</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="group bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white hover:scale-105 transition-transform duration-300 cursor-pointer shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-3xl opacity-20">⏱️</div>
              </div>
              <div className="text-4xl font-bold mb-2">{totalHours}h {totalMinutes}m</div>
              <div className="text-sm text-blue-100 uppercase tracking-wide font-semibold">Razem czasu oglądania</div>
            </div>
            <div className="group bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white hover:scale-105 transition-transform duration-300 cursor-pointer shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                </svg>
                <div className="text-3xl opacity-20">🎬</div>
              </div>
              <div className="text-4xl font-bold mb-2">{stats.moviesWatched}</div>
              <div className="text-sm text-green-100 uppercase tracking-wide font-semibold">Filmy obejrzane</div>
            </div>
            <div className="group bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl p-6 text-white hover:scale-105 transition-transform duration-300 cursor-pointer shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <div className="text-3xl opacity-20">📺</div>
              </div>
              <div className="text-4xl font-bold mb-2">{stats.episodesWatched}</div>
              <div className="text-sm text-pink-100 uppercase tracking-wide font-semibold">Odcinki obejrzane</div>
            </div>
          </div>
          {stats.topGenres && stats.topGenres.length > 0 && (
            <div className="mt-6 bg-white/5 rounded-xl p-4 border border-white/10">
              <h3 className="text-lg font-semibold text-purple-300 mb-3 flex items-center gap-2">
                <span>🎭</span> Top Gatunki
              </h3>
              <div className="flex flex-wrap gap-2">
                {stats.topGenres.map(([g,c]) => (
                  <span key={g} className="px-4 py-2 bg-purple-500/20 text-purple-200 rounded-lg border border-purple-500/30 font-semibold">
                    {g} ({c})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Top Rated Section */}
        {bestRated && bestRated.length > 0 && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-6 md:p-8 mb-8 border border-white/20">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-white">Moje najlepiej oceniane</h2>
                <p className="text-purple-300 text-sm">Polubione filmy i seriale</p>
              </div>
            </div>
            <div className="space-y-3">
              {bestRated.map((x, idx) => (
                <div key={idx} className="bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <Link 
                      to={`/movies/${x.movie._id}`} 
                      className="text-purple-300 font-semibold hover:text-pink-300 transition-colors flex items-center gap-2"
                    >
                      <span className="text-2xl">{idx + 1}.</span>
                      <span>{x.movie.title}</span>
                    </Link>
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-400 text-lg">{'⭐'.repeat(x.myRating.score)}</span>
                      <span className="text-purple-300 font-bold">{x.myRating.score}/5</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My Lists Section */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-6 md:p-8 mb-8 border border-white/20">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white">Moje listy</h2>
              <p className="text-purple-300 text-sm">Organizuj swoje listy oglądania</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6">
            {/* To Watch */}
            <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
              <button 
                onClick={() => toggleSection('toWatch')}
                className="w-full flex items-center justify-between p-5 hover:bg-white/10 transition-all"
              >
                <h3 className="text-xl font-bold text-blue-300 flex items-center gap-2">
                  <span>📃</span> Do obejrzenia
                </h3>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-blue-500/20 rounded-full text-sm text-blue-300 font-semibold border border-blue-500/30">
                    {lists.toWatch.length} {lists.toWatch.length === 1 ? 'element' : lists.toWatch.length < 5 ? 'elementy' : 'elementów'}
                  </span>
                  <svg 
                    className={`w-6 h-6 text-blue-300 transition-transform duration-300 ${expandedSections.toWatch ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              {expandedSections.toWatch && (
                <div className="px-5 pb-5">
                  {lists.toWatch.length === 0 ? (
                    <p className="text-purple-300 text-center py-4">No items in this list</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {lists.toWatch.map(m => (
                        <div key={m._id} className="flex items-center gap-3 bg-white/5 rounded-lg p-3 hover:bg-white/10 transition-all border border-white/10">
                          <img 
                            src={m.posterUrl || 'https://via.placeholder.com/80x120?text=No+Image'} 
                            alt={m.title} 
                            className="w-12 h-16 object-cover rounded shadow-lg" 
                          />
                          <div className="flex-1 min-w-0">
                            <Link 
                              to={`/movies/${m._id}`} 
                              className="font-semibold text-purple-300 hover:text-pink-300 transition-colors block truncate"
                            >
                              {m.title}
                            </Link>
                            <div className="text-xs text-purple-400">{m.genre || '—'}</div>
                          </div>
                          <button 
                            onClick={()=>removeFromList(m._id)} 
                            className="px-3 py-1 text-sm bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white rounded-lg transition-all border border-red-500/30"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Watching */}
            <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
              <button 
                onClick={() => toggleSection('watching')}
                className="w-full flex items-center justify-between p-5 hover:bg-white/10 transition-all"
              >
                <h3 className="text-xl font-bold text-orange-300 flex items-center gap-2">
                  <span>▶️</span> Aktualnie oglądam
                </h3>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-orange-500/20 rounded-full text-sm text-orange-300 font-semibold border border-orange-500/30">
                    {lists.watching.length} {lists.watching.length === 1 ? 'element' : lists.watching.length < 5 ? 'elementy' : 'elementów'}
                  </span>
                  <svg 
                    className={`w-6 h-6 text-orange-300 transition-transform duration-300 ${expandedSections.watching ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              {expandedSections.watching && (
                <div className="px-5 pb-5">
                  {lists.watching.length === 0 ? (
                    <p className="text-purple-300 text-center py-4">No items in this list</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {lists.watching.map(m => (
                        <div key={m._id} className="flex items-center gap-3 bg-white/5 rounded-lg p-3 hover:bg-white/10 transition-all border border-white/10">
                          <img 
                            src={m.posterUrl || 'https://via.placeholder.com/80x120?text=No+Image'} 
                            alt={m.title} 
                            className="w-12 h-16 object-cover rounded shadow-lg" 
                          />
                          <div className="flex-1 min-w-0">
                            <Link 
                              to={`/movies/${m._id}`} 
                              className="font-semibold text-purple-300 hover:text-pink-300 transition-colors block truncate"
                            >
                              {m.title}
                            </Link>
                            <div className="text-xs text-purple-400">{m.genre || '—'}</div>
                          </div>
                          <button 
                            onClick={()=>removeFromList(m._id)} 
                            className="px-3 py-1 text-sm bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white rounded-lg transition-all border border-red-500/30"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Watched */}
            <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
              <button 
                onClick={() => toggleSection('watched')}
                className="w-full flex items-center justify-between p-5 hover:bg-white/10 transition-all"
              >
                <h3 className="text-xl font-bold text-green-300 flex items-center gap-2">
                  <span>✅</span> Obejrzane
                </h3>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-green-500/20 rounded-full text-sm text-green-300 font-semibold border border-green-500/30">
                    {lists.watched.length} {lists.watched.length === 1 ? 'element' : lists.watched.length < 5 ? 'elementy' : 'elementów'}
                  </span>
                  <svg 
                    className={`w-6 h-6 text-green-300 transition-transform duration-300 ${expandedSections.watched ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              {expandedSections.watched && (
                <div className="px-5 pb-5">
                  {lists.watched.length === 0 ? (
                    <p className="text-purple-300 text-center py-4">No items in this list</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {lists.watched.map(m => (
                        <div key={m._id} className="flex items-center gap-3 bg-white/5 rounded-lg p-3 hover:bg-white/10 transition-all border border-white/10">
                          <img 
                            src={m.posterUrl || 'https://via.placeholder.com/80x120?text=No+Image'} 
                            alt={m.title} 
                            className="w-12 h-16 object-cover rounded shadow-lg" 
                          />
                          <div className="flex-1 min-w-0">
                            <Link 
                              to={`/movies/${m._id}`} 
                              className="font-semibold text-purple-300 hover:text-pink-300 transition-colors block truncate"
                            >
                              {m.title}
                            </Link>
                            <div className="text-xs text-purple-400">{m.genre || '—'}</div>
                          </div>
                          <button 
                            onClick={()=>removeFromList(m._id)} 
                            className="px-3 py-1 text-sm bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white rounded-lg transition-all border border-red-500/30"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recently Watched Section */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
          <button 
            onClick={() => toggleSection('recentlyWatched')}
            className="w-full flex items-center justify-between p-6 md:p-8 hover:bg-white/5 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-white text-left">Ostatnio obejrzane</h2>
                <p className="text-purple-300 text-sm text-left">Twoja ostatnia aktywność</p>
              </div>
            </div>
            <svg 
              className={`w-8 h-8 text-white transition-transform duration-300 flex-shrink-0 ${expandedSections.recentlyWatched ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expandedSections.recentlyWatched && (
            <div className="px-6 md:px-8 pb-6 md:pb-8">
              {((user.watchedMovies && user.watchedMovies.length > 0) || (user.watchedEpisodes && user.watchedEpisodes.length > 0)) ? (
                <div className="space-y-3">
                  {[
                    ...(user.watchedMovies || []).map(wm => ({ ...wm, type: 'movie' })),
                    ...(user.watchedEpisodes || []).map(we => ({ ...we, type: 'episode' }))
                  ]
                    .sort((a, b) => new Date(b.watchedAt) - new Date(a.watchedAt))
                    .slice(0, 10)
                    .map((item, idx) => {
                      const movie = movies.find((m) => m._id === item.movieId);
                      
                      if (item.type === 'movie') {
                        return (
                          <div key={`movie-${idx}`} className="bg-white/5 rounded-xl p-3 md:p-4 border border-white/10 hover:bg-white/10 transition-all duration-300">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                              <div className="w-full sm:w-auto overflow-hidden">
                                <Link 
                                  to={`/movies/${item.movieId}`} 
                                  className="text-purple-300 text-sm md:text-base font-semibold hover:text-pink-300 transition-colors break-words"
                                >
                                  {movie?.title || 'Unknown'}
                                </Link>
                                <span className="ml-2 px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded-lg border border-green-500/30">
                                  🎬 Movie
                                </span>
                              </div>
                              <div className="text-xs text-purple-400">
                                {new Date(item.watchedAt).toLocaleDateString('pl-PL', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      } else {
                        const episode = movie?.episodes?.find((ep) => ep._id === item.episodeId);
                        return (
                          <div key={`episode-${idx}`} className="bg-white/5 rounded-xl p-3 md:p-4 border border-white/10 hover:bg-white/10 transition-all duration-300">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                              <div className="w-full sm:w-auto overflow-hidden">
                                <Link 
                                  to={`/movies/${item.movieId}`} 
                                  className="text-purple-300 text-sm md:text-base font-semibold hover:text-pink-300 transition-colors break-words"
                                >
                                  {movie?.title || 'Unknown'}
                                </Link>
                                {episode && (
                                  <span className="ml-2 text-purple-400 text-xs md:text-sm break-words block sm:inline">
                                    S{episode.seasonNumber}E{episode.episodeNumber}: {episode.title}
                                  </span>
                                )}
                                <span className="ml-2 px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-lg border border-purple-500/30">
                                  📺 Odcinek
                                </span>
                              </div>
                              <div className="text-xs text-purple-400">
                                {new Date(item.watchedAt).toLocaleDateString('pl-PL', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      }
                    })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🎬</div>
                  <p className="text-purple-300 text-lg">Brak dotychczas obejrzanych filmów lub odcinków</p>
                  <p className="text-purple-400 text-sm mt-2">Zacznij oglądać filmy, aby widzieć swoją aktywność tutaj</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
