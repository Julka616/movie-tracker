import React, { useState } from 'react';
import API from '../services/api';

export default function EpisodesAccordion({ episodes, userWatchedEpisodes = [], onUpdate, movieId }) {
  const [expandedSeasons, setExpandedSeasons] = useState({});
  const [loadingEpisodeId, setLoadingEpisodeId] = useState(null);

  const toggleSeason = (season) => {
    setExpandedSeasons(prev => ({
      ...prev,
      [season]: !prev[season]
    }));
  };

  const toggleWatched = async (episodeId, isWatched, seasonNumber, episodeNumber) => {
    try {
      const scrollPosition = window.scrollY;
      setLoadingEpisodeId(episodeId);
      
      console.log('Toggle watched - movieId:', movieId, 'episodeId:', episodeId, 'season:', seasonNumber, 'episode:', episodeNumber);
      
      if (!movieId) {
        alert('Błąd: brak identyfikatora filmu');
        setLoadingEpisodeId(null);
        return;
      }
      
      if (isWatched) {
        await API.delete(`/movies/${movieId}/episodes/${episodeId}/watch`);
      } else {
        await API.post(`/movies/${movieId}/episodes/${episodeId}/watch`, { seasonNumber, episodeNumber });
      }
      
      if (onUpdate) {
        onUpdate();
      }
      
      setTimeout(() => {
        window.scrollTo(0, scrollPosition);
        setLoadingEpisodeId(null);
      }, 50);
    } catch (err) {
      console.error('Failed to toggle watched:', err);
      setLoadingEpisodeId(null);
      if (err.response?.status === 401) {
        alert('Sesja wygasła. Zaloguj się ponownie.');
        localStorage.removeItem('token');
        window.location.href = '/login';
      } else {
        alert(`Błąd podczas zaznaczania odcinka: ${err.response?.data?.msg || err.message}`);
      }
    }
  };

  const isEpisodeWatched = (episodeId) => {
    return userWatchedEpisodes?.some(we => we.episodeId?.toString() === episodeId?.toString());
  };

  // Grupowanie odcinków po sezonach
  const groupedEpisodes = episodes.reduce((acc, ep) => {
    const season = ep.seasonNumber || 1;
    if (!acc[season]) acc[season] = [];
    acc[season].push(ep);
    return acc;
  }, {});

  const seasons = Object.keys(groupedEpisodes || {}).sort((a, b) => a - b);

  return (
    <div className="space-y-4">
      {seasons.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📺</div>
          <p className="text-slate-500 text-lg">Brak odcinków</p>
        </div>
      ) : (
        seasons.map((season) => {
          const watchedCount = groupedEpisodes[season].filter(ep => isEpisodeWatched(ep._id)).length;
          const totalCount = groupedEpisodes[season].length;
          const progressPercent = totalCount > 0 ? Math.round((watchedCount / totalCount) * 100) : 0;
          
          return (
            <div key={season} className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl overflow-hidden shadow-lg border border-slate-200 hover:shadow-xl transition-all duration-300">
              {/* Season Header */}
              <button
                onClick={() => toggleSeason(season)}
                className="w-full flex items-center justify-between p-5 hover:bg-slate-100/50 transition-all duration-300"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-xl p-3 shadow-lg">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-slate-900">
                        Sezon {season}
                      </span>
                      <span className="px-3 py-1 bg-slate-200 rounded-full text-sm text-slate-700 font-semibold">
                        {totalCount} {totalCount === 1 ? 'odcinek' : totalCount < 5 ? 'odcinki' : 'odcinków'}
                      </span>
                    </div>
                    {watchedCount > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="w-32 h-2 bg-slate-300 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-green-600">
                          {watchedCount}/{totalCount} ({progressPercent}%)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <svg 
                  className={`w-7 h-7 text-slate-600 transition-transform duration-300 flex-shrink-0 ${expandedSeasons[season] ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Episodes List */}
              {expandedSeasons[season] && (
                <div className="bg-white/50 backdrop-blur-sm">
                  {groupedEpisodes[season]
                    .sort((a, b) => (a.episodeNumber ?? a.number ?? 0) - (b.episodeNumber ?? b.number ?? 0))
                    .map((episode, idx) => {
                      const watched = isEpisodeWatched(episode._id);
                      const epNum = episode.episodeNumber ?? episode.number ?? (idx + 1);
                      return (
                        <div
                          key={episode._id}
                          className={`p-4 border-b border-slate-200 last:border-b-0 transition-all duration-300 ${
                            watched 
                              ? 'bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100' 
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            {/* Custom Checkbox */}
                            <label className="relative flex items-center cursor-pointer mt-1">
                              <input
                                type="checkbox"
                                checked={watched}
                                onChange={() => toggleWatched(episode._id, watched, episode.seasonNumber, epNum)}
                                disabled={loadingEpisodeId === episode._id}
                                className="sr-only peer"
                              />
                              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-300 ${
                                loadingEpisodeId === episode._id
                                  ? 'bg-gray-200 border-gray-300 cursor-not-allowed'
                                  : watched 
                                    ? 'bg-gradient-to-br from-green-500 to-emerald-600 border-green-500 shadow-lg shadow-green-200' 
                                    : 'border-slate-300 bg-white hover:border-slate-400'
                              }`}>
                                {loadingEpisodeId === episode._id ? (
                                  <svg className="w-4 h-4 text-gray-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                ) : watched ? (
                                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                ) : null}
                              </div>
                            </label>

                            {/* Episode Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3">
                                <h4 className={`font-semibold text-lg ${watched ? 'text-green-900' : 'text-slate-900'}`}>
                                  <span className="inline-block px-2 py-0.5 bg-slate-200 rounded text-sm mr-2">
                                    S{episode.seasonNumber}E{epNum}
                                  </span>
                                  {episode.title}
                                </h4>
                                {watched && (
                                  <span className="flex-shrink-0 text-2xl">✓</span>
                                )}
                              </div>
                              {episode.description && (
                                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                                  {episode.description}
                                </p>
                              )}
                              <div className="flex flex-wrap items-center gap-4 mt-3">
                                {episode.duration && (
                                  <span className="flex items-center gap-1.5 text-sm text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {episode.duration} min
                                  </span>
                                )}
                                {episode.airDate && (
                                  <span className="flex items-center gap-1.5 text-sm text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    {new Date(episode.airDate).toLocaleDateString('pl-PL')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
