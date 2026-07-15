const mongoose = require('mongoose');

const UserMovieSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  movie: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true },
  status: {
    type: String,
    enum: ['to_watch', 'watching', 'watched'],
    default: 'to_watch'
  },
  rating: { type: Number, min: 1, max: 5 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UserMovie', UserMovieSchema);
