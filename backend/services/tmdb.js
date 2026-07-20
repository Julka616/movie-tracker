// backend/services/tmdb.js
// Thin wrapper around the free TMDB API (https://developer.themoviedb.org/docs)
// Requires TMDB_API_KEY (a "v3 auth" API key, free to obtain) in the environment.

const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

function getApiKey() {
  const key = process.env.TMDB_API_KEY;
  if (!key) {
    const err = new Error('TMDB_API_KEY is not configured on the server');
    err.code = 'TMDB_NOT_CONFIGURED';
    throw err;
  }
  return key;
}

async function tmdbGet(path, params = {}) {
  const apiKey = getApiKey();
  const url = new URL(TMDB_BASE + path);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('language', 'pl-PL');
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  });

  const response = await fetch(url.toString());
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    const err = new Error(`TMDB request failed (${response.status}): ${body}`);
    err.status = response.status;
    throw err;
  }
  return response.json();
}

// Normalized search result shape, used for both movies and TV shows
function normalizeSearchResult(item, mediaType) {
  return {
    tmdbId: item.id,
    mediaType,
    title: mediaType === 'tv' ? item.name : item.title,
    year: (mediaType === 'tv' ? item.first_air_date : item.release_date)?.slice(0, 4) || '',
    posterUrl: item.poster_path ? IMAGE_BASE + item.poster_path : '',
    overview: item.overview || '',
    popularity: item.popularity,
  };
}

async function search(query, mediaType = 'movie') {
  const path = mediaType === 'tv' ? '/search/tv' : '/search/movie';
  const data = await tmdbGet(path, { query, include_adult: false });
  return (data.results || []).slice(0, 12).map((item) => normalizeSearchResult(item, mediaType));
}

async function multiSearch(query) {
  const data = await tmdbGet('/search/multi', { query, include_adult: false });
  return (data.results || [])
    .filter((item) => item.media_type === 'movie' || item.media_type === 'tv')
    .slice(0, 12)
    .map((item) => normalizeSearchResult(item, item.media_type));
}

async function getPopularMovies(count = 15) {
  const data = await tmdbGet('/movie/popular');
  return (data.results || []).slice(0, count).map((item) => normalizeSearchResult(item, 'movie'));
}

async function getPopularTv(count = 10) {
  const data = await tmdbGet('/tv/popular');
  return (data.results || []).slice(0, count).map((item) => normalizeSearchResult(item, 'tv'));
}

async function getMovieDetails(id) {
  const [details, credits, videos] = await Promise.all([
    tmdbGet(`/movie/${id}`),
    tmdbGet(`/movie/${id}/credits`),
    tmdbGet(`/movie/${id}/videos`),
  ]);

  const director = (credits.crew || []).find((c) => c.job === 'Director');
  const trailer = (videos.results || []).find((v) => v.site === 'YouTube' && v.type === 'Trailer')
    || (videos.results || []).find((v) => v.site === 'YouTube');

  return {
    title: details.title,
    year: details.release_date ? Number(details.release_date.slice(0, 4)) : undefined,
    genre: (details.genres || []).map((g) => g.name).join(', '),
    posterUrl: details.poster_path ? IMAGE_BASE + details.poster_path : '',
    description: details.overview || '',
    duration: details.runtime || undefined,
    director: director?.name || '',
    trailerUrl: trailer ? `https://www.youtube.com/embed/${trailer.key}` : '',
    type: 'movie',
  };
}

async function getTvDetails(id) {
  const [details, credits, videos] = await Promise.all([
    tmdbGet(`/tv/${id}`),
    tmdbGet(`/tv/${id}/credits`),
    tmdbGet(`/tv/${id}/videos`),
  ]);

  // TV shows don't have a single "director" credit; use created_by as a stand-in
  const creator = (details.created_by || [])[0];
  const trailer = (videos.results || []).find((v) => v.site === 'YouTube' && v.type === 'Trailer')
    || (videos.results || []).find((v) => v.site === 'YouTube');

  return {
    title: details.name,
    year: details.first_air_date ? Number(details.first_air_date.slice(0, 4)) : undefined,
    genre: (details.genres || []).map((g) => g.name).join(', '),
    posterUrl: details.poster_path ? IMAGE_BASE + details.poster_path : '',
    description: details.overview || '',
    duration: (details.episode_run_time || [])[0] || undefined,
    director: creator?.name || '',
    trailerUrl: trailer ? `https://www.youtube.com/embed/${trailer.key}` : '',
    type: 'series',
    seasons: (details.seasons || [])
      .filter((s) => s.season_number > 0)
      .map((s) => ({ seasonNumber: s.season_number, episodeCount: s.episode_count, name: s.name })),
  };
}

async function getSeasonEpisodes(tvId, seasonNumber) {
  const data = await tmdbGet(`/tv/${tvId}/season/${seasonNumber}`);
  return (data.episodes || []).map((ep) => ({
    episodeNumber: ep.episode_number,
    seasonNumber: ep.season_number,
    title: ep.name,
    description: ep.overview || '',
    duration: ep.runtime || undefined,
    airDate: ep.air_date || undefined,
  }));
}

module.exports = {
  search,
  multiSearch,
  getPopularMovies,
  getPopularTv,
  getMovieDetails,
  getTvDetails,
  getSeasonEpisodes,
};
