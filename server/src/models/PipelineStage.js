const mongoose = require('mongoose');

const STAGES = ['New Referral', 'Intake Pending', 'Scheduled', 'Seen', 'Follow-up', 'Discharged'];

const stageHistoryEntrySchema = new mongoose.Schema(
  {
    stage: { type: String, enum: STAGES, required: true },
    enteredAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const pipelineStageSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, unique: true, index: true },
    currentStage: { type: String, enum: STAGES, default: 'New Referral' },
    history: { type: [stageHistoryEntrySchema], default: () => [{ stage: 'New Referral' }] },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

pipelineStageSchema.statics.STAGES = STAGES;

module.exports = mongoose.model('PipelineStage', pipelineStageSchema);