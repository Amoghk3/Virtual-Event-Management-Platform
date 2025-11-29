// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * authenticateJWT
 * - verifies JWT
 * - fetches the user from DB and attaches as req.user (Mongoose doc)
 */
async function authenticateJWT(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ message: 'Missing or invalid Authorization header' });
  const token = header.split(' ')[1];
  if (!token || token === 'undefined') return res.status(401).json({ message: 'Missing or invalid token' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ message: 'User not found' });
    req.user = user;
    return next();
  } catch (err) {
    console.error('authenticateJWT error', err);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

/**
 * requireRole(role)
 * - allows superadmin to bypass (convenience)
 * - otherwise requires req.user.role === role
 */
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthenticated' });
    if (req.user.role === 'superadmin') return next();
    if (req.user.role !== role) return res.status(403).json({ message: 'Forbidden' });
    return next();
  };
}

module.exports = { authenticateJWT, requireRole };
