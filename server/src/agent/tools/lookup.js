const { z } = require('zod');
const { tool } = require('@langchain/core/tools');

const MAX_RESULTS = 8;

/**
 * findDoctors — available to BOTH staff and patient callers. A patient
 * booking via WhatsApp needs to resolve "Dr. Mehta" to a real doctor too,
 * and doctor info isn't sensitive the way patient data is.
 */
function buildDoctorLookupTool({ Doctor }) {
  const findDoctors = tool(
    async ({ name, department }) => {
      const query = {};
      if (name) query.name = { $regex: name, $options: 'i' };
      if (department) query.department = { $regex: department, $options: 'i' };

      const doctors = await Doctor.find(query).limit(MAX_RESULTS).lean();

      if (doctors.length === 0) {
        return JSON.stringify({ results: [], note: 'No matching doctors. Try a broader or differently-spelled name.' });
      }

      return JSON.stringify({
        results: doctors.map((d) => ({
          doctorId: String(d._id),
          doctorCode: d.doctorCode,
          name: d.name,
          department: d.department,
          availability: d.availability,
        })),
        note:
          doctors.length > 1
            ? 'Multiple matches — ask the user to confirm which one before proceeding with any write.'
            : undefined,
      });
    },
    {
      name: 'findDoctors',
      description:
        'Search for doctors by (partial, case-insensitive) name and/or department. Use this whenever you ' +
        'have a doctor name but not their ID — never guess an ID from a name. Also the correct tool for ' +
        'doctor availability/schedule questions ("what days is Dr. Mehta in?") — each result includes their ' +
        'weekly availability directly, live from the system. Returns doctorId and doctorCode for each match; ' +
        'if more than one result comes back, ask the user which one they mean before using it in any other tool.',
      schema: z.object({
        name: z.string().optional(),
        department: z.string().optional(),
      }),
    }
  );

  return { toolInstance: findDoctors, mutating: false };
}

/**
 * findPatients — staff-only. Searching across patients by name/phone is a
 * staff operation; a patient caller already has their own ID from context
 * and has no legitimate reason to search other patients.
 */
function buildPatientLookupTool({ Patient }) {
  const findPatients = tool(
    async ({ name, phone }) => {
      const query = {};
      if (name) query.name = { $regex: name, $options: 'i' };
      if (phone) query.phone = { $regex: phone.replace(/\D/g, ''), $options: 'i' };

      const patients = await Patient.find(query).limit(MAX_RESULTS).lean();

      if (patients.length === 0) {
        return JSON.stringify({ results: [], note: 'No matching patients. Try a broader search or check spelling.' });
      }

      return JSON.stringify({
        results: patients.map((p) => ({
          patientId: String(p._id),
          patientCode: p.patientCode,
          name: p.name,
          phone: p.phone,
        })),
        note:
          patients.length > 1
            ? 'Multiple matches — ask the user to confirm which one before proceeding with any write.'
            : undefined,
      });
    },
    {
      name: 'findPatients',
      description:
        'Search for patients by (partial, case-insensitive) name and/or phone number. Staff-only. Use this ' +
        'whenever you have a patient name but not their ID — never guess an ID from a name. Returns ' +
        'patientId and patientCode for each match; if more than one result comes back, ask the user which ' +
        'one they mean before using it in any other tool.',
      schema: z.object({
        name: z.string().optional(),
        phone: z.string().optional(),
      }),
    }
  );

  return { toolInstance: findPatients, mutating: false };
}

function buildLookupTools(caller, { Doctor, Patient }) {
  const tools = [buildDoctorLookupTool({ Doctor })];
  if (caller.type === 'staff') {
    tools.push(buildPatientLookupTool({ Patient }));
  }
  return tools;
}

module.exports = { buildLookupTools };