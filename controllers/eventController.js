// controllers/eventController.js
const mongoose = require('mongoose');
const Event = require('../models/Event');
const User = require('../models/User');
const emailService = require('../utils/emailService');

function badRequest(res, message) { return res.status(400).json({ message }); }
function unauthorized(res, message = 'Unauthorized') { return res.status(401).json({ message }); }
function forbidden(res, message = 'Forbidden') { return res.status(403).json({ message }); }

async function createEvent(req, res) {
  try {
    if (!req.user) return unauthorized(res, 'Authentication required');
    // require organizer role
    if (req.user.role !== 'organizer' && req.user.role !== 'superadmin') {
      return forbidden(res, 'Only organizers can create events');
    }

    const { title, description, start, end, capacity } = req.body;
    if (!title || !start) return badRequest(res, 'title and start are required');

    const ev = new Event({
      title,
      description,
      start,
      end: end || null,
      organizer: req.user._id,
      capacity: capacity || null
    });
    await ev.save();
    return res.status(201).json(ev);
  } catch (err) {
    console.error('createEvent error', err && err.message ? err.message : err);
    return res.status(500).json({ message: 'Server error' });
  }
}

async function listEvents(req, res) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const items = await Event.find()
      .sort({ start: 1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('organizer', 'name email');
    const total = await Event.countDocuments();
    return res.json({ total, page: Number(page), limit: Number(limit), items });
  } catch (err) {
    console.error('listEvents error', err && err.message ? err.message : err);
    return res.status(500).json({ message: 'Server error' });
  }
}

async function getEvent(req, res) {
  try {
    const ev = await Event.findById(req.params.id).populate('organizer', 'name email').populate('participants.user', 'name email');
    if (!ev) return res.status(404).json({ message: 'Event not found' });
    return res.json(ev);
  } catch (err) {
    console.error('getEvent error', err && err.message ? err.message : err);
    return res.status(500).json({ message: 'Server error' });
  }
}

async function updateEvent(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return badRequest(res, 'Invalid event id');

    const ev = await Event.findById(req.params.id);
    if (!ev) return res.status(404).json({ message: 'Event not found' });

    // Only the organizer (owner) or superadmin should update
    if (!ev.organizer.equals(req.user._id) && req.user.role !== 'superadmin') {
      return forbidden(res, 'Only the event organizer or superadmin may update this event');
    }

    // Build updates (allow only specific fields)
    const allowed = ['title','description','start','end','capacity'];
    const updates = {};
    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, k)) updates[k] = req.body[k];
    }
    if (Object.keys(updates).length === 0) return badRequest(res, 'No valid fields to update');

    Object.assign(ev, updates);
    ev.updatedAt = new Date();
    await ev.save();

    // notify participants (best-effort)
    const populated = await ev.populate('participants.user', 'name email');
    for (const p of populated.participants) {
      emailService.sendMail({
        to: p.user.email,
        subject: `Event updated: ${ev.title}`,
        text: `Hi ${p.user.name || p.user.email},\n\nEvent "${ev.title}" has been updated. New time: ${ev.start}\n\nThanks.`
      }).catch(err => {
        // don't crash; log short message synchronously
        console.error('event update email error', err && err.message ? err.message : err);
      });
    }

    return res.json(ev);
  } catch (err) {
    console.error('updateEvent error', err && err.message ? err.message : err);
    return res.status(500).json({ message: 'Server error' });
  }
}

async function deleteEvent(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return badRequest(res, 'Invalid event id');

    // fetch event with participant user info so we can notify them
    const ev = await Event.findById(req.params.id).populate('participants.user', 'name email organizer');
    if (!ev) return res.status(404).json({ message: 'Event not found' });

    // ownership check: organizer or superadmin allowed
    // ev.organizer may be ObjectId; compare as strings
    if (String(ev.organizer) !== String(req.user._id) && req.user.role !== 'superadmin') {
      return forbidden(res, 'Only the event organizer or superadmin may delete this event');
    }

    const participants = Array.isArray(ev.participants) ? ev.participants.slice() : [];

    // delete using model method (safe across Mongoose versions)
    await Event.deleteOne({ _id: ev._id });

    // notify participants (best-effort; swallow errors)
    for (const p of participants) {
      // if participant user was populated, p.user.email exists; otherwise skip
      const email = p.user && p.user.email;
      if (!email) continue;
      emailService.sendMail({
        to: email,
        subject: `Event cancelled: ${ev.title}`,
        text: `Hi ${p.user.name || p.user.email},\n\nEvent "${ev.title}" has been cancelled.\n\nSorry for the inconvenience.`
      }).catch(err => {
        // log short message synchronously
        console.error('event cancel email error', err && err.message ? err.message : err);
      });
    }

    return res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('deleteEvent error', err && err.message ? err.message : err);
    return res.status(500).json({ message: 'Server error' });
  }
}


async function registerForEvent(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return badRequest(res, 'Invalid event id');
    const eventId = req.params.id;
    const userId = req.user && req.user._id;
    if (!userId) return unauthorized(res, 'Authentication required');

    const ev = await Event.findById(eventId).populate('participants.user', 'name email');
    if (!ev) return res.status(404).json({ message: 'Event not found' });

    if (ev.participants.some(p => String(p.user._id || p.user) === String(userId))) {
      return badRequest(res, 'Already registered');
    }
    if (ev.capacity && ev.participants.length >= ev.capacity) {
      return badRequest(res, 'Event is full');
    }

    ev.participants.push({ user: userId, registeredAt: new Date() });
    await ev.save();

    emailService.sendMail({
      to: req.user.email,
      subject: `Registered: ${ev.title}`,
      text: `Hi ${req.user.name || req.user.email},\n\nYou've been registered for "${ev.title}" scheduled at ${ev.start}.\n\nThanks.`
    }).catch(err => console.error('registration email error', err && err.message ? err.message : err));

    return res.json({ message: 'Registered', event: ev });
  } catch (err) {
    console.error('registerForEvent error', err && err.message ? err.message : err);
    return res.status(500).json({ message: 'Server error' });
  }
}

async function unregisterFromEvent(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return badRequest(res, 'Invalid event id');
    const eventId = req.params.id;
    const userId = req.user && req.user._id;
    if (!userId) return unauthorized(res, 'Authentication required');

    const ev = await Event.findById(eventId);
    if (!ev) return res.status(404).json({ message: 'Event not found' });
    const idx = ev.participants.findIndex(p => String(p.user) === String(userId));
    if (idx === -1) return badRequest(res, 'Not registered');

    ev.participants.splice(idx, 1);
    await ev.save();

    return res.json({ message: 'Unregistered', event: ev });
  } catch (err) {
    console.error('unregisterFromEvent error', err && err.message ? err.message : err);
    return res.status(500).json({ message: 'Server error' });
  }
}

module.exports = {
  createEvent,
  listEvents,
  getEvent,
  updateEvent,
  deleteEvent,
  registerForEvent,
  unregisterFromEvent
};
