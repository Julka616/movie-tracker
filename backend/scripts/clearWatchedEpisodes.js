require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function clearWatchedEpisodes() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/myMovieApp');
    console.log('Connected to MongoDB');

    const result = await User.updateMany(
      {},
      { watchedEpisodes: [] }
    );

    console.log(`Cleared watchedEpisodes for ${result.modifiedCount} users`);
    console.log('Migration completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

clearWatchedEpisodes();
