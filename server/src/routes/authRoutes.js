const express = require('express');
const { requireStaffAuth, requireRole } = require('../middleware/auth');
const { bootstrapAdmin, register, login } = require('../controllers/authController');

const router = express.Router();

router.post('/bootstrap-admin', bootstrapAdmin); // unauthenticated, self-disables after first use
router.post('/register', requireStaffAuth, requireRole('admin'), register); // admin-only
router.post('/login', login); // public

module.exports = router;