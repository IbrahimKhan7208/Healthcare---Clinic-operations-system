const { emitEvent } = require('../events/eventBus');
const { EVENTS } = require('../events/eventTypes');

function extractedPatientName(document) {
  return document.type === 'insurance_card'
    ? document.extractedFields?.memberName
    : document.extractedFields?.patientName;
}

function normalizedName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

function assertPatientNameMatches(document, patient) {
  const extractedName = extractedPatientName(document);
  // No name in the source or no name recorded for the patient means staff
  // must use the other review evidence. A name on both sides must agree.
  if (extractedName && patient.name && normalizedName(extractedName) !== normalizedName(patient.name)) {
    throw new Error(`Patient identity mismatch: the document says "${extractedName}" but the selected patient is "${patient.name}". Choose the matching patient or correct the extracted field before approving.`);
  }
}

async function resolvePatient(document, suppliedPatientId, { Patient }) {
  if (suppliedPatientId) {
    const patient = await Patient.findById(suppliedPatientId);
    if (!patient) throw new Error('Selected patient was not found.');
    return patient;
  }
  if (document.patientId) return Patient.findById(document.patientId);

  const name = extractedPatientName(document);
  return name ? Patient.findOne({ name: new RegExp(`^${name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }) : null;
}

async function applyExtractedProfile(patient, document) {
  if (!patient) return;
  const name = extractedPatientName(document);
  const dob = document.extractedFields?.ageOrDob;
  if (name && !patient.name) patient.name = name;
  if (dob && !patient.dob) {
    const parsedDob = new Date(dob);
    if (!Number.isNaN(parsedDob.getTime())) patient.dob = parsedDob;
  }
  if (patient.name && patient.dob && patient.profileCompletenessStage === 'prospect') {
    patient.profileCompletenessStage = 'basic';
  }
  await patient.save();
}

async function reviewDocument({ document, approve, correctedFields, patientId, staffId, models }) {
  if (correctedFields && typeof correctedFields === 'object' && !Array.isArray(correctedFields)) {
    document.extractedFields = { ...document.extractedFields, ...correctedFields };
  }

  let patient = null;
  if (approve) {
    patient = await resolvePatient(document, patientId, models);
    // A document remains useful without a match, but approving it into an
    // operational record requires a known phone-anchored patient.
    if (!patient) throw new Error('Associate this document with an existing patient before approving it.');
    assertPatientNameMatches(document, patient);
    document.patientId = patient._id;
    await applyExtractedProfile(patient, document);
  }

  document.status = approve ? 'approved' : 'rejected';
  document.reviewedBy = staffId;
  await document.save();

  if (approve && patient) {
    emitEvent(EVENTS.PATIENT_PROFILE_UPDATED, { patientId: String(patient._id) });
    if (document.type === 'referral') {
      emitEvent(EVENTS.REFERRAL_RECEIVED, { documentId: String(document._id), patientId: String(patient._id) });
    }
  }

  return document;
}

module.exports = { reviewDocument, extractedPatientName, normalizedName };
