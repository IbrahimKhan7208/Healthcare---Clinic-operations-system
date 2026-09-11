const mongoose = require('mongoose');

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const availabilitySlotSchema = new mongoose.Schema(
  {
    dayOfWeek: { type: String, enum: DAY_NAMES, required: true }, // e.g. "Monday"
    startTime: { type: String, required: true }, // "09:00"
    endTime: { type: String, required: true }, // "17:00"
  },
  { _id: false }
);

const doctorSchema = new mongoose.Schema(
  {
    doctorCode: { type: String, unique: true, sparse: true, index: true }, // e.g. "DR-000001"
    name: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    availability: { type: [availabilitySlotSchema], default: [] },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

doctorSchema.statics.DAY_NAMES = DAY_NAMES;

module.exports = mongoose.model('Doctor', doctorSchema);