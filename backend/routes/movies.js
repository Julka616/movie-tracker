const express = require('express');
const router = express.Router();
const Movie = require('../models/Movie');
const User = require('../models/User');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const tmdb = require('../services/tmdb');

// Dodanie filmu (tylko admin)
router.post('/', auth, admin, async (req, res) => {
  const { title, director, year, genre, posterUrl, type, description, trailerUrl, duration } = req.body;
  try {
    const movie = new Movie({ 
      title, 
      director, 
      year, 
      genre, 
      posterUrl, 
      type, 
      description, 
      trailerUrl, 
      duration,
      ratings: [] // Zawsze inicjalizuj ratings jako pustą tablicę
    });
    await movie.save();
    res.json(movie);
  } catch (err) {
    console.error('MOVIE CREATE ERROR:', err);
    res.status(500).send('Server error');
  }
});

// Pobranie wszystkich filmów z wyszukiwaniem, filtrami i sortowaniem
// GET /api/movies?search=&genre=&year=&type=&sort=
router.get('/', async (req, res) => {
  try {
    const { search, genre, year, type, sort } = req.query;

    let query = {};

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }
    if (genre) {
      query.genre = { $regex: genre, $options: 'i' };
    }
    if (year) {
      query.year = Number(year);
    }
    if (type) {
      query.type = type;
    }

    let moviesQuery = Movie.find(query);

    if (sort === 'rating') {
      moviesQuery = moviesQuery.sort({ averageRating: -1 });
    } else if (sort === 'recent') {
      moviesQuery = moviesQuery.sort({ createdAt: -1 });
    } else {
      moviesQuery = moviesQuery.sort({ title: 1 });
    }

    const movies = await moviesQuery;
    res.json(movies);
  } catch (err) {
    console.error('MOVIE SEARCH ERROR:', err);
    res.status(500).json({ message: 'Error fetching movies' });
  }
});

// Najpopularniejsze filmy
// GET /api/movies/popular?type=&sortBy=
router.get('/popular', async (req, res) => {
  try {
    const { type, sortBy } = req.query; // type: 'movie' | 'series', sortBy: 'rating' | 'added'

    let movies = await Movie.find(type ? { type } : {});

    // Liczba dodanych do list (użytkownicy)
    // Potrzebujemy agregacji z User.lists
    const users = await User.find({}, 'lists');

    const movieCounts = {};
    users.forEach(user => {
      ['toWatch', 'watching', 'watched'].forEach(list => {
        user.lists[list].forEach(movieId => {
          movieCounts[movieId] = (movieCounts[movieId] || 0) + 1;
        });
      });
    });

    movies = movies.map(movie => ({
      ...movie.toObject(),
      addedCount: movieCounts[movie._id] || 0,
    }));

    if (sortBy === 'rating') {
      movies.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
    } else if (sortBy === 'added') {
      movies.sort((a, b) => (b.addedCount || 0) - (a.addedCount || 0));
    }

    res.json(movies);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Błąd pobierania popularnych filmów' });
  }
});

// Pobranie jednego filmu po ID (z ocenami i nazwami użytkowników)
router.get('/:id', async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id).populate('ratings.user', 'name');
    if (!movie) {
      return res.status(404).json({ message: 'Movie not found' });
    }
    res.json(movie);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Edycja filmu (tylko admin)
router.put('/:id', auth, admin, async (req, res) => {
  const { title, director, year, genre, posterUrl, type, description, trailerUrl, duration } = req.body;
  try {
    let movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ msg: 'Movie not found' });

    movie.title = title || movie.title;
    movie.director = director || movie.director;
    movie.year = year || movie.year;
    movie.genre = genre || movie.genre;
    movie.posterUrl = posterUrl || movie.posterUrl;
    movie.type = type || movie.type;
    movie.description = description || movie.description;
    movie.trailerUrl = trailerUrl || movie.trailerUrl;
    movie.duration = duration || movie.duration;

    await movie.save();
    res.json(movie);
  } catch (err) {
    console.error('MOVIE UPDATE ERROR:', err);
    res.status(500).send('Server error');
  }
});

// Usuwanie filmu (tylko admin)
router.delete('/:id', auth, admin, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ msg: 'Movie not found' });

    await Movie.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Movie removed' });
  } catch (err) {
    console.error('MOVIE DELETE ERROR:', err);
    res.status(500).send('Server error');
  }
});

// Ocenianie filmu
router.post('/:id/rate', auth, async (req, res) => {
  const { score } = req.body;

  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ msg: 'Movie not found' });

    const existing = movie.ratings.find((r) => r.user && r.user.toString() === req.user.id);
    if (existing) existing.score = score;
    else movie.ratings.push({ user: req.user.id, score });

    await movie.save();
    res.json({ averageRating: movie.averageRating, ratings: movie.ratings });
  } catch (err) {
    console.error('RATE MOVIE ERROR:', err);
    res.status(500).send('Server error');
  }
});

// Dodanie odcinka do serialu (tylko admin)
router.post('/:id/episodes', auth, admin, async (req, res) => {
  const { episodeNumber, seasonNumber, title, description, duration, airDate } = req.body;
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ msg: 'Movie not found' });
    if (movie.type !== 'series') return res.status(400).json({ msg: 'Only series can have episodes' });

    movie.episodes.push({ episodeNumber, seasonNumber, title, description, duration, airDate });
    await movie.save();
    res.json(movie);
  } catch (err) {
    console.error('ADD EPISODE ERROR:', err);
    res.status(500).send('Server error');
  }
});

// Masowy import odcinków z TMDB dla istniejącego serialu (tylko admin)
router.post('/:id/import-episodes', auth, admin, async (req, res) => {
  const { tmdbId } = req.body;
  if (!tmdbId) return res.status(400).json({ msg: 'tmdbId jest wymagane' });

  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ msg: 'Movie not found' });
    if (movie.type !== 'series') return res.status(400).json({ msg: 'Tylko seriale mogą mieć odcinki' });

    const details = await tmdb.getTvDetails(tmdbId);
    const seasons = details.seasons || [];

    let addedCount = 0;
    for (const season of seasons) {
      const episodes = await tmdb.getSeasonEpisodes(tmdbId, season.seasonNumber);
      episodes.forEach((ep) => {
        const alreadyExists = movie.episodes.some(
          (e) => e.seasonNumber === ep.seasonNumber && e.episodeNumber === ep.episodeNumber
        );
        if (!alreadyExists) {
          movie.episodes.push({
            episodeNumber: ep.episodeNumber,
            seasonNumber: ep.seasonNumber,
            title: ep.title || `Odcinek ${ep.episodeNumber}`,
            description: ep.description,
            duration: ep.duration,
            airDate: ep.airDate,
          });
          addedCount++;
        }
      });
    }

    movie.tmdbId = tmdbId;
    await movie.save();
    res.json({ movie, addedCount });
  } catch (err) {
    if (err.code === 'TMDB_NOT_CONFIGURED') {
      return res.status(503).json({ msg: 'Integracja TMDB nie jest skonfigurowana (brak TMDB_API_KEY na serwerze)' });
    }
    console.error('IMPORT EPISODES ERROR:', err);
    res.status(500).json({ msg: 'Nie udało się zaimportować odcinków z TMDB' });
  }
});

// Edycja odcinka (tylko admin)
router.put('/:id/episodes/:episodeId', auth, admin, async (req, res) => {
  const { episodeNumber, seasonNumber, title, description, duration, airDate } = req.body;
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ msg: 'Movie not found' });

    const episode = movie.episodes.id(req.params.episodeId);
    if (!episode) return res.status(404).json({ msg: 'Episode not found' });

    if (episodeNumber !== undefined) episode.episodeNumber = episodeNumber;
    if (seasonNumber !== undefined) episode.seasonNumber = seasonNumber;
    if (title !== undefined) episode.title = title;
    if (description !== undefined) episode.description = description;
    if (duration !== undefined) episode.duration = duration;
    if (airDate !== undefined) episode.airDate = airDate;

    await movie.save();
    res.json(movie);
  } catch (err) {
    console.error('UPDATE EPISODE ERROR:', err);
    res.status(500).send('Server error');
  }
});

// Usunięcie odcinka (tylko admin)
router.delete('/:id/episodes/:episodeId', auth, admin, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ msg: 'Movie not found' });

    const episode = movie.episodes.id(req.params.episodeId);
    if (!episode) return res.status(404).json({ msg: 'Episode not found' });
    
    episode.deleteOne();
    await movie.save();
    res.json(movie);
  } catch (err) {
    console.error('DELETE EPISODE ERROR:', err);
    res.status(500).send('Server error');
  }
});

// Zaznaczenie odcinka jako obejrzanego
router.post('/:id/episodes/:episodeId/watch', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const movie = await Movie.findById(req.params.id);
    
    if (!movie) return res.status(404).json({ msg: 'Movie not found' });
    
    console.log('Looking for episode:', req.params.episodeId);
    console.log('Available episodes:', movie.episodes.map(e => ({ id: e._id?.toString(), title: e.title, season: e.seasonNumber, episode: e.episodeNumber })));
    console.log('Request body:', req.body);
    
    let episode = movie.episodes.id(req.params.episodeId);
    
    // Jeśli nie znalazł po ID, spróbuj znaleźć po numerze sezonu/odcinka
    if (!episode) {
      console.log('Episode not found by ID, trying by season/episode number');
      const { seasonNumber, episodeNumber } = req.body;
      
      if (seasonNumber !== undefined && episodeNumber !== undefined) {
        episode = movie.episodes.find(e => 
          Number(e.seasonNumber) === Number(seasonNumber) && Number(e.episodeNumber) === Number(episodeNumber)
        );
        if (episode) {
          console.log('Found episode by season/episode number:', episode._id);
        }
      }
    }
    
    if (!episode) {
      console.error('Episode not found. Tried ID:', req.params.episodeId, 'Season:', req.body.seasonNumber, 'Episode:', req.body.episodeNumber);
      return res.status(404).json({ 
        msg: 'Episode not found', 
        episodeId: req.params.episodeId,
        availableEpisodes: movie.episodes.map(e => ({ id: e._id?.toString(), season: e.seasonNumber, episode: e.episodeNumber, title: e.title }))
      });
    }

    // Sprawdź czy już oglądany
    const episodeIdStr = episode._id?.toString() || episode._id;
    const existing = user.watchedEpisodes.find(
      we => we.movieId?.toString() === req.params.id && we.episodeId?.toString() === episodeIdStr
    );

    if (!existing) {
      user.watchedEpisodes.push({
        movieId: req.params.id,
        episodeId: episode._id || episode,
      });
      await user.save();
    }

    res.json({ msg: 'Episode marked as watched', watchedEpisodes: user.watchedEpisodes });
  } catch (err) {
    console.error('WATCH EPISODE ERROR:', err);
    res.status(500).send('Server error');
  }
});

// Odznaczenie odcinka jako obejrzanego
router.delete('/:id/episodes/:episodeId/watch', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const movie = await Movie.findById(req.params.id);
    
    if (!movie) return res.status(404).json({ msg: 'Movie not found' });
    
    // Znajduj odcinek - może być po ID lub po season/episode
    let episode = movie.episodes.id(req.params.episodeId);
    
    const episodeIdToRemove = episode?._id?.toString() || req.params.episodeId;
    
    user.watchedEpisodes = user.watchedEpisodes.filter(
      we => !(we.movieId?.toString() === req.params.id && we.episodeId?.toString() === episodeIdToRemove)
    );
    await user.save();
    res.json({ msg: 'Episode unmarked', watchedEpisodes: user.watchedEpisodes });
  } catch (err) {
    console.error('UNWATCH EPISODE ERROR:', err);
    res.status(500).send('Server error');
  }
});

// Zaznaczenie filmu jako obejrzanego (z czasem)
router.post('/:id/watch', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const movie = await Movie.findById(req.params.id);
    
    if (!movie) return res.status(404).json({ msg: 'Movie not found' });

    const existing = user.watchedMovies.find(wm => wm.movieId.toString() === req.params.id);
    if (!existing) {
      user.watchedMovies.push({ movieId: req.params.id });
      await user.save();
    }

    res.json({ msg: 'Movie marked as watched', watchedMovies: user.watchedMovies });
  } catch (err) {
    console.error('WATCH MOVIE ERROR:', err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
