const MONGO_ID_RE = /^[0-9a-fA-F]{24}$/;
const DOCTOR_CODE_RE = /^DR-\d{6}$/i;
const PATIENT_CODE_RE = /^PT-\d{6}$/i;

async function resolveDoctorRef(ref, Doctor) {
  if (!ref) return null;
  if (MONGO_ID_RE.test(ref)) return ref;

  if (DOCTOR_CODE_RE.test(ref)) {
    const doctor = await Doctor.findOne({ doctorCode: ref.toUpperCase() }).lean();
    if (!doctor) throw new Error(`No doctor found with code ${ref}.`);
    return String(doctor._id);
  }

  throw new Error(
    `"${ref}" is not a valid doctor ID or doctor code (expected format DR-000001). ` +
      `If you only have a name, call findDoctors first to look up the ID.`
  );
}

async function resolvePatientRef(ref, Patient) {
  if (!ref) return null;
  if (MONGO_ID_RE.test(ref)) return ref;

  if (PATIENT_CODE_RE.test(ref)) {
    const patient = await Patient.findOne({ patientCode: ref.toUpperCase() }).lean();
    if (!patient) throw new Error(`No patient found with code ${ref}.`);
    return String(patient._id);
  }

  throw new Error(
    `"${ref}" is not a valid patient ID or patient code (expected format PT-000001). ` +
      `If you only have a name or phone number, call findPatients first to look up the ID.`
  );
}

module.exports = { resolveDoctorRef, resolvePatientRef };