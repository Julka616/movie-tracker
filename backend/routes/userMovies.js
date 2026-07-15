const express = require('express');
const router = express.Router();
const UserMovie = require('../models/UserMovie');
const auth = require('../middleware/auth');

// Dodaj film do listy
router.post('/', auth, async (req, res) => {
  const { movieId, status } = req.body;

  try {
    const entry = new UserMovie({
      user: req.user.id,
      movie: movieId,
      status
    });

    await entry.save();
    res.json(entry);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Pobierz listy użytkownika
router.get('/', auth, async (req, res) => {
  try {
    const list = await UserMovie.find({ user: req.user.id }).populate('movie');
    res.json(list);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Zmiana statusu
router.put('/:id', auth, async (req, res) => {
  try {
    const entry = await UserMovie.findById(req.params.id);
    if (!entry) return res.status(404).json({ msg: 'Entry not found' });
    entry.status = req.body.status;
    await entry.save();
    res.json(entry);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Usuń z listy
router.delete('/:id', auth, async (req, res) => {
  try {
    await UserMovie.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Removed' });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

module.exports = router;
