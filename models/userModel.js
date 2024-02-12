const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { userEnum } = require('../contanst/data');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: (value) => /^[a-zA-Z]+\s[a-zA-Z]+$/.test(value),
      message: 'Name must contain one space between first name and last name.',
    },
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    validate: {
      validator: (value) => /^[0-9]{10}$/.test(value),
      message: 'Phone number must be 10 digits.',
    },
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    validate: {
      validator: (value) => value === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      message: 'Invalid email format.',
    },
  },
  role: {
    type: String,
    required: true,
    enum: userEnum,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  joinDate: {
    type: Date,
    default: Date.now()
  },
  createdDate: {
    type: Date,
    default: Date.now()
  },
  lastUpdatedDate: {
    type: Date,
    default: Date.now()
  },
  address: {
    type: String,
  }
},
  {
    versionKey: false,
  }
);

userSchema.pre('save', async function (next) {
  const user = this;
  if (!user.isModified('password')) {
    return next();
  }

  try {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    user.password = hashedPassword;
    next();
  } catch (err) {
    return next(err);
  }
});

userSchema.pre('findOneAndUpdate', function (next) {
  this.set({ lastUpdatedDate: new Date() });
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;
