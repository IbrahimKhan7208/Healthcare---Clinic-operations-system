const express = require('express');
const { requireStaffAuth, requireRole } = require('../middleware/auth');
const { createDoctor, listDoctors, getDoctor } = require('../controllers/doctorController');

const router = express.Router();

router.post('/', requireStaffAuth, requireRole('admin'), createDoctor);
router.get('/', requireStaffAuth, listDoctors);
router.get('/:id', requireStaffAuth, getDoctor);

module.exports = router;