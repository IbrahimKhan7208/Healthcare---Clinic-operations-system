const mongoose = require('mongoose');

// Staff-agent conversations are keyed to the JWT login session rather than a
// staff account. This keeps a thread through a browser refresh, while each
// subsequent login naturally starts with an empty conversation.
const agentMessageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const agentSessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'StaffUser', required: true, index: true },
    messages: { type: [agentMessageSchema], default: [] },
    // The renderable audit trail. Unlike messages, this preserves rich UI
    // items such as confirmation cards and their approval state.
    timeline: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

module.exports = mongoose.model('AgentSession', agentSessionSchema);
