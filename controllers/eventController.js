const Event = require('../models/Event');
const User = require('../models/User');
const emailService = require('../utils/emailService');

async function createEvent(req, res) {
  try {
    const { title, description, start, end, capacity } = req.body;
    const ev = new Event({
      title, description, start, end,
      organizer: req.user._id, capacity
    });
    await ev.save();
    return res.status(201).json(ev);
  } catch (err) {
    console.error(err);
    return res.status(400).json({ message: err.message });
  }
}

async function listEvents(req, res) {
  const { page = 1, limit = 20 } = req.query;
  const skip = (Number(page)-1) * Number(limit);
  const items = await Event.find().sort({ start: 1 }).skip(skip).limit(Number(limit)).populate('organizer', 'name email');
  const total = await Event.countDocuments();
  return res.json({ total, page: Number(page), limit: Number(limit), items });
}

async function getEvent(req, res) {
  const ev = await Event.findById(req.params.id).populate('organizer', 'name email').populate('participants.user', 'name email');
  if (!ev) return res.status(404).json({ message: 'Not found' });
  return res.json(ev);
}

async function updateEvent(req, res) {
  const ev = await Event.findById(req.params.id);
  if (!ev) return res.status(404).json({ message: 'Not found' });
  if (!ev.organizer.equals(req.user._id)) return res.status(403).json({ message: 'Forbidden' });
  Object.assign(ev, req.body, { updatedAt: new Date() });
  await ev.save();
  // notify participants
  const populated = await ev.populate('participants.user', 'name email');
  for (const p of populated.participants) {
    emailService.sendEventUpdated(p.user.email, ev).catch(console.error);
  }
  return res.json(ev);
}

async function deleteEvent(req, res) {
  const ev = await Event.findById(req.params.id).populate('participants.user', 'name email');
  if (!ev) return res.status(404).json({ message: 'Not found' });
  if (!ev.organizer.equals(req.user._id)) return res.status(403).json({ message: 'Forbidden' });
  await ev.remove();
  // notify participants
  for (const p of ev.participants) emailService.sendEventCancelled(p.user.email, ev).catch(console.error);
  return res.json({ message: 'Deleted' });
}

async function registerForEvent(req, res) {
  const ev = await Event.findById(req.params.id);
  if (!ev) return res.status(404).json({ message: 'Event not found' });
  if (ev.participants.some(p => p.user.equals(req.user._id))) return res.status(400).json({ message: 'Already registered' });
  if (ev.capacity && ev.participants.length >= ev.capacity) return res.status(400).json({ message: 'Event is full' });
  ev.participants.push({ user: req.user._id });
  await ev.save();
  emailService.sendRegistration(req.user.email, ev).catch(console.error);
  return res.json({ message: 'Registered' });
}

async function unregisterFromEvent(req, res) {
  const ev = await Event.findById(req.params.id);
  if (!ev) return res.status(404).json({ message: 'Event not found' });
  const idx = ev.participants.findIndex(p => p.user.equals(req.user._id));
  if (idx === -1) return res.status(400).json({ message: 'Not registered' });
  ev.participants.splice(idx, 1);
  await ev.save();
  return res.json({ message: 'Unregistered' });
}

module.exports = { createEvent, listEvents, getEvent, updateEvent, deleteEvent, registerForEvent, unregisterFromEvent };