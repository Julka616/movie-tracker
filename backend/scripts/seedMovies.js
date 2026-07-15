require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const connectDB = require('../config/db');
const Movie = require('../models/Movie');

(async () => {
  try {
    await connectDB();

    const filePath = path.join(__dirname, '..', 'data', 'movies.json');
    if (!fs.existsSync(filePath)) {
      console.error('Seed file not found at:', filePath);
      process.exit(1);
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    const items = JSON.parse(raw);

    if (!Array.isArray(items) || items.length === 0) {
      console.error('Seed file is empty or not an array');
      process.exit(1);
    }

    let inserted = 0;
    for (const item of items) {
      // Basic validation for required fields
      if (!item.title) {
        console.warn('Skipping item without title:', item);
        continue;
      }

      // Upsert by title + year to avoid duplicates
      const filter = { title: item.title };
      if (item.year) filter.year = item.year;

      const update = {
        director: item.director,
        year: item.year,
        genre: item.genre,
        posterUrl: item.posterUrl,
        type: item.type || 'movie',
        description: item.description,
        trailerUrl: item.trailerUrl,
        duration: item.duration,
        episodes: item.episodes || [],
      };

      const options = { upsert: true, new: true, setDefaultsOnInsert: true };
      await Movie.findOneAndUpdate(filter, update, options);
      inserted++;
    }

    console.log(`Seed completed. Upserted ${inserted} movies/series.`);
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
})();
