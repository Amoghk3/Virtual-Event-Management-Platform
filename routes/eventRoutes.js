const express = require('express');
const { authenticateJWT, requireRole } = require('../middleware/auth');
const { createEvent, listEvents, getEvent, updateEvent, deleteEvent, registerForEvent, unregisterFromEvent } = require('../controllers/eventController');
const { body, validationResult } = require('express-validator');

const router = express.Router();

router.get('/', listEvents);
router.get('/:id', getEvent);

const eventValidation = [
  body('title').isString().notEmpty(),
  body('start').isISO8601(),
  (req, res, next) => { const errs = validationResult(req); if (!errs.isEmpty()) return res.status(400).json({ errors: errs.array() }); next(); }
];

router.post('/', authenticateJWT, requireRole('organizer'), eventValidation, createEvent);
router.put('/:id', authenticateJWT, requireRole('organizer'), eventValidation, updateEvent);
router.delete('/:id', authenticateJWT, requireRole('organizer'), deleteEvent);

router.post('/:id/register', authenticateJWT, registerForEvent);
router.post('/:id/unregister', authenticateJWT, unregisterFromEvent);

module.exports = router;
