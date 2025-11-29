// controllers/adminController.js
const mongoose = require('mongoose');
const User = require('../models/User');
const emailService = require('../utils/emailService');

const ALLOWED_ROLES = ['attendee', 'organizer', 'superadmin'];

async function changeUserRole(req, res) {
  try {
    const changer = req.user; // attached by authenticateJWT middleware
    const { userId } = req.params;
    const { role } = req.body;

    if (!role || typeof role !== 'string') {
      return res.status(400).json({ message: 'role is required' });
    }
    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ message: `Invalid role. Allowed: ${ALLOWED_ROLES.join(', ')}` });
    }

    // Validate userId as ObjectId early to avoid CastError
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: 'Invalid userId format' });
    }

    // Prevent self-demotion via this endpoint
    if (String(changer._id) === String(userId) && changer.role === 'superadmin' && role !== 'superadmin') {
      return res.status(400).json({ message: 'Superadmin cannot change their own role via this endpoint' });
    }

    // Only superadmin may assign superadmin role (defense-in-depth)
    if (role === 'superadmin' && changer.role !== 'superadmin') {
      return res.status(403).json({ message: 'Only superadmin may assign superadmin role' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const previousRole = user.role;
    if (previousRole === role) {
      return res.status(200).json({ message: 'No change needed', user: user.toJSON() });
    }

    user.role = role;
    await user.save();

    // Audit log (console). Persist to DB in production.
    console.log(`[AUDIT] ${new Date().toISOString()} - ${changer.email} (${changer._id}) changed role of ${user.email} (${user._id}) from ${previousRole} -> ${role}`);

    // Notify the affected user (best-effort; swallow errors)
    emailService.sendMail({
      to: user.email,
      subject: 'Your account role has changed',
      text: `Hi ${user.name || user.email},\n\nYour role was changed from ${previousRole} to ${role} by ${changer.email}.`
    }).catch(err => {
      // swallow (but log synchronously so jest can capture it if needed)
      console.error('Role-change email error', err && err.message ? err.message : err);
    });

    return res.json({ message: 'Role updated', user: user.toJSON() });
  } catch (err) {
    console.error('changeUserRole error', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

module.exports = { changeUserRole };
