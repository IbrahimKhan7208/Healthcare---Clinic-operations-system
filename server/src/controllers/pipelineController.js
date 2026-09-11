const { Appointment, Document, PipelineStage } = require('../models');

async function listPipeline(req, res) {
  try {
    const stages = await PipelineStage.find({})
      .populate('patientId', 'name patientCode phone profileCompletenessStage')
      .sort({ updated_at: -1 })
      .lean();

    const patientIds = stages.filter((stage) => stage.patientId?._id).map((stage) => stage.patientId._id);
    const [appointments, documents] = await Promise.all([
      Appointment.find({ patientId: { $in: patientIds }, status: 'scheduled' })
        .populate('doctorId', 'name department')
        .sort({ datetime: 1 })
        .lean(),
      Document.find({ patientId: { $in: patientIds } }).select('patientId status type').lean(),
    ]);

    const nextAppointmentByPatient = new Map();
    for (const appointment of appointments) {
      const key = String(appointment.patientId);
      if (!nextAppointmentByPatient.has(key)) nextAppointmentByPatient.set(key, appointment);
    }

    const documentCountsByPatient = new Map();
    for (const document of documents) {
      const key = String(document.patientId);
      const counts = documentCountsByPatient.get(key) || { total: 0, pendingReview: 0 };
      counts.total += 1;
      if (document.status === 'pending_review') counts.pendingReview += 1;
      documentCountsByPatient.set(key, counts);
    }

    const pipeline = stages
      .filter((stage) => stage.patientId)
      .map((stage) => {
        const patientId = String(stage.patientId._id);
        return {
          ...stage,
          nextAppointment: nextAppointmentByPatient.get(patientId) || null,
          documents: documentCountsByPatient.get(patientId) || { total: 0, pendingReview: 0 },
        };
      });

    res.json({ stages: PipelineStage.STAGES, pipeline });
  } catch (err) {
    console.error('listPipeline error:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { listPipeline };
