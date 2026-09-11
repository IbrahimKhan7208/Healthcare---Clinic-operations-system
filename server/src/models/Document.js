const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', default: null, index: true },
    type: {
      type: String,
      enum: ['referral', 'insurance_card', 'lab_report'],
      required: true,
    },
    rawFileRef: { type: String, required: true }, // storage path/URL
    ocrResult: { type: String, default: null }, // raw OCR text
    extractedFields: { type: mongoose.Schema.Types.Mixed, default: {} }, // structured extraction
    confidenceScores: { type: mongoose.Schema.Types.Mixed, default: {} }, // per-field confidence
    status: {
      type: String,
      enum: ['pending_review', 'approved', 'rejected'],
      default: 'pending_review',
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'StaffUser', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

module.exports = mongoose.model('Document', documentSchema);