require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Movie = require('../models/Movie');

(async () => {
  try {
    await connectDB();
    
    // Oczyść wszystkie ratings
    const result = await Movie.updateMany(
      {},
      { $set: { ratings: [] } }
    );
    
    console.log(`✅ Oczyściono ratings dla ${result.modifiedCount} filmów/seriali`);
    console.log('Teraz wszystkie filmy będą miały ocenę 0 (brak ocen)');
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Błąd podczas czyszczenia ratings:', err);
    process.exit(1);
  }
})();
