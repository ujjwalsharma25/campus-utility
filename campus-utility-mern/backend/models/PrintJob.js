const mongoose = require('mongoose');

const PrintJobSchema = new mongoose.Schema(
  {
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'order_id is required'],
      unique: true, // one print job per print order
    },
    filename: {
      type: String,
      required: [true, 'filename is required'],
      trim: true,
    },
    pages: {
      type: Number,
      required: [true, 'pages is required'],
      min: [1, 'pages must be at least 1'],
    },
    print_type: {
      type: String,
      required: true,
      enum: {
        values: ['B&W', 'Color'],
        message: '{VALUE} is not a valid print_type',
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PrintJob', PrintJobSchema);
