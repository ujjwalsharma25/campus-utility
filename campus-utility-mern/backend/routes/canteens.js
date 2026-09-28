const express = require('express');
const router = express.Router();
const { Canteen } = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');

// GET /api/canteens - list every canteen/shop counter
router.get('/', requireAuth, async (req, res) => {
  try {
    const canteens = await Canteen.find().sort({ _id: 1 });
    res.json(canteens);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch canteens', detail: err.message });
  }
});

// PUT /api/canteens/:id/toggle - open/close a counter (canteen owner only)
router.put('/:id/toggle', requireAuth, requireRole('canteen_owner'), async (req, res) => {
  try {
    const canteen = await Canteen.findById(req.params.id);
    if (!canteen) {
      return res.status(404).json({ error: 'Canteen not found' });
    }
    canteen.is_open = !canteen.is_open;
    await canteen.save();
    res.json(canteen);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid canteen id' });
    }
    res.status(500).json({ error: 'Failed to toggle canteen status', detail: err.message });
  }
});

module.exports = router;
