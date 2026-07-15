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

module.exports = router;
