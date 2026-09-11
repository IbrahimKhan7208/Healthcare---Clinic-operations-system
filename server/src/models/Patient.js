const mongoose = require('mongoose');

/**
 * Progressive profile lifecycle (spec §4):
 *   'prospect'  -> phone only, created on first unmatched WhatsApp contact
 *   'basic'     -> name + DOB collected (booking/document trigger)
 *   'complete'  -> insurance/medical document fields present
 */
const PROFILE_STAGES = ['prospect', 'basic', 'complete'];

const patientSchema = new mongoose.Schema(
  {
    patientCode: { type: String, unique: true, sparse: true, index: true }, // e.g. "PT-000001"
    phone: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    name: {
      type: String,
      default: null,
      trim: true,
    },
    dob: {
      type: Date,
      default: null,
    },
    profileCompletenessStage: {
      type: String,
      enum: PROFILE_STAGES,
      default: 'prospect',
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

patientSchema.statics.PROFILE_STAGES = PROFILE_STAGES;

module.exports = mongoose.model('Patient', patientSchema);