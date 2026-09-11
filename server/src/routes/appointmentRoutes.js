const express = require('express');
const { requireStaffAuth } = require('../middleware/auth');
const { createAppointment, listAppointments, getAppointment, cancelAppointment } = require('../controllers/appointmentController');

const router = express.Router();

router.post('/', requireStaffAuth, createAppointment);
router.get('/', requireStaffAuth, listAppointments);
router.patch('/:id/cancel', requireStaffAuth, cancelAppointment);
router.get('/:id', requireStaffAuth, getAppointment);

module.exports = router;
