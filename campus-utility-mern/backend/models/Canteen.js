const mongoose = require('mongoose');

const CanteenSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Canteen name is required'],
      unique: true,
      trim: true,
    },
    is_open: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Canteen', CanteenSchema);
