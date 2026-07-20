const mongoose = require('mongoose');

const EpisodeSchema = new mongoose.Schema({
  episodeNumber: { type: Number, required: true },
  seasonNumber: { type: Number, required: true, default: 1 },
  title: { type: String, required: true },
  description: { type: String },
  duration: { type: Number }, 
  airDate: { type: Date },
});

const MovieSchema = new mongoose.Schema({
  title: { type: String, required: true },
  director: { type: String },
  year: { type: Number },
  genre: { type: String },
  posterUrl: { type: String },
  type: { type: String, enum: ['movie', 'series'], default: 'movie' },
  description: { type: String },
  trailerUrl: { type: String },
  duration: { type: Number }, 
  tmdbId: { type: String },
  episodes: [EpisodeSchema], 
  ratings: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, score: Number }],
  createdAt: { type: Date, default: Date.now },
});

MovieSchema.virtual('averageRating').get(function () {
  if (!this.ratings || this.ratings.length === 0) return 0;
  const total = this.ratings.reduce((acc, r) => acc + r.score, 0);
  return total / this.ratings.length;
});

MovieSchema.set('toJSON', { virtuals: true });
MovieSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Movie', MovieSchema);
