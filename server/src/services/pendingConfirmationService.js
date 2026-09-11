async function buildContext(patient, confirmation, { Doctor, Appointment }) {
  const context = {
    patientName: patient.name || 'Unnamed patient',
    patientCode: patient.patientCode,
  };

  if (confirmation.tool === 'createAppointment') {
    const doctor = await Doctor.findById(confirmation.args.doctorId).lean();
    context.doctorName = doctor?.name || 'Unknown doctor';
    context.department = doctor?.department;
    context.requestedDatetime = confirmation.args.datetime;
  }

  if (confirmation.tool === 'rescheduleAppointment') {
    context.requestedDatetime = confirmation.args.newDatetime;
  }

  if (confirmation.tool === 'cancelAppointment') {
    const appointment = await Appointment.findById(confirmation.args.appointmentId)
      .populate('doctorId', 'name department')
      .lean();
    context.doctorName = appointment?.doctorId?.name || 'Unknown doctor';
    context.department = appointment?.doctorId?.department;
    context.requestedDatetime = appointment?.datetime;
  }

  return context;
}

async function queuePatientConfirmations(patient, confirmations, models) {
  const records = await Promise.all(
    confirmations.map(async (confirmation) =>
      models.PendingConfirmation.create({
        patientId: patient._id,
        tool: confirmation.tool,
        args: confirmation.args,
        context: await buildContext(patient, confirmation, models),
        callerType: 'patient',
      })
    )
  );
  return records;
}

module.exports = { queuePatientConfirmations };
