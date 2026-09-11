const { Patient } = require('../models');
const { nextPatientCode } = require('../utils/sequence');
const { emitEvent } = require('../events/eventBus');
const { EVENTS } = require('../events/eventTypes');

const { normalizePhone } = require('../utils/phone');
const PHONE_RE = /^\+[1-9]\d{7,14}$/;

function computeStage(patient) {
  if (patient.name && patient.dob) return 'basic';
  return 'prospect';
}

async function createPatient(req, res) {
  try {
    const { phone, name, dob } = req.body;
    if (!phone) return res.status(400).json({ error: 'phone is required.' });
    const normalizedPhone = normalizePhone(phone);
    if (!PHONE_RE.test(normalizedPhone)) return res.status(400).json({ error: 'phone must be a valid number, e.g. +919876543210.' });
    
    const patientCode = await nextPatientCode();
    const patientData = { patientCode, phone: normalizedPhone };
    if (name) patientData.name = name;
    if (dob) patientData.dob = new Date(dob);
    patientData.profileCompletenessStage = computeStage(patientData);

    const patient = await Patient.create(patientData);
    emitEvent(EVENTS.PATIENT_PROFILE_UPDATED, { patientId: String(patient._id) });
    res.status(201).json({ patient });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'A patient with this phone number already exists.' });
    console.error('createPatient error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function listPatients(req, res) {
  try {
    const { phone, stage } = req.query;
    const query = {};
    if (phone) query.phone = phone;
    if (stage) query.profileCompletenessStage = stage;

    const patients = await Patient.find(query).sort({ created_at: -1 }).lean();
    res.json({ patients });
  } catch (err) {
    console.error('listPatients error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function getPatient(req, res) {
  try {
    const patient = await Patient.findById(req.params.id).lean();
    if (!patient) return res.status(404).json({ error: 'Patient not found.' });
    res.json({ patient });
  } catch (err) {
    console.error('getPatient error:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { createPatient, listPatients, getPatient };