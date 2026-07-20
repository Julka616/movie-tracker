const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const tmdb = require('../services/tmdb');
const Movie = require('../models/Movie');

// GET /api/tmdb/search?query=&type=movie|tv|multi
router.get('/search', auth, admin, async (req, res) => {
  const { query, type } = req.query;
  if (!query || !query.trim()) {
    return res.status(400).json({ msg: 'query is required' });
  }

  try {
    const results = type === 'multi'
      ? await tmdb.multiSearch(query.trim())
      : await tmdb.search(query.trim(), type === 'tv' ? 'tv' : 'movie');
    res.json(results);
  } catch (err) {
    if (err.code === 'TMDB_NOT_CONFIGURED') {
      return res.status(503).json({ msg: 'Integracja TMDB nie jest skonfigurowana (brak TMDB_API_KEY na serwerze)' });
    }
    console.error('TMDB SEARCH ERROR:', err);
    res.status(502).json({ msg: 'Błąd komunikacji z TMDB' });
  }
});

// GET /api/tmdb/details/:type/:id  (type: movie|tv)
router.get('/details/:type/:id', auth, admin, async (req, res) => {
  const { type, id } = req.params;
  if (!['movie', 'tv'].includes(type)) {
    return res.status(400).json({ msg: 'type must be "movie" or "tv"' });
  }

  try {
    const details = type === 'tv'
      ? await tmdb.getTvDetails(id)
      : await tmdb.getMovieDetails(id);
    res.json(details);
  } catch (err) {
    if (err.code === 'TMDB_NOT_CONFIGURED') {
      return res.status(503).json({ msg: 'Integracja TMDB nie jest skonfigurowana (brak TMDB_API_KEY na serwerze)' });
    }
    console.error('TMDB DETAILS ERROR:', err);
    res.status(502).json({ msg: 'Błąd komunikacji z TMDB' });
  }
});

// GET /api/tmdb/season/:tvId/:seasonNumber - episode list for a TV season
router.get('/season/:tvId/:seasonNumber', auth, admin, async (req, res) => {
  const { tvId, seasonNumber } = req.params;
  try {
    const episodes = await tmdb.getSeasonEpisodes(tvId, seasonNumber);
    res.json(episodes);
  } catch (err) {
    if (err.code === 'TMDB_NOT_CONFIGURED') {
      return res.status(503).json({ msg: 'Integracja TMDB nie jest skonfigurowana (brak TMDB_API_KEY na serwerze)' });
    }
    console.error('TMDB SEASON ERROR:', err);
    res.status(502).json({ msg: 'Błąd komunikacji z TMDB' });
  }
});

// POST /api/tmdb/import-popular - one-click bulk import of currently popular movies/series
router.post('/import-popular', auth, admin, async (req, res) => {
  try {
    const movieCount = Math.min(Number(req.body?.movieCount) || 15, 30);
    const seriesCount = Math.min(Number(req.body?.seriesCount) || 10, 30);

    const [popularMovies, popularSeries] = await Promise.all([
      tmdb.getPopularMovies(movieCount),
      tmdb.getPopularTv(seriesCount),
    ]);

    const added = [];
    const skipped = [];

    for (const item of [...popularMovies, ...popularSeries]) {
      try {
        const existing = await Movie.findOne({ title: item.title });
        if (existing) {
          skipped.push(item.title);
          continue;
        }

        const details = item.mediaType === 'tv'
          ? await tmdb.getTvDetails(item.tmdbId)
          : await tmdb.getMovieDetails(item.tmdbId);

        const movie = new Movie({
          title: details.title,
          director: details.director,
          year: details.year,
          genre: details.genre,
          posterUrl: details.posterUrl,
          description: details.description,
          trailerUrl: details.trailerUrl,
          duration: details.duration,
          type: details.type,
          tmdbId: item.tmdbId,
        });
        await movie.save();
        added.push(movie.title);
      } catch (innerErr) {
        console.error('IMPORT ITEM ERROR:', item.title, innerErr.message);
        skipped.push(item.title);
      }
    }

    res.json({ added, skipped });
  } catch (err) {
    if (err.code === 'TMDB_NOT_CONFIGURED') {
      return res.status(503).json({ msg: 'Integracja TMDB nie jest skonfigurowana (brak TMDB_API_KEY na serwerze)' });
    }
    console.error('IMPORT POPULAR ERROR:', err);
    res.status(500).json({ msg: 'Błąd importu z TMDB' });
  }
});

module.exports = router;
