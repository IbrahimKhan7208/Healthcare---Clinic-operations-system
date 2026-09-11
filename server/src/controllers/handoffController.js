const models = require('../models');
const { appendMessage } = require('../services/conversationService');
const { sendWhatsAppMessage } = require('../utils/whatsappClient');

function openHandoffQuery() {
  return { escalated: true, resolvedAt: null };
}

async function listHandoffs(req, res) {
  try {
    const filter = req.query.status || 'open';
    const query = filter === 'all' ? { escalated: true } : openHandoffQuery();
    if (filter === 'unclaimed') query.claimedBy = null;
    if (filter === 'claimed') query.claimedBy = { $ne: null };
    if (filter === 'resolved') { query.escalated = true; query.resolvedAt = { $ne: null }; }

    const handoffs = await models.ConversationLog.find(query)
      .populate('patientId', 'name patientCode phone')
      .populate('claimedBy', 'name')
      .sort({ escalatedAt: -1, updated_at: -1 })
      .lean();
    res.json({ handoffs });
  } catch (err) {
    console.error('listHandoffs error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function claimHandoff(req, res) {
  try {
    const handoff = await models.ConversationLog.findOneAndUpdate(
      { _id: req.params.id, ...openHandoffQuery(), claimedBy: null },
      { $set: { claimedBy: req.caller.staffId, claimedAt: new Date() } },
      { new: true }
    ).populate('patientId', 'name patientCode phone').populate('claimedBy', 'name');
    if (!handoff) return res.status(409).json({ error: 'This handoff is already claimed or resolved.' });
    res.json({ handoff });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function replyToHandoff(req, res) {
  try {
    const { message } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'A reply message is required.' });
    const handoff = await models.ConversationLog.findOne({ _id: req.params.id, ...openHandoffQuery() }).populate('patientId', 'phone');
    if (!handoff) return res.status(404).json({ error: 'Open handoff not found.' });
    if (String(handoff.claimedBy) !== String(req.caller.staffId)) return res.status(403).json({ error: 'Claim this handoff before replying.' });

    await appendMessage(handoff.patientId._id, 'staff', message.trim(), models);
    await sendWhatsAppMessage(handoff.patientId.phone, message.trim());
    const updated = await models.ConversationLog.findById(handoff._id).populate('patientId', 'name patientCode phone').populate('claimedBy', 'name');
    res.json({ handoff: updated });
  } catch (err) {
    console.error('replyToHandoff error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function resolveHandoff(req, res) {
  try {
    const handoff = await models.ConversationLog.findOne({ _id: req.params.id, ...openHandoffQuery() });
    if (!handoff) return res.status(404).json({ error: 'Open handoff not found.' });
    if (String(handoff.claimedBy) !== String(req.caller.staffId)) return res.status(403).json({ error: 'Claim this handoff before resolving it.' });
    handoff.resolvedAt = new Date();
    await handoff.save();
    res.json({ handoff });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { listHandoffs, claimHandoff, replyToHandoff, resolveHandoff };
