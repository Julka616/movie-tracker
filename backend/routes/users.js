const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const crypto = require('crypto');
const UserMovie = require('../models/UserMovie');
const JWT_SECRET = process.env.JWT_SECRET || 'secretdev';

// POST /api/users/register
router.post('/register', async (req, res) => {
  console.log('Received registration:', req.body);
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ msg: 'Please enter all fields' });
  }

  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: 'User already exists' });

    user = new User({ name, email, password, role: 'user' });
    console.log('Saving user:', user);
    await user.save();
    console.log('Saved user:', user);

    const payload = { user: { id: user._id, role: user.role } };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

    res.json({ token });
  } catch (err) {
    console.error('REGISTER ERROR:', err);
    res.status(500).send('Server error');
  }
});

// POST /api/users/admin-register - disabled (single admin model)
router.post('/admin-register', async (req, res) => {
  return res.status(403).json({ msg: 'Admin registration is disabled. Use existing admin account.' });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ msg: 'Please enter all fields' });
  }

  try {
    let user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'Invalid credentials' });

    if (user.blocked) return res.status(403).json({ msg: 'Account blocked by administrator' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

    const payload = { user: { id: user._id, role: user.role } };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

    res.json({ token });

  } catch (err) {
    console.error('LOGIN ERROR:', err);
    res.status(500).send('Server error');
  }
});

// GET /api/users/me (chronione)
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error('ME ERROR:', err);
    res.status(500).send('Server error');
  }
});

// PUT /api/users/me (update profile)
router.put('/me', auth, async (req, res) => {
  try {
    const { name, privacy } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    if (name && name.trim()) user.name = name.trim();
    if (privacy && ['public', 'private'].includes(privacy)) user.privacy = privacy;

    await user.save();
    const updated = await User.findById(req.user.id).select('-password');
    res.json(updated);
  } catch (err) {
    console.error('UPDATE ME ERROR:', err);
    res.status(500).send('Server error');
  }
});

// PUT /api/users/lists – move a movie between lists
router.put('/lists', auth, async (req, res) => {
  const { movieId, list } = req.body; // list can be undefined to just remove

  if (!movieId) {
    return res.status(400).json({ msg: 'movieId is required' });
  }

  if (list && !['toWatch', 'watching', 'watched'].includes(list)) {
    return res.status(400).json({ msg: 'Invalid list type' });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    // Remove movie from all lists
    ['toWatch', 'watching', 'watched'].forEach((l) => {
      user.lists[l] = user.lists[l].filter((m) => m.toString() !== movieId);
    });

    // Add to the selected list (if provided)
    if (list) {
      user.lists[list].push(movieId);
    }

    // Sync to UserMovie for reporting/analytics layer
    const statusMap = { toWatch: 'to_watch', watching: 'watching', watched: 'watched' };
    const statusValue = list ? statusMap[list] : null;

    if (statusValue) {
      await UserMovie.findOneAndUpdate(
        { user: req.user.id, movie: movieId },
        { user: req.user.id, movie: movieId, status: statusValue },
        { upsert: true, new: true }
      );
    } else {
      await UserMovie.deleteOne({ user: req.user.id, movie: movieId });
    }

    await user.save();
    res.json(user.lists);
  } catch (err) {
    console.error('LIST UPDATE ERROR:', err);
    res.status(500).send('Server error');
  }
});

// POST /api/users/forgot - request password reset token
router.post('/forgot', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ msg: 'Email is required' });

  try {
    const user = await User.findOne({ email });
    if (!user) {
      // Nie zdradzamy, czy e-mail istnieje
      return res.json({ msg: 'If the email exists, a reset link was generated.' });
    }

    const token = crypto.randomBytes(20).toString('hex');
    user.resetToken = token;
    user.resetTokenExp = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save();

    const resetLink = `http://localhost:3000/reset-password?token=${token}`;
    console.log(`Reset link for ${email}: ${resetLink}`);
    res.json({ msg: 'Reset link generated', resetToken: token });
  } catch (err) {
    console.error('FORGOT ERROR:', err);
    res.status(500).send('Server error');
  }
});

// POST /api/users/reset - reset password with valid token
router.post('/reset', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ msg: 'Token and new password are required' });
  if (password.length < 6) return res.status(400).json({ msg: 'Password must be at least 6 characters' });

  try {
    const user = await User.findOne({ resetToken: token, resetTokenExp: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ msg: 'Invalid or expired token' });

    user.password = password;
    user.resetToken = undefined;
    user.resetTokenExp = undefined;
    await user.save();

    res.json({ msg: 'Password updated. You can now log in.' });
  } catch (err) {
    console.error('RESET ERROR:', err);
    res.status(500).send('Server error');
  }
});

// GET /api/users/lists – fetch populated user lists
router.get('/lists', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('lists.toWatch')
      .populate('lists.watching')
      .populate('lists.watched');

    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json(user.lists);
  } catch (err) {
    console.error('LISTS FETCH ERROR:', err);
    res.status(500).send('Server error');
  }
});

// GET /api/users - get all users (admin only)
router.get('/', auth, require('../middleware/admin'), async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error('USERS FETCH ERROR:', err);
    res.status(500).send('Server error');
  }
});

// PUT /api/users/:id/block - block/unblock user (admin only)
router.put('/:id/block', auth, require('../middleware/admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });
    
    user.blocked = !user.blocked;
    await user.save();
    
    res.json({ msg: `User ${user.blocked ? 'blocked' : 'unblocked'}`, user });
  } catch (err) {
    console.error('BLOCK USER ERROR:', err);
    res.status(500).send('Server error');
  }
});

// GET /api/users/stats - rich viewing statistics for the logged-in user
router.get('/stats', auth, async (req, res) => {
  try {
    const Movie = require('../models/Movie');
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    const watchedMovies = user.watchedMovies || [];
    const watchedEpisodes = user.watchedEpisodes || [];

    // Collect all movie ids we need (for movies + for episodes' parent series)
    const movieIds = new Set([
      ...watchedMovies.map((wm) => wm.movieId?.toString()).filter(Boolean),
      ...watchedEpisodes.map((we) => we.movieId?.toString()).filter(Boolean),
    ]);

    const movies = await Movie.find({ _id: { $in: Array.from(movieIds) } });
    const movieById = {};
    movies.forEach((m) => { movieById[m._id.toString()] = m; });

    let totalMinutes = 0;
    const genreMinutes = {};
    const genreCount = {};
    const monthlyCount = {};
    const weekdayCount = [0, 0, 0, 0, 0, 0, 0]; // Sun..Sat
    const yearly = {};
    const activityDates = new Set(); // for streaks, 'YYYY-MM-DD'

    const registerEvent = (date, minutes, genre) => {
      const d = date ? new Date(date) : new Date();
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const yearKey = String(d.getFullYear());
      const dayKey = d.toISOString().slice(0, 10);

      totalMinutes += minutes || 0;
      if (genre) {
        genreMinutes[genre] = (genreMinutes[genre] || 0) + (minutes || 0);
        genreCount[genre] = (genreCount[genre] || 0) + 1;
      }
      monthlyCount[monthKey] = (monthlyCount[monthKey] || 0) + 1;
      weekdayCount[d.getDay()] += 1;
      activityDates.add(dayKey);

      if (!yearly[yearKey]) yearly[yearKey] = { year: yearKey, moviesWatched: 0, episodesWatched: 0, minutes: 0 };
      yearly[yearKey].minutes += minutes || 0;
    };

    watchedMovies.forEach((wm) => {
      const movie = movieById[wm.movieId?.toString()];
      registerEvent(wm.watchedAt, movie?.duration, movie?.genre);
      const yearKey = String(new Date(wm.watchedAt || Date.now()).getFullYear());
      if (yearly[yearKey]) yearly[yearKey].moviesWatched += 1;
    });

    watchedEpisodes.forEach((we) => {
      const movie = movieById[we.movieId?.toString()];
      const episode = movie?.episodes?.id ? movie.episodes.id(we.episodeId) : null;
      registerEvent(we.watchedAt, episode?.duration, movie?.genre);
      const yearKey = String(new Date(we.watchedAt || Date.now()).getFullYear());
      if (yearly[yearKey]) yearly[yearKey].episodesWatched += 1;
    });

    // Genre breakdown, sorted by count
    const genreBreakdown = Object.keys(genreCount)
      .map((g) => ({ genre: g, count: genreCount[g], minutes: genreMinutes[g] || 0 }))
      .sort((a, b) => b.count - a.count);

    // Last 12 months of activity (including empty months, oldest first)
    const monthlyActivity = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyActivity.push({ month: key, count: monthlyCount[key] || 0 });
    }

    // Weekday activity, Monday-first for a more natural week view
    const weekdayLabels = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nie'];
    const weekdayActivity = weekdayLabels.map((label, idx) => {
      const jsDay = (idx + 1) % 7; // convert Mon-first idx to JS Sun=0 index
      return { day: label, count: weekdayCount[jsDay] };
    });

    // Streaks (consecutive days with at least one watch event)
    const sortedDates = Array.from(activityDates).sort();
    let longestStreak = 0;
    let currentRun = 0;
    let prevDate = null;
    sortedDates.forEach((dateStr) => {
      const d = new Date(dateStr);
      if (prevDate) {
        const diffDays = Math.round((d - prevDate) / 86400000);
        currentRun = diffDays === 1 ? currentRun + 1 : 1;
      } else {
        currentRun = 1;
      }
      longestStreak = Math.max(longestStreak, currentRun);
      prevDate = d;
    });
    // Current streak: consecutive days ending today or yesterday
    let currentStreak = 0;
    if (sortedDates.length) {
      const todayStr = new Date().toISOString().slice(0, 10);
      const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const lastActive = sortedDates[sortedDates.length - 1];
      if (lastActive === todayStr || lastActive === yesterdayStr) {
        currentStreak = 1;
        for (let i = sortedDates.length - 1; i > 0; i--) {
          const diff = Math.round((new Date(sortedDates[i]) - new Date(sortedDates[i - 1])) / 86400000);
          if (diff === 1) currentStreak += 1;
          else break;
        }
      }
    }

    // My ratings (from Movie.ratings) - top rated + average
    const myRatings = [];
    movies.forEach((m) => {
      const mine = (m.ratings || []).find((r) => r.user && r.user.toString() === req.user.id);
      if (mine) {
        myRatings.push({
          movieId: m._id,
          title: m.title,
          posterUrl: m.posterUrl,
          type: m.type,
          score: mine.score,
        });
      }
    });
    const avgRatingGiven = myRatings.length
      ? Number((myRatings.reduce((sum, r) => sum + r.score, 0) / myRatings.length).toFixed(2))
      : 0;
    const topRated = myRatings.sort((a, b) => b.score - a.score).slice(0, 5);

    const yearlyReview = Object.values(yearly).sort((a, b) => Number(a.year) - Number(b.year));

    res.json({
      totals: {
        moviesWatched: watchedMovies.length,
        episodesWatched: watchedEpisodes.length,
        totalMinutes,
        totalHours: Math.floor(totalMinutes / 60),
        avgRatingGiven,
        ratedCount: myRatings.length,
      },
      genreBreakdown,
      monthlyActivity,
      weekdayActivity,
      streak: { current: currentStreak, longest: longestStreak },
      yearlyReview,
      topRated,
    });
  } catch (err) {
    console.error('STATS ERROR:', err);
    res.status(500).send('Server error');
  }
});

// PUT /api/users/favorites - set my 4 favorite movies/series (order matters)
router.put('/favorites', auth, async (req, res) => {
  try {
    const Movie = require('../models/Movie');
    const { movieIds } = req.body;
    if (!Array.isArray(movieIds)) {
      return res.status(400).json({ msg: 'movieIds musi być tablicą' });
    }
    if (movieIds.length > 4) {
      return res.status(400).json({ msg: 'Możesz wybrać maksymalnie 4 ulubione tytuły' });
    }

    const existing = await Movie.find({ _id: { $in: movieIds } }).select('_id');
    const validIds = new Set(existing.map((m) => m._id.toString()));
    const filtered = movieIds.filter((id) => validIds.has(id));

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    user.favorites = filtered;
    await user.save();

    const populated = await User.findById(req.user.id).populate('favorites');
    res.json(populated.favorites);
  } catch (err) {
    console.error('SET FAVORITES ERROR:', err);
    res.status(500).send('Server error');
  }
});

// GET /api/users/favorites - my favorites, populated with movie details
router.get('/favorites', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('favorites');
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json(user.favorites || []);
  } catch (err) {
    console.error('GET FAVORITES ERROR:', err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
