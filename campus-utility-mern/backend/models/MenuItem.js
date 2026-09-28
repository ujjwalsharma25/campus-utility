const mongoose = require('mongoose');

const MenuItemSchema = new mongoose.Schema(
  {
    canteen_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Canteen',
      required: [true, 'canteen_id is required'],
    },
    item_name: {
      type: String,
      required: [true, 'item_name is required'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'price is required'],
      min: [0, 'price cannot be negative'],
    },
    image_url: {
      type: String,
      default: null,
      trim: true,
    },
    is_available: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// A canteen cannot list the same dish name twice
MenuItemSchema.index({ canteen_id: 1, item_name: 1 }, { unique: true });

module.exports = mongoose.model('MenuItem', MenuItemSchema);
