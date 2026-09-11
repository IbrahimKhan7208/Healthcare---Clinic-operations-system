const mongoose = require('mongoose');

const consentRecordSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    consentType: {
      type: String,
      enum: ['data_processing', 'whatsapp_communication', 'document_storage'],
      required: true,
    },
    grantedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

module.exports = mongoose.model('ConsentRecord', consentRecordSchema);