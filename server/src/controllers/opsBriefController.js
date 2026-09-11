const { Appointment, Document, PendingConfirmation, PipelineStage, ConversationLog } = require('../models');

function dayBounds(now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

async function getOpsBrief(req, res) {
  try {
    const now = new Date();
    const { start, end } = dayBounds(now);
    const followUpCutoff = new Date(now);
    followUpCutoff.setDate(followUpCutoff.getDate() - 7);
    const weekEnd = new Date(end);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const [pendingDocuments, pendingConfirmations, openHandoffs, todayAppointments, followUps, pipeline] = await Promise.all([
      Document.countDocuments({ status: 'pending_review' }),
      PendingConfirmation.countDocuments({ status: 'pending' }),
      ConversationLog.countDocuments({ escalated: true, resolvedAt: null }),
      Appointment.find({ status: 'scheduled', datetime: { $gte: start, $lt: end } })
        .populate('doctorId', 'name department')
        .populate('patientId', 'name')
        .sort({ datetime: 1 })
        .lean(),
      PipelineStage.countDocuments({ currentStage: 'Follow-up', updated_at: { $lt: followUpCutoff } }),
      PipelineStage.aggregate([{ $group: { _id: '$currentStage', count: { $sum: 1 } } }]),
    ]);

    const doctorLoad = new Map();
    for (const appointment of todayAppointments) {
      const doctor = appointment.doctorId;
      const key = String(doctor?._id || 'unknown');
      const current = doctorLoad.get(key) || { name: doctor?.name || 'Unassigned doctor', department: doctor?.department, count: 0 };
      current.count += 1;
      doctorLoad.set(key, current);
    }

    const busiestDoctors = [...doctorLoad.values()].sort((a, b) => b.count - a.count).slice(0, 3);
    const pipelineCounts = Object.fromEntries(pipeline.map((entry) => [entry._id, entry.count]));
    const actionItems = [
      pendingDocuments > 0 && { tone: 'amber', title: `${pendingDocuments} document${pendingDocuments === 1 ? '' : 's'} awaiting review`, detail: 'OCR extractions need a staff decision before they enter the patient record.', href: '/referrals' },
      pendingConfirmations > 0 && { tone: 'amber', title: `${pendingConfirmations} appointment request${pendingConfirmations === 1 ? '' : 's'} awaiting approval`, detail: 'WhatsApp booking or reschedule requests are waiting for staff action.', href: '/confirmations' },
      openHandoffs > 0 && { tone: 'brick', title: `${openHandoffs} conversation handoff${openHandoffs === 1 ? '' : 's'} open`, detail: 'A patient requested a person or asked a clinical question that requires human follow-up.', href: '/handoff' },
      followUps > 0 && { tone: 'amber', title: `${followUps} follow-up${followUps === 1 ? '' : 's'} overdue`, detail: 'These patients have remained in Follow-up for more than seven days.', href: '/pipeline' },
    ].filter(Boolean);

    res.json({
      generatedAt: now,
      metrics: { pendingDocuments, pendingConfirmations, openHandoffs, todayAppointments: todayAppointments.length, overdueFollowUps: followUps },
      actionItems,
      todayAppointments: todayAppointments.map((appointment) => ({
        id: String(appointment._id),
        datetime: appointment.datetime,
        patientName: appointment.patientId?.name || 'Unnamed patient',
        doctorName: appointment.doctorId?.name || 'Unknown doctor',
        department: appointment.doctorId?.department,
      })),
      busiestDoctors,
      pipelineCounts,
      weekEnd,
    });
  } catch (err) {
    console.error('getOpsBrief error:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getOpsBrief };
