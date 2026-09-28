const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { User, Canteen, MenuItem, Order, PrintJob } = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');

const STATUS_FLOW = ['Pending', 'Preparing', 'Ready', 'Delivered'];
const PRICE_PER_PAGE = { 'B&W': 2, Color: 5 };
// DEMO MODE: orders go through without a UPI reference number. Turn off for real use by
// setting DEMO_SKIP_PAYMENT=false in backend/.env
const DEMO_SKIP_PAYMENT = process.env.DEMO_SKIP_PAYMENT !== 'false';
const CASH_ADVANCE_FEE = 10; // booking fee charged online even when the rest is paid as cash

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// Builds the next human-readable queue token for the day, e.g. F-001, P-014
async function generateTokenNumber(type, session) {
  const prefix = type === 'Food' ? 'F' : 'P';
  const count = await Order.countDocuments({ type, createdAt: { $gte: startOfToday() } }).session(session);
  return `${prefix}-${String(count + 1).padStart(3, '0')}`;
}

// ----------------------------------------------------------------------------
// POST /api/orders - create a Food or Print order inside a single Mongo transaction.
// Requires the signed-in user to be placing their own order (student role).
// Requires MongoDB to be running as a replica set (see README).
//
// Body (Food):  { canteen_id, type: 'Food', items: [{item_name, quantity}], payment_mode, payment_ref }
// Body (Print): { type: 'Print', print_job: {filename, pages, print_type}, payment_mode, payment_ref }
// payment_ref is the 12-digit UPI reference (UTR) - the order is not created without it.
// payment_mode is 'Cash' or 'Online'.
// ----------------------------------------------------------------------------
router.post('/', requireAuth, requireRole('student'), async (req, res) => {
  const user_id = req.user.id;
  const { type, canteen_id, items, print_job, payment_mode, payment_ref } = req.body;

  if (!type || !['Food', 'Print'].includes(type)) {
    return res.status(400).json({ error: 'A valid type (Food or Print) is required' });
  }
  if (!payment_mode || !['Cash', 'Online'].includes(payment_mode)) {
    return res.status(400).json({ error: 'payment_mode must be "Cash" or "Online"' });
  }
  let cleanRef = String(payment_ref || '').trim();
  if (!cleanRef && DEMO_SKIP_PAYMENT) {
    // unique fake reference so the unique index on payment_ref is still happy
    cleanRef = `DEMO-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  } else if (!/^\d{12}$/.test(cleanRef)) {
    return res.status(400).json({
      error: 'Enter the 12-digit UPI reference (UTR) number from your payment app to place the order',
    });
  }
  if (type === 'Food' && (!Array.isArray(items) || items.length === 0)) {
    return res.status(400).json({ error: 'Food orders require a non-empty items array' });
  }
  if (type === 'Print' && (!print_job || !print_job.filename || !print_job.pages || !print_job.print_type)) {
    return res.status(400).json({ error: 'Print orders require filename, pages and print_type' });
  }
  if (type === 'Print' && !PRICE_PER_PAGE[print_job.print_type]) {
    return res.status(400).json({ error: 'print_type must be "B&W" or "Color"' });
  }

  const session = await mongoose.startSession();

  try {
    let responseOrder;

    await session.withTransaction(async () => {
      const user = await User.findById(user_id).session(session);
      if (!user) {
        throw Object.assign(new Error('User not found'), { statusCode: 404 });
      }

      let totalAmount = 0;
      const resolvedItems = [];

      if (type === 'Food') {
        if (!canteen_id) {
          throw Object.assign(new Error('canteen_id is required for Food orders'), { statusCode: 400 });
        }

        const canteen = await Canteen.findById(canteen_id).session(session);
        if (!canteen) {
          throw Object.assign(new Error('Canteen not found'), { statusCode: 404 });
        }
        if (!canteen.is_open) {
          throw Object.assign(new Error('This canteen is currently closed'), { statusCode: 400 });
        }

        for (const item of items) {
          const menuItem = await MenuItem.findOne({ canteen_id, item_name: item.item_name }).session(session);
          if (!menuItem) {
            throw Object.assign(new Error(`Menu item "${item.item_name}" not found in this canteen`), {
              statusCode: 400,
            });
          }
          if (!menuItem.is_available) {
            throw Object.assign(new Error(`"${item.item_name}" is currently sold out`), { statusCode: 400 });
          }
          const quantity = parseInt(item.quantity, 10);
          if (!Number.isInteger(quantity) || quantity <= 0) {
            throw Object.assign(new Error(`Invalid quantity for "${item.item_name}"`), { statusCode: 400 });
          }
          totalAmount += menuItem.price * quantity;
          resolvedItems.push({ item_name: menuItem.item_name, quantity });
        }
      } else {
        const pages = parseInt(print_job.pages, 10);
        if (!Number.isInteger(pages) || pages <= 0) {
          throw Object.assign(new Error('Invalid page count for print job'), { statusCode: 400 });
        }
        totalAmount = PRICE_PER_PAGE[print_job.print_type] * pages;
      }

      const advanceFee = payment_mode === 'Cash' ? CASH_ADVANCE_FEE : 0;
      const amountDueOnline = payment_mode === 'Cash' ? advanceFee : totalAmount;
      const amountDueAtCounter = payment_mode === 'Cash' ? totalAmount : 0;

      const tokenNumber = await generateTokenNumber(type, session);

      const orderDocs = await Order.create(
        [
          {
            user_id,
            canteen_id: type === 'Food' ? canteen_id : null,
            type,
            token_number: tokenNumber,
            total_amount: totalAmount,
            order_status: 'Pending',
            items: type === 'Food' ? resolvedItems : [],
            payment_mode,
            advance_fee: advanceFee,
            amount_due_online: amountDueOnline,
            amount_due_at_counter: amountDueAtCounter,
            payment_ref: cleanRef,
          },
        ],
        { session }
      );
      const order = orderDocs[0];

      let printJobDoc = null;
      if (type === 'Print') {
        const printJobDocs = await PrintJob.create(
          [
            {
              order_id: order._id,
              filename: print_job.filename,
              pages: print_job.pages,
              print_type: print_job.print_type,
            },
          ],
          { session }
        );
        printJobDoc = printJobDocs[0];
      }

      await User.findByIdAndUpdate(user_id, { $inc: { order_count: 1 } }, { session });

      responseOrder = {
        ...order.toObject(),
        user_name: user.name,
        roll_no: user.roll_no,
        phone: user.phone,
        print_job: printJobDoc ? printJobDoc.toObject() : null,
      };
    });

    res.status(201).json(responseOrder);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'This UPI reference number was already used for another order' });
    }
    const statusCode = err.statusCode || (err.name === 'ValidationError' ? 400 : 500);
    res.status(statusCode).json({ error: err.message || 'Failed to create order' });
  } finally {
    session.endSession();
  }
});

// ----------------------------------------------------------------------------
// GET /api/orders - fetch orders oldest-first (FIFO queue). Staff only.
// Query params: status, type, canteen_id (all optional filters)
// Defaults to every order that is still active (Pending/Preparing/Ready).
// ----------------------------------------------------------------------------
router.get('/', requireAuth, requireRole('canteen_owner', 'stationary_admin'), async (req, res) => {
  const { status, canteen_id } = req.query;
  const filter = {};

  if (status) {
    filter.order_status = status;
  } else {
    filter.order_status = { $in: ['Pending', 'Preparing', 'Ready'] };
  }
  // A canteen_owner only ever sees Food orders, a stationary_admin only Print -
  // enforced server-side regardless of what the client asks for.
  filter.type = req.user.role === 'canteen_owner' ? 'Food' : 'Print';
  if (canteen_id) filter.canteen_id = canteen_id;

  try {
    const orders = await Order.find(filter)
      .sort({ createdAt: 1 })
      .populate('user_id', 'name roll_no phone id_card_photo')
      .lean();

    if (orders.length === 0) {
      return res.json([]);
    }

    const orderIds = orders.map((o) => o._id);
    const printJobs = await PrintJob.find({ order_id: { $in: orderIds } }).lean();

    const printByOrder = {};
    for (const pj of printJobs) {
      printByOrder[pj.order_id.toString()] = {
        filename: pj.filename,
        pages: pj.pages,
        print_type: pj.print_type,
      };
    }

    const enriched = orders.map((o) => ({
      _id: o._id,
      user_id: o.user_id?._id,
      user_name: o.user_id?.name,
      roll_no: o.user_id?.roll_no,
      phone: o.user_id?.phone,
      id_card_photo: o.user_id?.id_card_photo,
      canteen_id: o.canteen_id,
      type: o.type,
      token_number: o.token_number,
      total_amount: o.total_amount,
      order_status: o.order_status,
      payment_mode: o.payment_mode,
      advance_fee: o.advance_fee,
      amount_due_online: o.amount_due_online,
      amount_due_at_counter: o.amount_due_at_counter,
      payment_ref: o.payment_ref,
      createdAt: o.createdAt,
      items: o.items || [],
      print_job: printByOrder[o._id.toString()] || null,
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders', detail: err.message });
  }
});

// ----------------------------------------------------------------------------
// GET /api/orders/history/:userId - a student's full order history + spend summary.
// A student can only view their own history.
// ----------------------------------------------------------------------------
router.get('/history/:userId', requireAuth, async (req, res) => {
  const { userId } = req.params;

  if (req.user.role !== 'student' || req.user.id !== userId) {
    return res.status(403).json({ error: 'You can only view your own order history' });
  }

  try {
    const orders = await Order.find({ user_id: userId }).sort({ createdAt: -1 }).lean();

    const totalSpend = orders.reduce((sum, o) => sum + o.total_amount + (o.advance_fee || 0), 0);

    const monthlyMap = {};
    for (const o of orders) {
      const key = new Date(o.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
      monthlyMap[key] = (monthlyMap[key] || 0) + o.total_amount + (o.advance_fee || 0);
    }
    const monthlySpend = Object.entries(monthlyMap)
      .map(([month, amount]) => ({ month, amount }))
      .reverse();

    res.json({
      total_spend: totalSpend,
      total_orders: orders.length,
      monthly_spend: monthlySpend,
      orders,
    });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid user id' });
    }
    res.status(500).json({ error: 'Failed to fetch order history', detail: err.message });
  }
});

// ----------------------------------------------------------------------------
// PUT /api/orders/:id/status - advance an order exactly one step along the flow:
// Pending -> Preparing -> Ready -> Delivered
// Restricted to the matching staff role, and atomic so two staff tapping the
// same token at once can't both advance it.
// ----------------------------------------------------------------------------
router.put('/:id/status', requireAuth, requireRole('canteen_owner', 'stationary_admin'), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !STATUS_FLOW.includes(status)) {
    return res.status(400).json({ error: `status must be one of ${STATUS_FLOW.join(', ')}` });
  }

  try {
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const expectedType = req.user.role === 'canteen_owner' ? 'Food' : 'Print';
    if (order.type !== expectedType) {
      return res.status(403).json({ error: `You can only update ${expectedType} orders` });
    }

    const currentIndex = STATUS_FLOW.indexOf(order.order_status);
    const requestedIndex = STATUS_FLOW.indexOf(status);

    if (requestedIndex !== currentIndex + 1) {
      return res.status(400).json({
        error: `Invalid transition from "${order.order_status}" to "${status}". Orders advance one step at a time: ${STATUS_FLOW.join(' -> ')}`,
      });
    }

    const updated = await Order.findOneAndUpdate(
      { _id: id, order_status: order.order_status },
      { order_status: status },
      { new: true }
    );

    if (!updated) {
      return res.status(409).json({ error: 'Order status changed elsewhere, please refresh and try again' });
    }

    res.json(updated);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid order id' });
    }
    res.status(500).json({ error: 'Failed to update order status', detail: err.message });
  }
});

module.exports = router;
