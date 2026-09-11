const { nextPatientCode } = require('../utils/sequence');
const { normalizePhone } = require('../utils/phone');
const { emitEvent } = require('../events/eventBus');
const { EVENTS } = require('../events/eventTypes');

async function findOrCreateProspectByPhone(rawPhone, { Patient }) {
  const phone = normalizePhone(rawPhone);

  let patient = await Patient.findOne({ phone });
  if (patient) return patient;

  const patientCode = await nextPatientCode();
  patient = await Patient.create({ patientCode, phone });

  emitEvent(EVENTS.PATIENT_PROFILE_UPDATED, { patientId: String(patient._id) });

  return patient;
}

module.exports = { findOrCreateProspectByPhone };