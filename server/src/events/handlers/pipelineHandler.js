const { PipelineStage } = require('../../models');
const { bus } = require('../eventBus');
const { EVENTS } = require('../eventTypes');

async function ensurePipelineStage(patientId) {
  let stage = await PipelineStage.findOne({ patientId });
  if (!stage) {
    stage = await PipelineStage.create({ patientId });
  }
  return stage;
}

async function advanceStage(patientId, targetStage) {
  const stage = await ensurePipelineStage(patientId);
  const order = PipelineStage.STAGES;
  const currentIndex = order.indexOf(stage.currentStage);
  const targetIndex = order.indexOf(targetStage);

  if (targetIndex > currentIndex) {
    stage.currentStage = targetStage;
    stage.history.push({ stage: targetStage });
    await stage.save();
  }
  return stage;
}

function register() {
  bus.on(EVENTS.PATIENT_PROFILE_UPDATED, async ({ patientId }) => {
    try {
      await ensurePipelineStage(patientId);
    } catch (err) {
      console.error('[pipelineHandler] patient.profileUpdated failed:', err.message);
    }
  });

  bus.on(EVENTS.APPOINTMENT_CREATED, async ({ patientId }) => {
    try {
      await advanceStage(patientId, 'Scheduled');
    } catch (err) {
      console.error('[pipelineHandler] appointment.created failed:', err.message);
    }
  });

  bus.on(EVENTS.REFERRAL_RECEIVED, async ({ patientId }) => {
    try {
      await advanceStage(patientId, 'Intake Pending');
    } catch (err) {
      console.error('[pipelineHandler] referral.received failed:', err.message);
    }
  });

  // Intake itself does not change progression: only staff approval of a
  // referral advances to Intake Pending. It does ensure a patient already
  // linked to an uploaded document always has a pipeline record to display.
  bus.on(EVENTS.DOCUMENT_UPLOADED, async ({ patientId }) => {
    if (!patientId) return;
    try {
      await ensurePipelineStage(patientId);
    } catch (err) {
      console.error('[pipelineHandler] document.uploaded failed:', err.message);
    }
  });
}

module.exports = { register, ensurePipelineStage, advanceStage };
