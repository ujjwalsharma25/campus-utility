const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { requireAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

const ROLES = ['student', 'canteen_owner', 'stationary_admin'];

function signToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function publicUser(user) {
  return {
    _id: user._id,
    name: user.name,
    role: user.role,
    roll_no: user.roll_no,
    phone: user.phone,
    id_card_photo: user.id_card_photo,
    order_count: user.order_count,
  };
}

// ----------------------------------------------------------------------------
// POST /api/auth/signup
// Students:  { name, role: 'student', roll_no, phone, password }
// Owners:    { name, role: 'canteen_owner' | 'stationary_admin', phone, password }
// ----------------------------------------------------------------------------
// Students send multipart/form-data with an `id_card` image; staff can send JSON or form data.
function parseSignupUpload(req, res, next) {
  upload.single('id_card')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'ID card upload failed' });
    }
    next();
  });
}

router.post('/signup', parseSignupUpload, async (req, res) => {
  const { name, role, roll_no, phone, password } = req.body;

  if (!name || !role || !phone || !password) {
    return res.status(400).json({ error: 'name, role, phone and password are required' });
  }
  if (!ROLES.includes(role)) {
    return res.status(400).json({ error: `role must be one of ${ROLES.join(', ')}` });
  }
  if (role === 'student' && !roll_no) {
    return res.status(400).json({ error: 'roll_no is required for a student account' });
  }
  if (password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters' });
  }
  if (!/^\d{10}$/.test(String(phone).trim())) {
    return res.status(400).json({ error: 'Mobile number must be exactly 10 digits' });
  }
  if (role === 'student' && !req.file) {
    return res.status(400).json({ error: 'Please upload your ID card photo' });
  }

  try {
    if (role === 'student') {
      const existing = await User.findOne({ roll_no: roll_no.trim().toUpperCase() });
      if (existing) {
        return res.status(409).json({ error: 'An account with this roll number already exists. Please log in.' });
      }
    } else {
      // Only one owner account per role keeps the "one login per counter" model
      // simple - drop this check if your college wants multiple staff logins.
      const existingOwner = await User.findOne({ role, phone: phone.trim() });
      if (existingOwner) {
        return res.status(409).json({ error: 'An account with this phone number already exists. Please log in.' });
      }
    }

    const user = await User.create({
      name,
      role,
      roll_no: role === 'student' ? roll_no : undefined,
      phone: phone.trim(),
      password,
      id_card_photo: role === 'student' && req.file ? `/uploads/${req.file.filename}` : undefined,
    });

    const token = signToken(user);
    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'An account with these details already exists' });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: Object.values(err.errors)[0].message });
    }
    res.status(500).json({ error: 'Signup failed', detail: err.message });
  }
});

// ----------------------------------------------------------------------------
// POST /api/auth/login
// Students log in with { role: 'student', roll_no, password }
// Owners log in with   { role: 'canteen_owner' | 'stationary_admin', phone, password }
// ----------------------------------------------------------------------------
router.post('/login', async (req, res) => {
  const { role, roll_no, phone, password } = req.body;

  if (!role || !password || !ROLES.includes(role)) {
    return res.status(400).json({ error: 'A valid role and password are required' });
  }
  if (role === 'student' && !roll_no) {
    return res.status(400).json({ error: 'roll_no is required for a student login' });
  }
  if (role !== 'student' && !phone) {
    return res.status(400).json({ error: 'phone is required for an owner login' });
  }

  try {
    const query = role === 'student' ? { role, roll_no: roll_no.trim().toUpperCase() } : { role, phone: phone.trim() };
    const user = await User.findOne(query).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Incorrect credentials' });
    }

    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ error: 'Login failed', detail: err.message });
  }
});

// GET /api/auth/me - returns the signed-in user from their token, for page refreshes
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(publicUser(user));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile', detail: err.message });
  }
});

module.exports = router;
