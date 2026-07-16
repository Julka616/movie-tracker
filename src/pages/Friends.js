import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API, { setToken } from '../services/api';

export default function Friends() {
  const navigate = useNavigate();
  const [friends, setFriends] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  const fetchFriendsData = useCallback(async () => {
    try {
      const [friendsRes, feedRes] = await Promise.all([
        API.get('/friends'),
        API.get('/friends/feed'),
      ]);
      setFriends(friendsRes.data.friends || []);
      setSentRequests(friendsRes.data.sentRequests || []);
      setReceivedRequests(friendsRes.data.receivedRequests || []);
      setFeed(feedRes.data || []);
    } catch (err) {
      console.error('Failed to fetch friends data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    setToken(token);
    fetchFriendsData();
  }, [navigate, fetchFriendsData]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await API.get('/friends/search', { params: { query } });
      setSearchResults(res.data);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearching(false);
    }
  };

  const flashMsg = (msg) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(''), 3000);
  };

  const sendRequest = async (userId) => {
    try {
      const res = await API.post(`/friends/request/${userId}`);
      flashMsg(res.data.msg);
      setSearchResults((prev) => prev.map((u) => (u._id === userId ? { ...u, status: res.data.status } : u)));
      fetchFriendsData();
    } catch (err) {
      flashMsg(err.response?.data?.msg || 'Błąd wysyłania zaproszenia');
    }
  };

  const acceptRequest = async (userId) => {
    try {
      await API.post(`/friends/accept/${userId}`);
      flashMsg('Zaakceptowano zaproszenie');
      fetchFriendsData();
    } catch (err) {
      flashMsg(err.response?.data?.msg || 'Błąd');
    }
  };

  const declineRequest = async (userId) => {
    try {
      await API.post(`/friends/decline/${userId}`);
      flashMsg('Zaproszenie odrzucone/anulowane');
      fetchFriendsData();
    } catch (err) {
      flashMsg(err.response?.data?.msg || 'Błąd');
    }
  };

  const removeFriend = async (userId) => {
    if (!window.confirm('Na pewno usunąć ze znajomych?')) return;
    try {
      await API.delete(`/friends/${userId}`);
      flashMsg('Usunięto ze znajomych');
      fetchFriendsData();
    } catch (err) {
      flashMsg(err.response?.data?.msg || 'Błąd');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <p className="text-purple-200 text-lg">Wczytywanie znajomych...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 flex items-center gap-3">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 text-transparent bg-clip-text">
                👥 Znajomi
              </span>
            </h1>
            <p className="text-purple-300 text-sm">Znajdź znajomych i zobacz co ostatnio oglądali</p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/profile"
              className="px-6 py-3 bg-white/10 backdrop-blur-sm text-white rounded-xl hover:bg-white/20 font-semibold transition-all duration-300 border border-white/20"
            >
              Profil
            </Link>
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

        {actionMsg && (
          <div className="mb-6 bg-purple-500/20 border border-purple-400/40 text-purple-100 rounded-xl px-4 py-3 text-sm">
            {actionMsg}
          </div>
        )}

        {/* Search */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-6 md:p-8 mb-8 border border-white/20">
          <h2 className="text-xl md:text-2xl font-bold text-white mb-4">Znajdź znajomych</h2>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              placeholder="Szukaj po imieniu lub e-mailu..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 p-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              type="submit"
              disabled={searching}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition disabled:opacity-50"
            >
              {searching ? 'Szukam...' : 'Szukaj'}
            </button>
          </form>

          {searchResults.length > 0 && (
            <div className="mt-5 space-y-2">
              {searchResults.map((u) => (
                <div key={u._id} className="flex items-center justify-between bg-white/5 rounded-xl p-4 border border-white/10">
                  <div>
                    <div className="text-white font-semibold">{u.name}</div>
                    <div className="text-purple-300 text-xs">{u.email}</div>
                  </div>
                  <FriendActionButton status={u.status} userId={u._id} onSend={sendRequest} onAccept={acceptRequest} onDecline={declineRequest} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Received requests */}
        {receivedRequests.length > 0 && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-6 md:p-8 mb-8 border border-white/20">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-4">Zaproszenia do Ciebie</h2>
            <div className="space-y-2">
              {receivedRequests.map((u) => (
                <div key={u._id} className="flex items-center justify-between bg-white/5 rounded-xl p-4 border border-white/10">
                  <div>
                    <div className="text-white font-semibold">{u.name}</div>
                    <div className="text-purple-300 text-xs">{u.email}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => acceptRequest(u._id)}
                      className="px-4 py-2 bg-green-500/80 hover:bg-green-500 text-white rounded-lg text-sm font-semibold transition"
                    >
                      Akceptuj
                    </button>
                    <button
                      onClick={() => declineRequest(u._id)}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 text-purple-200 rounded-lg text-sm font-semibold transition border border-white/20"
                    >
                      Odrzuć
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sent requests */}
        {sentRequests.length > 0 && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-6 md:p-8 mb-8 border border-white/20">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-4">Wysłane zaproszenia</h2>
            <div className="space-y-2">
              {sentRequests.map((u) => (
                <div key={u._id} className="flex items-center justify-between bg-white/5 rounded-xl p-4 border border-white/10">
                  <div>
                    <div className="text-white font-semibold">{u.name}</div>
                    <div className="text-purple-300 text-xs">{u.email}</div>
                  </div>
                  <button
                    onClick={() => declineRequest(u._id)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-purple-200 rounded-lg text-sm font-semibold transition border border-white/20"
                  >
                    Anuluj
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Friends list */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-6 md:p-8 mb-8 border border-white/20">
          <h2 className="text-xl md:text-2xl font-bold text-white mb-4">
            Twoi znajomi <span className="text-purple-300 text-base font-normal">({friends.length})</span>
          </h2>
          {friends.length === 0 ? (
            <p className="text-purple-300 text-center py-6">Nie masz jeszcze żadnych znajomych — wyszukaj kogoś powyżej!</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {friends.map((f) => (
                <div key={f._id} className="flex items-center justify-between bg-white/5 rounded-xl p-4 border border-white/10">
                  <div>
                    <div className="text-white font-semibold">{f.name}</div>
                    <div className="text-purple-300 text-xs">{f.email}</div>
                  </div>
                  <button
                    onClick={() => removeFriend(f._id)}
                    className="px-3 py-1 text-xs bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white rounded-lg transition border border-red-500/30"
                  >
                    Usuń
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity feed */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-6 md:p-8 border border-white/20">
          <h2 className="text-xl md:text-2xl font-bold text-white mb-4">Co oglądają znajomi</h2>
          {feed.length === 0 ? (
            <p className="text-purple-300 text-center py-6">
              Brak aktywności — dodaj znajomych i wróć tu, gdy zaczną coś oglądać.
            </p>
          ) : (
            <div className="space-y-3">
              {feed.map((item, idx) => (
                <Link
                  key={idx}
                  to={`/movies/${item.movieId}`}
                  className="flex items-center gap-4 bg-white/5 rounded-xl p-3 border border-white/10 hover:bg-white/10 transition-all"
                >
                  <img
                    src={item.posterUrl || 'https://via.placeholder.com/60x90?text=No+Image'}
                    alt={item.title}
                    className="w-12 h-16 object-cover rounded shadow-lg flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold truncate">
                      <span className="text-pink-300">{item.friendName}</span>{' '}
                      {item.type === 'episode' ? 'obejrzał(a) odcinek' : 'obejrzał(a)'}{' '}
                      <span className="text-purple-200">{item.title}</span>
                      {item.episodeLabel && <span className="text-purple-400"> ({item.episodeLabel})</span>}
                    </div>
                    <div className="text-purple-400 text-xs">
                      {new Date(item.date).toLocaleDateString('pl-PL', { year: 'numeric', month: 'short', day: 'numeric' })}
                      {item.score && <span className="ml-2 text-yellow-400">{'⭐'.repeat(item.score)}</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FriendActionButton({ status, userId, onSend, onAccept, onDecline }) {
  if (status === 'friend') {
    return <span className="px-4 py-2 bg-green-500/20 text-green-300 rounded-lg text-sm font-semibold border border-green-500/30">Znajomi ✓</span>;
  }
  if (status === 'sent') {
    return (
      <button
        onClick={() => onDecline(userId)}
        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-purple-200 rounded-lg text-sm font-semibold transition border border-white/20"
      >
        Anuluj zaproszenie
      </button>
    );
  }
  if (status === 'received') {
    return (
      <div className="flex gap-2">
        <button
          onClick={() => onAccept(userId)}
          className="px-4 py-2 bg-green-500/80 hover:bg-green-500 text-white rounded-lg text-sm font-semibold transition"
        >
          Akceptuj
        </button>
        <button
          onClick={() => onDecline(userId)}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-purple-200 rounded-lg text-sm font-semibold transition border border-white/20"
        >
          Odrzuć
        </button>
      </div>
    );
  }
  return (
    <button
      onClick={() => onSend(userId)}
      className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-semibold hover:from-purple-600 hover:to-pink-600 transition"
    >
      + Dodaj do znajomych
    </button>
  );
}
