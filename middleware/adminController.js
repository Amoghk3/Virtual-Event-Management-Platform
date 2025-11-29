// controllers/adminController.js
const User = require('../models/User');
const emailService = require('../utils/emailService');

const ALLOWED_ROLES = ['attendee', 'organizer', 'superadmin'];

/**
 * PUT /api/admin/users/:userId/role
 * Body: { role: 'organizer' }
 * Only Superadmin may access (protected by middleware).
 */
async function changeUserRole(req, res) {
  try {
    const changer = req.user; // Mongoose doc of the changer
    const { userId } = req.params;
    const { role } = req.body;

    if (!role || typeof role !== 'string') {
      return res.status(400).json({ message: 'role is required' });
    }
    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ message: `Invalid role. Allowed: ${ALLOWED_ROLES.join(', ')}` });
    }

    // Prevent a superadmin from demoting themselves via this endpoint
    if (String(changer._id) === String(userId) && changer.role === 'superadmin' && role !== 'superadmin') {
      return res.status(400).json({ message: 'Superadmin cannot change their own role via this endpoint' });
    }

    // Only superadmin may assign superadmin role
    if (role === 'superadmin' && changer.role !== 'superadmin') {
      return res.status(403).json({ message: 'Only superadmin may assign superadmin role' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const previousRole = user.role;
    if (previousRole === role) return res.status(200).json({ message: 'No change needed', user: user.toJSON() });

    user.role = role;
    await user.save();

    // Basic audit log (consider persisting in production)
    console.log(`[AUDIT] ${new Date().toISOString()} - ${changer.email} (${changer._id}) changed ${user.email} (${user._id}) ${previousRole} -> ${role}`);

    // Notify user asynchronously
    emailService.sendMail({
      to: user.email,
      subject: 'Your account role has changed',
      text: `Hello ${user.name || user.email},\n\nYour role has been changed from ${previousRole} to ${role} by ${changer.email}.\n\nIf this wasn't you, contact support immediately.`
    }).catch(err => console.error('Role-change email error', err));

    return res.json({ message: 'Role updated', user: user.toJSON() });
  } catch (err) {
    console.error('changeUserRole error', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

module.exports = { changeUserRole };
