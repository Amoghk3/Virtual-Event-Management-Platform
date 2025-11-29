const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, index: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['organizer','attendee'], default: 'attendee' },
  createdAt: { type: Date, default: Date.now }
});

// pre-save hashing
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const hash = await bcrypt.hash(this.password, SALT_ROUNDS);
  this.password = hash;
  next();
});

// instance method
UserSchema.methods.comparePassword = function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

// remove sensitive data in toJSON
UserSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', UserSchema);
