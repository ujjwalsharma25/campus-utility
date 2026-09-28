const express = require('express');
const router = express.Router();
const { User } = require('../models');
const { requireAuth } = require('../middleware/auth');

// GET /api/users/:id - fetch a public profile by id (any signed-in user)
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid user id' });
    }
    res.status(500).json({ error: 'Failed to fetch user', detail: err.message });
  }
});

module.exports = router;
