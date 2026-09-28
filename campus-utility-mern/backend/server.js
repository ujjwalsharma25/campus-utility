require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const connectDB = require('./db');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const canteenRoutes = require('./routes/canteens');
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders');
const leaderboardRoutes = require('./routes/leaderboard');
const analyticsRoutes = require('./routes/analytics');

const app = express();

app.use(cors());
app.use(express.json());

// Serves uploaded dish/item photos - local disk, no paid storage/CDN API
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/canteens', canteenRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/analytics', analyticsRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// --- Production: serve the built React app from this same server -----------
// After `npm run build` the frontend lives in ../frontend/dist. Serving it from
// Express means the whole app runs on ONE link and /api needs no proxy or CORS.
const distPath = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  // Any non-API GET goes to index.html (single-page app routing)
  app.get(/^\/(?!api|uploads).*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Central error handler (catches anything thrown/passed via next(err))
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error', detail: err.message });
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Campus Utility API running on http://localhost:${PORT}`);
  });
});
