const mongoose = require('mongoose');

// Embedded line item for a Food order - lives inside the Order document itself,
// there is no separate collection for these since they never exist without an order.
const OrderItemSchema = new mongoose.Schema(
  {
    item_name: {
      type: String,
      required: [true, 'item_name is required'],
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, 'quantity is required'],
      min: [1, 'quantity must be at least 1'],
    },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'user_id is required'],
    },
    canteen_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Canteen',
      default: null, // null for Print orders, which are not tied to a food counter
    },
    type: {
      type: String,
      required: true,
      enum: {
        values: ['Food', 'Print'],
        message: '{VALUE} is not a valid order type',
      },
    },
    token_number: {
      type: String,
      required: [true, 'token_number is required'],
    },
    total_amount: {
      type: Number,
      required: [true, 'total_amount is required'],
      min: [0, 'total_amount cannot be negative'],
    },
    order_status: {
      type: String,
      enum: {
        values: ['Pending', 'Preparing', 'Ready', 'Delivered'],
        message: '{VALUE} is not a valid order status',
      },
      default: 'Pending',
    },
    items: {
      type: [OrderItemSchema],
      default: [],
    },
    // Payment: no gateway or paid API is used anywhere in this app. 'Online' pays
    // the full total through a free upi://pay deep link; 'Cash' pays a small
    // refundable-in-spirit ₹10 booking fee the same way (so a token can't be
    // reserved and then abandoned) and the rest in cash at the counter.
    payment_mode: {
      type: String,
      required: true,
      enum: {
        values: ['Cash', 'Online'],
        message: '{VALUE} is not a valid payment_mode',
      },
    },
    advance_fee: {
      type: Number,
      default: 0, // 10 for Cash orders, 0 for Online orders
      min: 0,
    },
    amount_due_online: {
      type: Number,
      required: true, // total_amount for Online, advance_fee for Cash
      min: 0,
    },
    amount_due_at_counter: {
      type: Number,
      required: true, // 0 for Online, total_amount for Cash
      min: 0,
    },
    // 12-digit UPI reference (UTR) the student copied from their payment app.
    // The order only exists once this is supplied. Staff can cross-check it
    // against their own UPI app; the same reference can't be used twice.
    payment_ref: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true } // createdAt / updatedAt
);

// The live queue is always filtered by status and sorted oldest-first (FIFO)
OrderSchema.index({ order_status: 1, createdAt: 1 });
OrderSchema.index({ type: 1, createdAt: 1 });
// Partial index: older orders without a payment_ref don't collide with each other
OrderSchema.index(
  { payment_ref: 1 },
  { unique: true, partialFilterExpression: { payment_ref: { $type: 'string' } } }
);

module.exports = mongoose.model('Order', OrderSchema);
