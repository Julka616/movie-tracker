require('dotenv').config();
const mongoose = require('mongoose');
const Movie = require('../models/Movie');

async function fixEpisodes() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/myMovieApp');
    console.log('Connected to MongoDB');

    const movies = await Movie.find({ type: 'series' });
    console.log(`Found ${movies.length} series`);

    for (const movie of movies) {
      let updated = false;
      
      movie.episodes.forEach((episode, index) => {
        if (!episode.seasonNumber || episode.seasonNumber === undefined) {
          episode.seasonNumber = 1; // Ustaw domyślny sezon
          updated = true;
          console.log(`Fixed episode "${episode.title}" in "${movie.title}"`);
        }
      });

      if (updated) {
        await movie.save();
        console.log(`Saved updates for "${movie.title}"`);
      }
    }

    console.log('Migration completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

fixEpisodes();
