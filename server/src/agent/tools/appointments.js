const { z } = require('zod');
const { tool } = require('@langchain/core/tools');
const { scopePatientId } = require('../permissions');
const { resolveDoctorRef, resolvePatientRef } = require('../resolvers');

function buildAppointmentTools(caller, { Appointment, Doctor, Patient }) {
  const getAppointments = tool(
    async ({ patientId, doctorId, status, fromDate, toDate }) => {
      const resolvedPatientRef = await resolvePatientRef(patientId, Patient);
      const resolvedDoctorRef = await resolveDoctorRef(doctorId, Doctor);
      const scopedPatientId = scopePatientId(caller, resolvedPatientRef);

      const query = {};
      if (scopedPatientId) query.patientId = scopedPatientId;
      if (resolvedDoctorRef) query.doctorId = resolvedDoctorRef;
      if (status) query.status = status;
      if (fromDate || toDate) {
        query.datetime = {};
        if (fromDate) query.datetime.$gte = new Date(fromDate);
        if (toDate) query.datetime.$lte = new Date(toDate);
      }

      const results = await Appointment.find(query)
        .populate('doctorId', 'name department doctorCode')
        .populate('patientId', 'name phone patientCode')
        .sort({ datetime: 1 })
        .lean();

      return JSON.stringify(results);
    },
    {
      name: 'getAppointments',
      description:
        'Look up appointments. patientId and doctorId each accept either the Mongo ID or the human-readable ' +
        'code (PT-000001 / DR-000001) — NOT a name. If you only have a name, call findPatients or findDoctors ' +
        'first. Staff can filter by any patient/doctor/status/date range; a patient caller always sees only ' +
        'their own appointments regardless of patientId passed.',
      schema: z.object({
        patientId: z.string().optional().describe('Mongo ID or patientCode (e.g. PT-000001). Ignored for patient callers.'),
        doctorId: z.string().optional().describe('Mongo ID or doctorCode (e.g. DR-000001).'),
        status: z.enum(['scheduled', 'completed', 'cancelled', 'no-show']).optional(),
        fromDate: z.string().optional().describe('ISO date, inclusive lower bound.'),
        toDate: z.string().optional().describe('ISO date, inclusive upper bound.'),
      }),
    }
  );

  const rescheduleAppointment = tool(
    async ({ appointmentId, newDatetime }) => {
      const appointment = await Appointment.findById(appointmentId).populate('doctorId', 'name');
      if (!appointment) throw new Error(`Appointment ${appointmentId} not found`);

      if (caller.type === 'patient' && String(appointment.patientId) !== String(caller.patientId)) {
        throw new Error('Cannot reschedule an appointment that does not belong to this patient.');
      }

      const before = appointment.datetime;
      appointment.datetime = new Date(newDatetime);
      await appointment.save();

      return JSON.stringify({
        appointmentId,
        patientId: String(appointment.patientId),
        doctor: appointment.doctorId?.name,
        before,
        after: appointment.datetime,
      });
    },
    {
      name: 'rescheduleAppointment',
      description:
        'Reschedule an existing appointment to a new date/time. appointmentId must be the real Mongo ID of ' +
        'the appointment — get it from getAppointments first, never guess it. This is a WRITE — requires confirmation.',
      schema: z.object({
        appointmentId: z.string().describe('Mongo ObjectId of the appointment to reschedule.'),
        newDatetime: z.string().describe('New ISO datetime for the appointment.'),
      }),
    }
  );

  const createAppointment = tool(
    async ({ patientId, doctorId, datetime }) => {
      const effectivePatientId = caller.type === 'patient' ? caller.patientId : patientId;
      if (!effectivePatientId) throw new Error('patientId is required for staff callers.');

      const parsedDatetime = new Date(datetime);
      if (Number.isNaN(parsedDatetime.getTime())) throw new Error('datetime must be a valid ISO date string.');

      const [patient, doctor] = await Promise.all([
        Patient.findById(effectivePatientId).lean(),
        Doctor.findById(doctorId).lean(),
      ]);
      if (!patient) throw new Error(`Patient ${effectivePatientId} not found.`);
      if (!doctor) throw new Error(`Doctor ${doctorId} not found.`);

      const conflict = await Appointment.findOne({ doctorId, datetime: parsedDatetime, status: 'scheduled' }).lean();
      if (conflict) throw new Error('The doctor already has a scheduled appointment at this exact time.');

      const appointment = await Appointment.create({
        patientId: effectivePatientId,
        doctorId,
        datetime: parsedDatetime,
        createdVia: caller.type === 'patient' ? 'whatsapp' : 'staff',
      });

      return JSON.stringify({
        appointmentId: String(appointment._id),
        patientId: String(appointment.patientId),
        doctorId: String(appointment.doctorId),
        datetime: appointment.datetime,
        createdVia: appointment.createdVia,
      });
    },
    {
      name: 'createAppointment',
      description:
        'Create an appointment after the patient, doctor, and ISO datetime are known. For a patient caller, patientId is always their own record. This is a WRITE — requires staff confirmation.',
      schema: z.object({
        patientId: z.string().optional().describe('Required for staff callers. Ignored for patient callers.'),
        doctorId: z.string().describe('Real Mongo ID for the doctor, from findDoctors.'),
        datetime: z.string().describe('Requested ISO datetime.'),
      }),
    }
  );

  const cancelAppointment = tool(
    async ({ appointmentId }) => {
      const appointment = await Appointment.findById(appointmentId).populate('doctorId', 'name');
      if (!appointment) throw new Error(`Appointment ${appointmentId} not found.`);

      if (caller.type === 'patient' && String(appointment.patientId) !== String(caller.patientId)) {
        throw new Error('Cannot cancel an appointment that does not belong to this patient.');
      }
      if (appointment.status !== 'scheduled') {
        throw new Error(`Appointment ${appointmentId} is already ${appointment.status} and cannot be cancelled.`);
      }

      appointment.status = 'cancelled';
      await appointment.save();

      return JSON.stringify({
        appointmentId: String(appointment._id),
        patientId: String(appointment.patientId),
        doctor: appointment.doctorId?.name,
        datetime: appointment.datetime,
        status: appointment.status,
      });
    },
    {
      name: 'cancelAppointment',
      description:
        'Cancel an existing scheduled appointment. appointmentId must be the real Mongo ID from getAppointments; never guess it. This is a WRITE — requires staff confirmation.',
      schema: z.object({
        appointmentId: z.string().describe('Mongo ObjectId of the appointment to cancel.'),
      }),
    }
  );

  return [
    { toolInstance: getAppointments, mutating: false },
    { toolInstance: rescheduleAppointment, mutating: true },
    { toolInstance: createAppointment, mutating: true },
    { toolInstance: cancelAppointment, mutating: true },
  ];
}

module.exports = { buildAppointmentTools };
