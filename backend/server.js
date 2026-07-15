// backend/server.js
require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');

const app = express();

// Middleware
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((url) => url.trim())
  : true; // lokalnie: zezwól na wszystko

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// Connect to DB
connectDB();

// Routes
app.use('/api/users', require('./routes/users'));
app.use('/api/user-movies', require('./routes/userMovies'));
app.use('/api/movies', require('./routes/movies'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
