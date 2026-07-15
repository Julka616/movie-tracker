const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'user' }, // 'user' or 'admin'
  blocked: { type: Boolean, default: false }, // zablokowany użytkownik
  privacy: { type: String, enum: ['public', 'private'], default: 'private' }, // widoczność profilu
  resetToken: { type: String },
  resetTokenExp: { type: Date },
  lists: {
    toWatch: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Movie' }],
    watching: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Movie' }],
    watched: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Movie' }],
  },
  watchedEpisodes: [
    {
      movieId: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie' },
      episodeId: { type: mongoose.Schema.Types.ObjectId },
      watchedAt: { type: Date, default: Date.now },
    }
  ],
  watchedMovies: [
    {
      movieId: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie' },
      watchedAt: { type: Date, default: Date.now },
    }
  ],
  createdAt: { type: Date, default: Date.now },
});

UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

module.exports = mongoose.model('User', UserSchema);
