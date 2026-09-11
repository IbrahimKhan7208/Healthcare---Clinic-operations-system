const Patient = require('../models/Patient');
const Document = require('../models/Document');
const { extractDocument } = require('./ocrService');
const { extractStructuredFields } = require('./llmExtraction');
const { emitEvent } = require('../events/eventBus');
const { EVENTS } = require('../events/eventTypes');

function overallConfidence(ocrConfidence, fieldConfidence) {
  const values = Object.values(fieldConfidence).filter((v) => typeof v === 'number');
  const avgField = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0.5;
  // OCR quality gates the ceiling — garbled OCR text should never yield a confident
  // auto-approve even if the LLM reports high per-field confidence on a bad guess.
  return Math.round(Math.min(ocrConfidence, ocrConfidence * 0.5 + avgField * 0.5) * 1000) / 1000;
}

function extractNameFromFields(type, fields) {
  return type === 'insurance_card' ? fields.memberName : fields.patientName;
}

async function matchPatientByName(name) {
  if (!name) return null;
  const escaped = name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return Patient.findOne({ name: new RegExp(`^${escaped}$`, 'i') });
}

async function processUploadedDocument({ patientId, type, rawFileRef, buffer, mimetype, filename }) {
  const { text: ocrText, ocrConfidence } = await extractDocument(buffer, mimetype, filename);
  const { fields, fieldConfidence, valid } = await extractStructuredFields(type, ocrText);

  let resolvedPatientId = patientId || null;
  if (!resolvedPatientId) {
    const matched = await matchPatientByName(extractNameFromFields(type, fields));
    if (matched) resolvedPatientId = matched._id;
  }

  const confidence = valid ? overallConfidence(ocrConfidence, fieldConfidence) : 0;
  // Extraction confidence describes the quality of what the OCR/LLM read;
  // it never proves that a selected patient is the document owner. Every
  // document therefore enters the human review queue, even at 100% OCR.
  const status = 'pending_review';

  const document = await Document.create({
    patientId: resolvedPatientId,
    type,
    rawFileRef,
    ocrResult: ocrText,
    extractedFields: fields,
    confidenceScores: { ...fieldConfidence, overall: confidence, ocr: ocrConfidence },
    status,
  });

  emitEvent(EVENTS.DOCUMENT_UPLOADED, {
    documentId: String(document._id),
    type,
    patientId: resolvedPatientId ? String(resolvedPatientId) : null,
  });

  return document;
}

module.exports = { processUploadedDocument };