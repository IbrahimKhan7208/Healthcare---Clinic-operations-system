const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    sender: { type: String, enum: ['patient', 'bot', 'staff'], required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const conversationLogSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    channel: { type: String, enum: ['whatsapp'], default: 'whatsapp' },
    messages: { type: [messageSchema], default: [] },
    escalated: { type: Boolean, default: false, index: true },
    escalationReason: { type: String, default: null },
    escalatedAt: { type: Date, default: null, index: true },
    claimedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'StaffUser', default: null },
    claimedAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null, index: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

module.exports = mongoose.model('ConversationLog', conversationLogSchema);
