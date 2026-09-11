const { executeConfirmedTool } = require('../agent/graph');
const models = require('../models');
const { appendMessage } = require('../services/conversationService');
const { sendWhatsAppMessage } = require('../utils/whatsappClient');

function patientReply(status, tool, result) {
  if (status === 'rejected') return 'The clinic team was not able to approve your request at this time. Please reply here if you would like help choosing another time.';
  if (tool === 'createAppointment') return `Your appointment request has been approved for ${new Date(result.datetime).toLocaleString()}.`;
  if (tool === 'rescheduleAppointment') return `Your appointment has been moved to ${new Date(result.after).toLocaleString()}.`;
  if (tool === 'cancelAppointment') return 'Your appointment has been cancelled by the clinic team.';
  return 'Your request has been approved by the clinic team.';
}

async function notifyPatient(confirmation, status, result) {
  if (confirmation.callerType !== 'patient') return;
  const patient = await models.Patient.findById(confirmation.patientId).lean();
  if (!patient) return;
  const message = patientReply(status, confirmation.tool, result);
  await appendMessage(patient._id, 'bot', message, models);
  await sendWhatsAppMessage(patient.phone, message);
}

async function listPendingConfirmations(req, res) {
  try {
    const status = req.query.status || 'pending';
    const query = status === 'all' ? {} : { status };
    const confirmations = await models.PendingConfirmation.find(query)
      .populate('patientId', 'name patientCode phone')
      .populate('actedBy', 'name')
      .sort({ created_at: -1 })
      .lean();
    res.json({ confirmations });
  } catch (err) {
    console.error('listPendingConfirmations error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function actOnConfirmation(req, res, status) {
  try {
    const confirmation = await models.PendingConfirmation.findById(req.params.id);
    if (!confirmation) return res.status(404).json({ error: 'Confirmation request not found.' });
    if (confirmation.status !== 'pending') return res.status(409).json({ error: 'This request has already been actioned.' });

    let result = null;
    if (status === 'approved') {
      // Preserve the original WhatsApp caller scope and `createdVia` value;
      // staff is approving the request, not becoming the patient requester.
      const originalCaller = confirmation.callerType === 'patient'
        ? { type: 'patient', patientId: String(confirmation.patientId) }
        : req.caller;
      result = await executeConfirmedTool(originalCaller, models, confirmation.tool, confirmation.args);
    }

    confirmation.status = status;
    confirmation.actedBy = req.caller.staffId;
    confirmation.actedAt = new Date();
    confirmation.result = result;
    await confirmation.save();

    // The staff action has already committed. A Twilio delivery issue must not
    // turn a completed approval into an apparent failure for the dashboard.
    notifyPatient(confirmation, status, result).catch((err) => {
      console.error('confirmation patient notification failed:', err.message);
    });

    res.json({ confirmation, result });
  } catch (err) {
    console.error('actOnConfirmation error:', err);
    res.status(500).json({ error: err.message });
  }
}

const approveConfirmation = (req, res) => actOnConfirmation(req, res, 'approved');
const rejectConfirmation = (req, res) => actOnConfirmation(req, res, 'rejected');

module.exports = { listPendingConfirmations, approveConfirmation, rejectConfirmation };
