const express = require('express');
const router = express.Router();
const { User } = require('../models');
const { requireAuth } = require('../middleware/auth');

// GET /api/leaderboard - top 4 students by number of orders placed
router.get('/', requireAuth, async (req, res) => {
  try {
    const top = await User.find({ role: 'student' })
      .sort({ order_count: -1, name: 1 })
      .limit(4)
      .select('name roll_no order_count');
    res.json(top);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leaderboard', detail: err.message });
  }
});

module.exports = router;
