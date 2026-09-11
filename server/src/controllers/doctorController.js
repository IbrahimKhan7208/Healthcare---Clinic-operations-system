const { Doctor } = require('../models');
const { nextDoctorCode } = require('../utils/sequence');

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/; // "HH:MM", 24h

function validateAvailability(availability) {
  if (availability === undefined) return null;
  if (!Array.isArray(availability)) return 'availability must be an array.';

  for (const slot of availability) {
    if (!Doctor.DAY_NAMES.includes(slot.dayOfWeek)) {
      return `dayOfWeek must be one of: ${Doctor.DAY_NAMES.join(', ')}. Got: ${JSON.stringify(slot.dayOfWeek)}`;
    }
    if (!TIME_RE.test(slot.startTime) || !TIME_RE.test(slot.endTime)) {
      return `each availability slot needs startTime/endTime as "HH:MM" (24h). Got: ${JSON.stringify(slot)}`;
    }
    if (slot.startTime >= slot.endTime) {
      return `startTime must be before endTime. Got: ${JSON.stringify(slot)}`;
    }
  }
  return null;
}

async function createDoctor(req, res) {
  try {
    const { name, department, availability } = req.body;
    if (!name || !department) {
      return res.status(400).json({ error: 'name and department are required.' });
    }

    const availabilityError = validateAvailability(availability);
    if (availabilityError) return res.status(400).json({ error: availabilityError });

    const doctorCode = await nextDoctorCode();
    const doctor = await Doctor.create({ doctorCode, name, department, availability: availability || [] });
    res.status(201).json({ doctor });
  } catch (err) {
    console.error('createDoctor error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function listDoctors(req, res) {
  try {
    const { department } = req.query;
    const query = {};
    if (department) query.department = department;

    const doctors = await Doctor.find(query).sort({ name: 1 }).lean();
    res.json({ doctors });
  } catch (err) {
    console.error('listDoctors error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function getDoctor(req, res) {
  try {
    const doctor = await Doctor.findById(req.params.id).lean();
    if (!doctor) return res.status(404).json({ error: 'Doctor not found.' });
    res.json({ doctor });
  } catch (err) {
    console.error('getDoctor error:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { createDoctor, listDoctors, getDoctor };