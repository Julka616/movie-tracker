import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API, { setToken } from '../services/api';

const MONTH_LABELS = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];

export default function Stats() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    setToken(token);
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const fetchStats = async () => {
    try {
      const res = await API.get('/users/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      setError('Nie udało się wczytać statystyk.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <p className="text-purple-200 text-lg">Liczymy Twoje seanse...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <p className="text-red-300 text-lg">{error || 'Brak danych'}</p>
      </div>
    );
  }

  const { totals, genreBreakdown, monthlyActivity, weekdayActivity, streak, yearlyReview, topRated } = stats;

  const maxMonthly = Math.max(1, ...monthlyActivity.map((m) => m.count));
  const maxWeekday = Math.max(1, ...weekdayActivity.map((d) => d.count));
  const maxGenreCount = Math.max(1, ...genreBreakdown.map((g) => g.count));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 flex items-center gap-3">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 text-transparent bg-clip-text">
                📊 Statystyki
              </span>
            </h1>
            <p className="text-purple-300 text-sm">Twoja aktywność oglądania w liczbach</p>
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

        {/* Top stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <StatCard emoji="⏱️" value={`${totals.totalHours}h`} label="Czas oglądania" color="from-blue-500 to-blue-600" />
          <StatCard emoji="🎬" value={totals.moviesWatched} label="Filmy" color="from-green-500 to-emerald-600" />
          <StatCard emoji="📺" value={totals.episodesWatched} label="Odcinki" color="from-pink-500 to-rose-600" />
          <StatCard emoji="⭐" value={totals.avgRatingGiven || '—'} label="Śr. ocena" color="from-yellow-500 to-orange-500" />
          <StatCard emoji="🔥" value={streak.current} label="Passa (dni)" color="from-red-500 to-orange-600" />
          <StatCard emoji="🏆" value={streak.longest} label="Najdł. passa" color="from-purple-500 to-indigo-600" />
        </div>

        {/* Monthly activity */}
        <Section title="Aktywność w ostatnich 12 miesiącach" emoji="📅" color="from-indigo-500 to-purple-500">
          <div className="flex items-end gap-2 h-40">
            {monthlyActivity.map((m) => {
              const [y, mo] = m.month.split('-');
              const heightPct = Math.max(4, (m.count / maxMonthly) * 100);
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1 group">
                  <div className="text-[10px] text-purple-300 opacity-0 group-hover:opacity-100 transition-opacity">{m.count}</div>
                  <div
                    className="w-full bg-gradient-to-t from-purple-600 to-pink-400 rounded-t-md transition-all duration-300"
                    style={{ height: `${heightPct}%` }}
                  />
                  <div className="text-[10px] text-purple-400 whitespace-nowrap">
                    {MONTH_LABELS[Number(mo) - 1]}<span className="hidden md:inline"> '{y.slice(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        {/* Weekday activity */}
        <Section title="W jakie dni tygodnia oglądasz najwięcej" emoji="🗓️" color="from-cyan-500 to-blue-500">
          <div className="flex items-end gap-3 h-32">
            {weekdayActivity.map((d) => {
              const heightPct = Math.max(4, (d.count / maxWeekday) * 100);
              return (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-[11px] text-cyan-200">{d.count}</div>
                  <div
                    className="w-full bg-gradient-to-t from-cyan-600 to-blue-400 rounded-t-md transition-all duration-300"
                    style={{ height: `${heightPct}%` }}
                  />
                  <div className="text-xs text-cyan-300 font-semibold">{d.day}</div>
                </div>
              );
            })}
          </div>
        </Section>

        {/* Genre breakdown */}
        {genreBreakdown.length > 0 && (
          <Section title="Ulubione gatunki" emoji="🎭" color="from-fuchsia-500 to-pink-500">
            <div className="space-y-3">
              {genreBreakdown.slice(0, 8).map((g) => (
                <div key={g.genre}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white font-semibold">{g.genre}</span>
                    <span className="text-purple-300">{g.count} {g.count === 1 ? 'tytuł' : 'tytułów'}</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-fuchsia-500 to-pink-400 rounded-full"
                      style={{ width: `${(g.count / maxGenreCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Year in review */}
        {yearlyReview.length > 0 && (
          <Section title="Podsumowanie lat" emoji="🗂️" color="from-teal-500 to-emerald-500">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {yearlyReview.slice().reverse().map((y) => (
                <div key={y.year} className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="text-2xl font-bold text-white mb-2">{y.year}</div>
                  <div className="text-sm text-purple-300">🎬 {y.moviesWatched} filmów</div>
                  <div className="text-sm text-purple-300">📺 {y.episodesWatched} odcinków</div>
                  <div className="text-sm text-purple-300">⏱️ {Math.floor(y.minutes / 60)}h {y.minutes % 60}m</div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Top rated */}
        {topRated.length > 0 && (
          <Section title="Twoje TOP oceny" emoji="⭐" color="from-yellow-500 to-orange-500">
            <div className="space-y-3">
              {topRated.map((item, idx) => (
                <Link
                  key={item.movieId}
                  to={`/movies/${item.movieId}`}
                  className="flex items-center justify-between bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl text-purple-400 font-bold">{idx + 1}.</span>
                    <span className="text-white font-semibold">{item.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-400">{'⭐'.repeat(item.score)}</span>
                    <span className="text-purple-300 font-bold">{item.score}/5</span>
                  </div>
                </Link>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

function StatCard({ emoji, value, label, color }) {
  return (
    <div className={`bg-gradient-to-br ${color} rounded-2xl p-4 text-white shadow-xl`}>
      <div className="text-2xl mb-1 opacity-80">{emoji}</div>
      <div className="text-2xl md:text-3xl font-bold">{value}</div>
      <div className="text-[11px] uppercase tracking-wide opacity-90">{label}</div>
    </div>
  );
}

function Section({ title, emoji, color, children }) {
  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-6 md:p-8 mb-8 border border-white/20">
      <div className="flex items-center gap-3 mb-6">
        <div className={`p-3 bg-gradient-to-br ${color} rounded-xl text-xl`}>{emoji}</div>
        <h2 className="text-xl md:text-2xl font-bold text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}