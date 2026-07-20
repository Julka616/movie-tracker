import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import API, { setToken } from '../services/api';

// Icon components
const UsersIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const MovieIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
  </svg>
);

const TvIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const ListIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
  </svg>
);

const StarIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);

export default function AdminPanel() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('');
  const [year, setYear] = useState('');
  const [pageMovie, setPageMovie] = useState(1);
  const [pageSeries, setPageSeries] = useState(1);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const pageSize = 8;
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalMovies: 0,
    totalSeries: 0,
    totalRatings: 0,
    totalEpisodes: 0,
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    setToken(token);
    
    try {
      const decoded = jwtDecode(token);
      if (decoded.user?.role !== 'admin') {
        navigate('/movies');
        return;
      }
    } catch (err) {
      navigate('/login');
      return;
    }

    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    try {
      const [usersRes, moviesRes] = await Promise.all([
        API.get('/users'),
        API.get('/movies'),
      ]);
      
      setUsers(usersRes.data);
      setMovies(moviesRes.data);
      
      calculateStats(usersRes.data, moviesRes.data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setLoading(false);
    }
  };

  const handleDeleteMovie = async (movieId) => {
    if (!window.confirm('Usunąć ten tytuł?')) return;
    try {
      await API.delete(`/movies/${movieId}`);
      fetchData();
    } catch (err) {
      console.error('Failed to delete movie:', err);
      alert('Nie można usunąć tego tytułu');
    }
  };

  const handleImportPopular = async () => {
    if (!window.confirm('Zaimportować ok. 25 popularnych filmów i seriali z TMDB? To może potrwać kilkanaście-kilkadziesiąt sekund.')) return;
    setImporting(true);
    setImportMsg('');
    try {
      const res = await API.post('/tmdb/import-popular', { movieCount: 15, seriesCount: 10 });
      setImportMsg(`Dodano ${res.data.added.length} nowych tytułów (pominięto ${res.data.skipped.length}, bo już istniały lub wystąpił błąd).`);
      fetchData();
    } catch (err) {
      setImportMsg(err.response?.data?.msg || 'Nie udało się zaimportować tytułów z TMDB.');
    } finally {
      setImporting(false);
    }
  };

  const calculateStats = (usersData, moviesData) => {
    const totalRatings = moviesData.reduce((acc, movie) => acc + (movie.ratings?.length || 0), 0);
    const series = moviesData.filter(m => m.type === 'series');
    const totalEpisodes = series.reduce((acc, s) => acc + (s.episodes?.length || 0), 0);

    setStats({
      totalUsers: usersData.length,
      totalMovies: moviesData.filter(m => m.type === 'movie').length,
      totalSeries: series.length,
      totalRatings,
      totalEpisodes,
    });
  };

  const filterMovies = (type) => {
    return (movies || [])
      .filter(m => m.type === type)
      .filter(m => !search || m.title?.toLowerCase().includes(search.toLowerCase()))
      .filter(m => !genre || (m.genre || '').toLowerCase().includes(genre.toLowerCase()))
      .filter(m => !year || String(m.year || '').startsWith(String(year)));
  };

  const handleBlockUser = async (userId) => {
    try {
      await API.put(`/users/${userId}/block`);
      fetchData();
    } catch (err) {
      console.error('Failed to block user:', err);
      alert('Błąd podczas blokowania użytkownika');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mb-4"></div>
          <p className="text-white text-lg font-medium">Ładowanie Panelu Administratora...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 flex items-center gap-3">
              <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-transparent bg-clip-text">
                 Panel Administratora
              </span>
            </h1>
            <p className="text-purple-300 text-sm">Zarządzaj treścią platformy i użytkownikami</p>
          </div>
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

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6 mb-8">
          <div className="group bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-2xl p-6 text-white hover:scale-105 transition-transform duration-300 cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <UsersIcon />
              <div className="text-4xl font-bold opacity-20">👥</div>
            </div>
            <div className="text-4xl font-bold mb-2">{stats.totalUsers}</div>
            <div className="text-sm text-blue-100 uppercase tracking-wide font-semibold">Liczba Użytkowników</div>
            <div className="mt-3 pt-3 border-t border-blue-400/30 text-xs text-blue-100">
              Zarejestrowani użytkownicy
            </div>
          </div>

          <div className="group bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-2xl p-6 text-white hover:scale-105 transition-transform duration-300 cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <MovieIcon />
              <div className="text-4xl font-bold opacity-20">🎬</div>
            </div>
            <div className="text-4xl font-bold mb-2">{stats.totalMovies}</div>
            <div className="text-sm text-green-100 uppercase tracking-wide font-semibold">Filmy</div>
            <div className="mt-3 pt-3 border-t border-green-400/30 text-xs text-green-100">
              Dostępne filmy
            </div>
          </div>

          <div className="group bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl shadow-2xl p-6 text-white hover:scale-105 transition-transform duration-300 cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <TvIcon />
              <div className="text-4xl font-bold opacity-20">📺</div>
            </div>
            <div className="text-4xl font-bold mb-2">{stats.totalSeries}</div>
            <div className="text-sm text-purple-100 uppercase tracking-wide font-semibold">Seriale</div>
            <div className="mt-3 pt-3 border-t border-purple-400/30 text-xs text-purple-100">
              Telewizyjne seriale
            </div>
          </div>

          <div className="group bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-2xl p-6 text-white hover:scale-105 transition-transform duration-300 cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <ListIcon />
              <div className="text-4xl font-bold opacity-20">📋</div>
            </div>
            <div className="text-4xl font-bold mb-2">{stats.totalEpisodes}</div>
            <div className="text-sm text-orange-100 uppercase tracking-wide font-semibold">Odcinki</div>
            <div className="mt-3 pt-3 border-t border-orange-400/30 text-xs text-orange-100">
              Razem odcinków
            </div>
          </div>

          <div className="group bg-gradient-to-br from-yellow-500 to-amber-600 rounded-2xl shadow-2xl p-6 text-white hover:scale-105 transition-transform duration-300 cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <StarIcon />
              <div className="text-4xl font-bold opacity-20">⭐</div>
            </div>
            <div className="text-4xl font-bold mb-2">{stats.totalRatings}</div>
            <div className="text-sm text-yellow-100 uppercase tracking-wide font-semibold">Oceny</div>
            <div className="mt-3 pt-3 border-t border-yellow-400/30 text-xs text-yellow-100">
              Recenzje użytkowników
            </div>
          </div>
        </div>

        {/* Content Management Section */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-6 md:p-8 mb-8 border border-white/20">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white">Zarządzanie Treścią</h2>
              <p className="text-purple-300 text-sm">Dodaj i zarządzaj filmami oraz serialami</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mb-6">
            <Link
              to="/movies/add?type=movie"
              className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <PlusIcon />
              Dodaj Film
            </Link>
            <Link
              to="/movies/add?type=series"
              className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-xl hover:from-purple-600 hover:to-violet-700 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <PlusIcon />
              Dodaj Serial
            </Link>
            <button
              onClick={handleImportPopular}
              disabled={importing}
              className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-xl hover:from-blue-600 hover:to-cyan-700 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {importing ? 'Importuję...' : '⚡ Zaimportuj popularne z TMDB'}
            </button>
          </div>

          {importMsg && (
            <div className="mb-6 bg-blue-500/20 border border-blue-400/40 text-blue-100 rounded-xl px-4 py-3 text-sm">
              {importMsg}
            </div>
          )}

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="relative md:col-span-2">
              <SearchIcon />
              <input
                type="text"
                placeholder="Szukaj po tytule..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPageMovie(1); setPageSeries(1); }}
                className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>
            <input
              type="text"
              placeholder="Gatunek..."
              value={genre}
              onChange={(e) => { setGenre(e.target.value); setPageMovie(1); setPageSeries(1); }}
              className="px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />
            <input
              type="number"
              placeholder="Rok"
              value={year}
              onChange={(e) => { setYear(e.target.value); setPageMovie(1); setPageSeries(1); }}
              className="px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />
          </div>

          <button
            onClick={() => { setSearch(''); setGenre(''); setYear(''); setPageMovie(1); setPageSeries(1); }}
            className="px-6 py-2 bg-white/10 backdrop-blur-sm text-purple-200 rounded-xl hover:bg-white/20 font-medium transition-all duration-300 border border-white/20 mb-6"
          >
            Resetuj Filtry
          </button>

          {/* Movies and Series Lists */}
          <div className="grid grid-cols-1 gap-6">
            {['movie','series'].map(type => {
              const filtered = filterMovies(type);
              const total = filtered.length;
              const currentPage = type === 'movie' ? pageMovie : pageSeries;
              const start = (currentPage - 1) * pageSize;
              const pageItems = filtered.slice(start, start + pageSize);
              const totalPages = Math.max(1, Math.ceil(total / pageSize));

              return (
                <div key={type} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <span className="text-2xl">{type === 'movie' ? '🎬' : '📺'}</span>
                      {type === 'movie' ? 'Lista Filmów' : 'Lista Seriali'}
                    </h3>
                    <span className="px-3 py-1 bg-white/10 rounded-full text-sm text-purple-200 font-semibold">
                      {total} elementów
                    </span>
                  </div>

                  {total === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">📭</div>
                      <p className="text-purple-300 text-lg">Nie znaleziono elementów</p>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto rounded-xl">
                        <table className="w-full text-sm">
                          <thead className="bg-white/10 backdrop-blur-sm">
                            <tr>
                              <th className="px-4 py-3 text-left text-white font-semibold">Tytuł</th>
                              <th className="px-4 py-3 text-left text-white font-semibold">Rok</th>
                              <th className="px-4 py-3 text-left text-white font-semibold">Gatunek</th>
                              <th className="px-4 py-3 text-left text-white font-semibold">Typ</th>
                              <th className="px-4 py-3 text-center text-white font-semibold">Akcje</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/10">
                            {pageItems.map(movie => (
                              <tr key={movie._id} className="hover:bg-white/5 transition-colors">
                                <td className="px-4 py-3 font-semibold text-purple-200">{movie.title}</td>
                                <td className="px-4 py-3 text-purple-300">{movie.year || '—'}</td>
                                <td className="px-4 py-3 text-purple-300">{movie.genre || '—'}</td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                                    movie.type === 'movie' 
                                      ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                                      : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  }`}>
                                    {movie.type === 'movie' ? 'Film' : 'Serial'}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex gap-2 justify-center flex-wrap">
                                    <button
                                      onClick={() => navigate(`/movies/${movie._id}/edit`)}
                                      className="group flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500 hover:text-white border border-blue-500/30 hover:border-blue-500 transition-all duration-300"
                                      title="Edytuj"
                                    >
                                      <EditIcon />
                                      <span className="hidden sm:inline">Edytuj</span>
                                    </button>
                                    <button
                                      onClick={() => handleDeleteMovie(movie._id)}
                                      className="group flex items-center gap-1 px-3 py-2 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500 hover:text-white border border-red-500/30 hover:border-red-500 transition-all duration-300"
                                      title="Usuń"
                                    >
                                      <TrashIcon />
                                      <span className="hidden sm:inline">Usuń</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-4 mt-6">
                          <button
                            onClick={() => type === 'movie' ? setPageMovie(Math.max(1, currentPage - 1)) : setPageSeries(Math.max(1, currentPage - 1))}
                            className="px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-lg hover:bg-white/20 font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border border-white/20"
                            disabled={currentPage === 1}
                          >
                            ← Poprzednia
                          </button>
                          <span className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg text-white font-semibold border border-white/20">
                            Strona {currentPage} z {totalPages}
                          </span>
                          <button
                            onClick={() => type === 'movie' ? setPageMovie(Math.min(totalPages, currentPage + 1)) : setPageSeries(Math.min(totalPages, currentPage + 1))}
                            className="px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-lg hover:bg-white/20 font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border border-white/20"
                            disabled={currentPage === totalPages}
                          >
                            Następna →
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Lista użytkowników */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-indigo-600 mb-4">Zarządzanie Użytkownikami</h2>
          {users.length === 0 ? (
            <p className="text-gray-600 text-center py-4">Brak użytkowników w systemie</p>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b-2 border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Imię i Nazwisko</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Rola</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Zarejestrowany</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Akcje</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user._id} className={user.blocked ? 'bg-red-50' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-3 text-sm">{user.name}</td>
                    <td className="px-4 py-3 text-sm">{user.email}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {user.role === 'admin' ? 'Admin' : 'Użytkownik'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        user.blocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {user.blocked ? '🚫 Zablokowany' : '✅ Aktywny'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(user.createdAt).toLocaleDateString('pl-PL')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {user.role !== 'admin' && (
                        <button
                          onClick={() => handleBlockUser(user._id)}
                          className={`px-3 py-1 rounded text-sm font-semibold ${
                            user.blocked
                              ? 'bg-green-600 text-white hover:bg-green-700'
                              : 'bg-red-600 text-white hover:bg-red-700'
                          }`}
                        >
                          {user.blocked ? 'Odblokuj' : 'Zablokuj'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
