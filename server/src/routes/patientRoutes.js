const express = require('express');
const { requireStaffAuth } = require('../middleware/auth');
const { createPatient, listPatients, getPatient } = require('../controllers/patientController');

const router = express.Router();

router.post('/', requireStaffAuth, createPatient);
router.get('/', requireStaffAuth, listPatients);
router.get('/:id', requireStaffAuth, getPatient);

module.exports = router;