const { z } = require('zod');
const { tool } = require('@langchain/core/tools');
const { nextPatientCode } = require('../../utils/sequence');

function buildPatientTools(caller, { Patient }) {
  const getMyPatientProfile = tool(
    async () => {
      if (caller.type !== 'patient') throw new Error('This tool is only available to patient callers.');
      const patient = await Patient.findById(caller.patientId).lean();
      if (!patient) throw new Error('Caller patient record not found.');
      return JSON.stringify({
        patientId: String(patient._id),
        patientCode: patient.patientCode,
        name: patient.name,
        dob: patient.dob,
        profileCompletenessStage: patient.profileCompletenessStage,
      });
    },
    {
      name: 'getMyPatientProfile',
      description: 'Get the WhatsApp caller\'s own profile and whether name and DOB have been collected. Use before handling an appointment booking request.',
      schema: z.object({}),
    }
  );

  const createOrUpdatePatientProfile = tool(
    async ({ phone, name, dob }) => {
      let patient;
      let isNew = false;

      if (caller.type === 'patient') {
        patient = await Patient.findById(caller.patientId);
        if (!patient) throw new Error('Caller patient record not found.');
      } else {
        if (!phone) throw new Error('phone is required for staff-initiated profile creation.');
        patient = await Patient.findOne({ phone });
        if (!patient) {
          patient = new Patient({ phone });
          isNew = true;
        }
      }

      if (isNew) {
        patient.patientCode = await nextPatientCode();
      }

      if (name) patient.name = name;
      if (dob) patient.dob = new Date(dob);

      if (patient.name && patient.dob && patient.profileCompletenessStage === 'prospect') {
        patient.profileCompletenessStage = 'basic';
      }

      await patient.save();

      return JSON.stringify({
        patientId: patient._id,
        patientCode: patient.patientCode,
        phone: patient.phone,
        name: patient.name,
        dob: patient.dob,
        profileCompletenessStage: patient.profileCompletenessStage,
      });
    },
    {
      name: 'createOrUpdatePatientProfile',
      description:
        'Create or complete a patient profile with name/DOB. A patient caller always acts on their own ' +
        'record. For a WhatsApp patient this profile-only update is executed immediately; it does not create or change an appointment.',
      schema: z.object({
        phone: z.string().optional().describe('Required for staff callers; ignored for patient callers.'),
        name: z.string().optional(),
        dob: z.string().optional().describe('ISO date.'),
      }),
    }
  );

  const tools = [{ toolInstance: createOrUpdatePatientProfile, mutating: true, requiresConfirmation: caller.type !== 'patient' }];
  if (caller.type === 'patient') tools.unshift({ toolInstance: getMyPatientProfile, mutating: false });
  return tools;
}

module.exports = { buildPatientTools };
