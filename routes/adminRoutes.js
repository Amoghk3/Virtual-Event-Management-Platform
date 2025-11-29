// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateJWT, requireRole } = require('../middleware/auth');
const { changeUserRole } = require('../controllers/adminController');

// Only accessible by superadmin (requireRole enforces superadmin or allows superadmin bypass)
router.put('/users/:userId/role', authenticateJWT, requireRole('superadmin'), changeUserRole);

module.exports = router;
