// routes/eventRoutes.js
const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { authenticateJWT, requireRole } = require('../middleware/auth');

// Public: list and get
router.get('/', eventController.listEvents);
router.get('/:id', eventController.getEvent);

// Protected: create, update, delete — only organizers or superadmin can create; update/delete owner or superadmin
router.post('/', authenticateJWT, requireRole('organizer'), eventController.createEvent);
router.put('/:id', authenticateJWT, eventController.updateEvent); // controller checks ownership / superadmin
router.delete('/:id', authenticateJWT, eventController.deleteEvent);

// Participant actions (authenticated)
router.post('/:id/register', authenticateJWT, eventController.registerForEvent);
router.post('/:id/unregister', authenticateJWT, eventController.unregisterFromEvent);

module.exports = router;
