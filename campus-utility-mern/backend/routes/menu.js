const express = require('express');
const router = express.Router();
const { MenuItem, Canteen } = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Both the canteen owner and the stationary admin manage their own item catalog
// (dishes vs. shop items like pens/notebooks/binding) through these same routes -
// the difference is purely which Canteen document their items belong to. This
// helper stops a canteen_owner from touching the stationary shop's items and
// vice versa, no matter what canteen_id they send.
async function assertOwnsCanteen(role, canteenId) {
  const canteen = await Canteen.findById(canteenId);
  if (!canteen) {
    const err = new Error('Canteen not found');
    err.statusCode = 404;
    throw err;
  }
  const isStationary = canteen.name.toLowerCase().includes('stationary');
  const allowed = role === 'stationary_admin' ? isStationary : !isStationary;
  if (!allowed) {
    const err = new Error('You do not manage this counter');
    err.statusCode = 403;
    throw err;
  }
  return canteen;
}

// GET /api/menu/:canteenId - all items for a canteen (any signed-in role)
router.get('/:canteenId', requireAuth, async (req, res) => {
  try {
    const items = await MenuItem.find({ canteen_id: req.params.canteenId }).sort({ item_name: 1 });
    res.json(items);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid canteen id' });
    }
    res.status(500).json({ error: 'Failed to fetch menu items', detail: err.message });
  }
});

// POST /api/menu/upload-image - upload a photo for a dish/item, returns its URL.
// Stored on local disk and served from /uploads - no paid image/CDN API involved.
router.post(
  '/upload-image',
  requireAuth,
  requireRole('canteen_owner', 'stationary_admin'),
  (req, res) => {
    upload.single('image')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: err.message || 'Image upload failed' });
      }
      if (!req.file) {
        return res.status(400).json({ error: 'No image file was uploaded' });
      }
      res.status(201).json({ image_url: `/uploads/${req.file.filename}` });
    });
  }
);

// POST /api/menu - owner adds a brand new dish/item (Manage Menu panel)
router.post('/', requireAuth, requireRole('canteen_owner', 'stationary_admin'), async (req, res) => {
  const { canteen_id, item_name, price, image_url } = req.body;

  if (!canteen_id || !item_name || price === undefined) {
    return res.status(400).json({ error: 'canteen_id, item_name and price are required' });
  }
  if (Number(price) < 0) {
    return res.status(400).json({ error: 'price cannot be negative' });
  }

  try {
    await assertOwnsCanteen(req.user.role, canteen_id);

    const created = await MenuItem.create({
      canteen_id,
      item_name: item_name.trim(),
      price: Number(price),
      image_url: image_url || null,
      is_available: true,
    });
    res.status(201).json(created);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    if (err.code === 11000) {
      return res.status(409).json({ error: `"${item_name}" already exists on this menu` });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: Object.values(err.errors)[0].message });
    }
    res.status(500).json({ error: 'Failed to add menu item', detail: err.message });
  }
});

// PUT /api/menu/:id - owner renames, reprices, or changes the photo of an item
router.put('/:id', requireAuth, requireRole('canteen_owner', 'stationary_admin'), async (req, res) => {
  const { item_name, price, image_url } = req.body;

  if (item_name === undefined && price === undefined && image_url === undefined) {
    return res.status(400).json({ error: 'Provide item_name, price and/or image_url to update' });
  }
  if (price !== undefined && Number(price) < 0) {
    return res.status(400).json({ error: 'price cannot be negative' });
  }

  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    await assertOwnsCanteen(req.user.role, item.canteen_id);

    if (item_name !== undefined) item.item_name = item_name.trim();
    if (price !== undefined) item.price = Number(price);
    if (image_url !== undefined) item.image_url = image_url;
    await item.save();
    res.json(item);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid menu item id' });
    }
    if (err.code === 11000) {
      return res.status(409).json({ error: `"${item_name}" already exists on this menu` });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: Object.values(err.errors)[0].message });
    }
    res.status(500).json({ error: 'Failed to update menu item', detail: err.message });
  }
});

// PUT /api/menu/:id/availability - toggle sold-out / out-of-stock state
router.put('/:id/availability', requireAuth, requireRole('canteen_owner', 'stationary_admin'), async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    await assertOwnsCanteen(req.user.role, item.canteen_id);

    item.is_available = !item.is_available;
    await item.save();
    res.json(item);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid menu item id' });
    }
    res.status(500).json({ error: 'Failed to update availability', detail: err.message });
  }
});

// DELETE /api/menu/:id - remove a dish/item entirely
router.delete('/:id', requireAuth, requireRole('canteen_owner', 'stationary_admin'), async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    await assertOwnsCanteen(req.user.role, item.canteen_id);

    await item.deleteOne();
    res.json({ message: 'Item removed', id: item._id });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid menu item id' });
    }
    res.status(500).json({ error: 'Failed to delete menu item', detail: err.message });
  }
});

module.exports = router;
