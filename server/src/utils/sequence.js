const Counter = require('../models/Counter');

async function nextSequence(name) {
  const counter = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  return counter.seq;
}

function formatCode(prefix, seq) {
  return `${prefix}-${String(seq).padStart(6, '0')}`;
}

async function nextPatientCode() {
  return formatCode('PT', await nextSequence('patientCode'));
}

async function nextDoctorCode() {
  return formatCode('DR', await nextSequence('doctorCode'));
}

module.exports = { nextSequence, nextPatientCode, nextDoctorCode };