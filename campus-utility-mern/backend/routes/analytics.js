const express = require('express');
const router = express.Router();
const { Order } = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

// GET /api/analytics/summary - revenue + order dashboard for the signed-in owner's
// queue (Food for canteen_owner, Print for stationary_admin). Only counts
// Delivered orders as "earned" revenue - anything still in the queue hasn't
// actually been collected yet.
router.get('/summary', requireAuth, requireRole('canteen_owner', 'stationary_admin'), async (req, res) => {
  const type = req.user.role === 'canteen_owner' ? 'Food' : 'Print';

  try {
    const deliveredFilter = { type, order_status: 'Delivered' };

    const [todayAgg] = await Order.aggregate([
      { $match: { ...deliveredFilter, createdAt: { $gte: startOfToday() } } },
      { $group: { _id: null, revenue: { $sum: '$total_amount' }, orders: { $sum: 1 } } },
    ]);

    const [monthAgg] = await Order.aggregate([
      { $match: { ...deliveredFilter, createdAt: { $gte: startOfMonth() } } },
      { $group: { _id: null, revenue: { $sum: '$total_amount' }, orders: { $sum: 1 } } },
    ]);

    const dailyBreakdown = await Order.aggregate([
      { $match: { ...deliveredFilter, createdAt: { $gte: startOfMonth() } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$total_amount' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const activeOrders = await Order.countDocuments({ type, order_status: { $in: ['Pending', 'Preparing', 'Ready'] } });

    const recentHistory = await Order.find({ type, order_status: 'Delivered' })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('user_id', 'name roll_no phone id_card_photo')
      .lean();

    res.json({
      today_revenue: todayAgg?.revenue || 0,
      today_orders: todayAgg?.orders || 0,
      month_revenue: monthAgg?.revenue || 0,
      month_orders: monthAgg?.orders || 0,
      active_orders: activeOrders,
      daily_breakdown: dailyBreakdown.map((d) => ({ date: d._id, revenue: d.revenue, orders: d.orders })),
      recent_history: recentHistory.map((o) => ({
        _id: o._id,
        token_number: o.token_number,
        user_name: o.user_id?.name,
        roll_no: o.user_id?.roll_no,
        phone: o.user_id?.phone,
        id_card_photo: o.user_id?.id_card_photo,
        total_amount: o.total_amount,
        payment_mode: o.payment_mode,
        createdAt: o.createdAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dashboard data', detail: err.message });
  }
});

module.exports = router;
