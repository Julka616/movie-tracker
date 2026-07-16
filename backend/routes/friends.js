const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Movie = require('../models/Movie');

// Small helper: return only the public-safe fields for a user
function publicUser(u) {
  return { _id: u._id, name: u.name, email: u.email };
}

// GET /api/friends - my friends list + pending requests (sent & received)
router.get('/', auth, async (req, res) => {
  try {
    const me = await User.findById(req.user.id)
      .populate('friends', 'name email')
      .populate('friendRequestsSent', 'name email')
      .populate('friendRequestsReceived', 'name email');
    if (!me) return res.status(404).json({ msg: 'User not found' });

    res.json({
      friends: me.friends || [],
      sentRequests: me.friendRequestsSent || [],
      receivedRequests: me.friendRequestsReceived || [],
    });
  } catch (err) {
    console.error('FRIENDS LIST ERROR:', err);
    res.status(500).send('Server error');
  }
});

// GET /api/friends/search?query= - find users by name or email
router.get('/search', auth, async (req, res) => {
  const { query } = req.query;
  if (!query || !query.trim()) return res.json([]);

  try {
    const me = await User.findById(req.user.id);
    if (!me) return res.status(404).json({ msg: 'User not found' });

    const candidates = await User.find({
      _id: { $ne: me._id },
      blocked: { $ne: true },
      $or: [
        { name: { $regex: query.trim(), $options: 'i' } },
        { email: { $regex: query.trim(), $options: 'i' } },
      ],
    }).select('name email').limit(15);

    const friendIds = new Set((me.friends || []).map((id) => id.toString()));
    const sentIds = new Set((me.friendRequestsSent || []).map((id) => id.toString()));
    const receivedIds = new Set((me.friendRequestsReceived || []).map((id) => id.toString()));

    const results = candidates.map((u) => {
      let status = 'none';
      if (friendIds.has(u._id.toString())) status = 'friend';
      else if (sentIds.has(u._id.toString())) status = 'sent';
      else if (receivedIds.has(u._id.toString())) status = 'received';
      return { ...publicUser(u), status };
    });

    res.json(results);
  } catch (err) {
    console.error('FRIENDS SEARCH ERROR:', err);
    res.status(500).send('Server error');
  }
});

// POST /api/friends/request/:userId - send a friend request
router.post('/request/:userId', auth, async (req, res) => {
  const { userId } = req.params;
  if (userId === req.user.id) {
    return res.status(400).json({ msg: 'Nie możesz zaprosić samej/samego siebie' });
  }

  try {
    const [me, target] = await Promise.all([
      User.findById(req.user.id),
      User.findById(userId),
    ]);
    if (!target) return res.status(404).json({ msg: 'Użytkownik nie istnieje' });

    const alreadyFriends = (me.friends || []).some((id) => id.toString() === userId);
    const alreadySent = (me.friendRequestsSent || []).some((id) => id.toString() === userId);
    if (alreadyFriends) return res.status(400).json({ msg: 'Już jesteście znajomymi' });
    if (alreadySent) return res.status(400).json({ msg: 'Zaproszenie już zostało wysłane' });

    // If they already sent me a request, accept it instead of creating a duplicate
    const theyAlreadySentToMe = (me.friendRequestsReceived || []).some((id) => id.toString() === userId);
    if (theyAlreadySentToMe) {
      me.friendRequestsReceived = me.friendRequestsReceived.filter((id) => id.toString() !== userId);
      target.friendRequestsSent = (target.friendRequestsSent || []).filter((id) => id.toString() !== req.user.id);
      me.friends = [...(me.friends || []), target._id];
      target.friends = [...(target.friends || []), me._id];
      await Promise.all([me.save(), target.save()]);
      return res.json({ msg: 'Zaakceptowano wzajemne zaproszenie', status: 'friend' });
    }

    me.friendRequestsSent = [...(me.friendRequestsSent || []), target._id];
    target.friendRequestsReceived = [...(target.friendRequestsReceived || []), me._id];
    await Promise.all([me.save(), target.save()]);

    res.json({ msg: 'Zaproszenie wysłane', status: 'sent' });
  } catch (err) {
    console.error('FRIEND REQUEST ERROR:', err);
    res.status(500).send('Server error');
  }
});

// POST /api/friends/accept/:userId - accept an incoming friend request
router.post('/accept/:userId', auth, async (req, res) => {
  const { userId } = req.params;
  try {
    const [me, requester] = await Promise.all([
      User.findById(req.user.id),
      User.findById(userId),
    ]);
    if (!requester) return res.status(404).json({ msg: 'Użytkownik nie istnieje' });

    const hasRequest = (me.friendRequestsReceived || []).some((id) => id.toString() === userId);
    if (!hasRequest) return res.status(400).json({ msg: 'Brak takiego zaproszenia' });

    me.friendRequestsReceived = me.friendRequestsReceived.filter((id) => id.toString() !== userId);
    requester.friendRequestsSent = (requester.friendRequestsSent || []).filter((id) => id.toString() !== req.user.id);
    me.friends = [...(me.friends || []), requester._id];
    requester.friends = [...(requester.friends || []), me._id];

    await Promise.all([me.save(), requester.save()]);
    res.json({ msg: 'Zaakceptowano zaproszenie' });
  } catch (err) {
    console.error('FRIEND ACCEPT ERROR:', err);
    res.status(500).send('Server error');
  }
});

// POST /api/friends/decline/:userId - decline an incoming request, or cancel one I sent
router.post('/decline/:userId', auth, async (req, res) => {
  const { userId } = req.params;
  try {
    const [me, other] = await Promise.all([
      User.findById(req.user.id),
      User.findById(userId),
    ]);
    if (!other) return res.status(404).json({ msg: 'Użytkownik nie istnieje' });

    me.friendRequestsReceived = (me.friendRequestsReceived || []).filter((id) => id.toString() !== userId);
    me.friendRequestsSent = (me.friendRequestsSent || []).filter((id) => id.toString() !== userId);
    other.friendRequestsReceived = (other.friendRequestsReceived || []).filter((id) => id.toString() !== req.user.id);
    other.friendRequestsSent = (other.friendRequestsSent || []).filter((id) => id.toString() !== req.user.id);

    await Promise.all([me.save(), other.save()]);
    res.json({ msg: 'Zaproszenie odrzucone/anulowane' });
  } catch (err) {
    console.error('FRIEND DECLINE ERROR:', err);
    res.status(500).send('Server error');
  }
});

// DELETE /api/friends/:userId - remove an existing friend
router.delete('/:userId', auth, async (req, res) => {
  const { userId } = req.params;
  try {
    const [me, other] = await Promise.all([
      User.findById(req.user.id),
      User.findById(userId),
    ]);
    if (!other) return res.status(404).json({ msg: 'Użytkownik nie istnieje' });

    me.friends = (me.friends || []).filter((id) => id.toString() !== userId);
    other.friends = (other.friends || []).filter((id) => id.toString() !== req.user.id);

    await Promise.all([me.save(), other.save()]);
    res.json({ msg: 'Usunięto ze znajomych' });
  } catch (err) {
    console.error('FRIEND REMOVE ERROR:', err);
    res.status(500).send('Server error');
  }
});

// GET /api/friends/feed - recent activity (watched movies/episodes + ratings) from my friends
router.get('/feed', auth, async (req, res) => {
  try {
    const me = await User.findById(req.user.id).populate('friends', 'name');
    if (!me) return res.status(404).json({ msg: 'User not found' });

    const friends = me.friends || [];
    if (friends.length === 0) return res.json([]);

    const friendIds = friends.map((f) => f._id);
    const friendUsers = await User.find({ _id: { $in: friendIds } });

    // Gather all movie ids referenced by any friend's activity, to fetch titles/posters once
    const movieIds = new Set();
    friendUsers.forEach((u) => {
      (u.watchedMovies || []).forEach((wm) => wm.movieId && movieIds.add(wm.movieId.toString()));
      (u.watchedEpisodes || []).forEach((we) => we.movieId && movieIds.add(we.movieId.toString()));
    });
    const movies = await Movie.find({ _id: { $in: Array.from(movieIds) } });
    const movieById = {};
    movies.forEach((m) => { movieById[m._id.toString()] = m; });

    const nameById = {};
    friendUsers.forEach((u) => { nameById[u._id.toString()] = u.name; });

    const events = [];
    friendUsers.forEach((u) => {
      const friendName = nameById[u._id.toString()];

      (u.watchedMovies || []).forEach((wm) => {
        const movie = movieById[wm.movieId?.toString()];
        if (!movie) return;
        const myRating = (movie.ratings || []).find((r) => r.user && r.user.toString() === u._id.toString());
        events.push({
          type: 'movie',
          friendName,
          movieId: movie._id,
          title: movie.title,
          posterUrl: movie.posterUrl,
          score: myRating?.score,
          date: wm.watchedAt,
        });
      });

      (u.watchedEpisodes || []).forEach((we) => {
        const movie = movieById[we.movieId?.toString()];
        if (!movie) return;
        const episode = movie.episodes?.id ? movie.episodes.id(we.episodeId) : null;
        events.push({
          type: 'episode',
          friendName,
          movieId: movie._id,
          title: movie.title,
          episodeLabel: episode ? `S${episode.seasonNumber}E${episode.episodeNumber}` : null,
          posterUrl: movie.posterUrl,
          date: we.watchedAt,
        });
      });
    });

    events.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(events.slice(0, 40));
  } catch (err) {
    console.error('FRIENDS FEED ERROR:', err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
