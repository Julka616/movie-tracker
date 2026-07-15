const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const tmdb = require('../services/tmdb');

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

module.exports = router;
