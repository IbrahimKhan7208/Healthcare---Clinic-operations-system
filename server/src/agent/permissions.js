/**
 * Caller context shapes what a tool is allowed to see/touch. This is the
 * single choke point for the "staff = full access, patient = own record only"
 * rule from spec §2. Tools never trust LLM-supplied patientId for a patient
 * caller — it's always forced from context, never from the model's arguments.
 *
 * CallerContext:
 *   staff:   { type: 'staff', staffId, role }
 *   patient: { type: 'patient', patientId }   // patientId = verified via phone match
 */

function assertStaff(caller) {
  if (caller.type !== 'staff') {
    throw new PermissionError('This action requires staff access.');
  }
}

function scopePatientId(caller, requestedPatientId) {
  // Staff may query/act on any patient (requestedPatientId passed through).
  // Patients are hard-pinned to their own id regardless of what the model asked for.
  if (caller.type === 'staff') return requestedPatientId;
  if (caller.type === 'patient') return caller.patientId;
  throw new PermissionError('Unknown caller type.');
}

class PermissionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PermissionError';
  }
}

module.exports = { assertStaff, scopePatientId, PermissionError };