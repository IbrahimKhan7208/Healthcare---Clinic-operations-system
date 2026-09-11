const EVENTS = Object.freeze({
  APPOINTMENT_CREATED: 'appointment.created',
  APPOINTMENT_RESCHEDULED: 'appointment.rescheduled',
  APPOINTMENT_CANCELLED: 'appointment.cancelled',
  PATIENT_PROFILE_UPDATED: 'patient.profileUpdated',
  INSURANCE_STATUS_UPDATED: 'insurance.statusUpdated',
  REFERRAL_RECEIVED: 'referral.received', // reserved — step 3 (OCR intake)
  DOCUMENT_UPLOADED: 'document.uploaded', // reserved — step 3 (OCR intake)
  FOLLOWUP_DUE: 'followup.due', // reserved — step 2 (WhatsApp reminders/scheduler)
});

module.exports = { EVENTS };
