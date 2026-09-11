const mongoose = require('mongoose');

// A durable human-in-the-loop queue. Unlike an in-memory LangGraph state,
// this survives the WhatsApp webhook request and can be actioned by staff
// later from the dashboard.
const pendingConfirmationSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    tool: { type: String, required: true, index: true },
    args: { type: mongoose.Schema.Types.Mixed, required: true },
    context: { type: mongoose.Schema.Types.Mixed, default: {} },
    callerType: { type: String, enum: ['patient', 'staff'], required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    actedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'StaffUser', default: null },
    actedAt: { type: Date, default: null },
    result: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

pendingConfirmationSchema.index({ status: 1, created_at: -1 });

module.exports = mongoose.model('PendingConfirmation', pendingConfirmationSchema);
