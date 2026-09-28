const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    role: {
      type: String,
      required: true,
      enum: {
        values: ['student', 'canteen_owner', 'stationary_admin'],
        message: '{VALUE} is not a valid role',
      },
      default: 'student',
    },
    // Roll number identifies students; owners sign in with phone instead, so this
    // is only required (and only unique) for the 'student' role.
    roll_no: {
      type: String,
      trim: true,
      uppercase: true,
      required: [
        function () {
          return this.role === 'student';
        },
        'Roll number is required for students',
      ],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    // Path of the uploaded college ID card photo (students only), e.g. /uploads/123.jpg
    id_card_photo: {
      type: String,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [4, 'Password must be at least 4 characters'],
      select: false, // never returned by default on .find()/.findOne()
    },
    order_count: {
      type: Number,
      default: 0,
      min: [0, 'order_count cannot be negative'],
    },
  },
  { timestamps: true }
);

// Sparse + unique: only students have roll_no, so nulls from owner accounts
// don't collide with each other under the unique index.
UserSchema.index({ roll_no: 1 }, { unique: true, sparse: true });
UserSchema.index({ phone: 1, role: 1 });
UserSchema.index({ order_count: -1 });

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

UserSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', UserSchema);
