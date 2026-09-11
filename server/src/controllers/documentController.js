const path = require('path');
const fs = require('fs');
const { processUploadedDocument } = require('../services/documentPipelineService');
const { reviewDocument } = require('../services/documentReviewService');
const models = require('../models');

const UPLOAD_DIR = path.join(__dirname, '../../uploads/documents');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

async function uploadDocument(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'file is required (field name: file)' });
    const { type, patientId } = req.body;
    if (!['referral', 'insurance_card', 'lab_report'].includes(type)) {
      return res.status(400).json({ error: 'type must be referral, insurance_card, or lab_report' });
    }

    const storedName = `${Date.now()}-${req.file.originalname}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, storedName), req.file.buffer);

    const document = await processUploadedDocument({
      patientId: patientId || null,
      type,
      rawFileRef: `/uploads/documents/${storedName}`,
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      filename: req.file.originalname,
    });

    res.status(201).json(document);
  } catch (err) {
    console.error('[documents] upload failed:', err);
    res.status(500).json({ error: err.message });
  }
}

async function listDocuments(req, res) {
  try {
    const query = {};
    if (req.query.status) query.status = req.query.status;
    if (req.query.type) query.type = req.query.type;
    const documents = await models.Document.find(query)
      .populate('patientId', 'name patientCode phone')
      .populate('reviewedBy', 'name')
      .sort({ created_at: -1 })
      .lean();
    res.json({ documents });
  } catch (err) {
    console.error('[documents] list failed:', err);
    res.status(500).json({ error: err.message });
  }
}

async function getDocument(req, res) {
  try {
    const document = await models.Document.findById(req.params.id)
      .populate('patientId', 'name patientCode phone')
      .populate('reviewedBy', 'name')
      .lean();
    if (!document) return res.status(404).json({ error: 'Document not found.' });
    res.json({ document });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function reviewUploadedDocument(req, res) {
  try {
    const { approve, correctedFields, patientId } = req.body;
    if (typeof approve !== 'boolean') return res.status(400).json({ error: 'approve must be a boolean.' });
    const document = await models.Document.findById(req.params.id);
    if (!document) return res.status(404).json({ error: 'Document not found.' });
    if (document.status !== 'pending_review') return res.status(409).json({ error: 'This document has already been reviewed.' });

    const reviewed = await reviewDocument({ document, approve, correctedFields, patientId, staffId: req.caller.staffId, models });
    res.json({ document: reviewed });
  } catch (err) {
    console.error('[documents] review failed:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { uploadDocument, listDocuments, getDocument, reviewUploadedDocument, UPLOAD_DIR };
