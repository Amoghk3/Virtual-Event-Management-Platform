const mongoose = require('mongoose');

const ParticipantSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  registeredAt: { type: Date, default: Date.now }
}, { _id: false });

const EventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String },
  start: { type: Date, required: true },
  end: { type: Date },
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  capacity: { type: Number, default: null },
  participants: [ParticipantSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

EventSchema.index({ start: 1 }); // index for queries by date

EventSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Event', EventSchema);