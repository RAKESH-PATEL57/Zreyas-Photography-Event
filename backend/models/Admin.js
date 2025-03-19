const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const AdminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'superadmin'],
    default: 'admin'
  },
  isSuperAdmin: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Hash password before saving
AdminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Method to compare passwords
AdminSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Make sure isSuperAdmin and role are consistent
AdminSchema.pre('save', function(next) {
  if (this.role === 'superadmin') {
    this.isSuperAdmin = true;
  } else {
    this.isSuperAdmin = false;
  }
  next();
});

module.exports = mongoose.model('Admin', AdminSchema);