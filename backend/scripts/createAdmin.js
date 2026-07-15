require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');

// Configure your admin credentials here or via environment variables
const ADMIN_NAME = process.env.ADMIN_NAME || 'Admin';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change_me_now';

(async () => {
  try {
    await connectDB();
    let user = await User.findOne({ email: ADMIN_EMAIL });
    if (user) {
      console.log('Admin already exists with this email. Updating role to admin if needed.');
      user.role = 'admin';
      await user.save();
      console.log('Admin updated:', ADMIN_EMAIL);
    } else {
      user = new User({ name: ADMIN_NAME, email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: 'admin' });
      await user.save();
      console.log('Admin created:', ADMIN_EMAIL);
    }
    process.exit(0);
  } catch (err) {
    console.error('Failed to create admin:', err);
    process.exit(1);
  }
})();
