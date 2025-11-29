// controllers/authController.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const emailService = require('../utils/emailService');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

async function register(req, res) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email and password are required' });
    }

    const normalizedEmail = email.toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) return res.status(400).json({ message: 'Email already registered' });

    // Force role to attendee: never trust client-provided role
    const user = new User({ name, email: normalizedEmail, password, role: 'attendee' });
    await user.save();

    // Send welcome email asynchronously (non-blocking)
    emailService.sendWelcome(user).catch(err => console.error('Welcome email failed', err));

    return res.status(201).json(user.toJSON());
  } catch (err) {
    console.error('register error', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'email and password required' });

    const normalized = email.toLowerCase();
    const user = await User.findOne({ email: normalized });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    // Sign token with user id only; we will fetch user from DB on each request
    const payload = { id: user._id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return res.json({ token, user: user.toJSON() });
  } catch (err) {
    console.error('login error', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

module.exports = { register, login };
