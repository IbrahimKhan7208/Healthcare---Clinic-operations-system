const models = require('../models');
const { buildAgentGraph } = require('../agent/graph');
const { findOrCreateProspectByPhone } = require('../services/patientResolution');
const { getOrCreateConversation, appendMessage, escalateConversation, toAgentMessages } = require('../services/conversationService');
const { escalationReasonFor } = require('../services/escalationService');
const { sendWhatsAppMessage } = require('../utils/whatsappClient');
const { queuePatientConfirmations } = require('../services/pendingConfirmationService');
const { processUploadedDocument } = require('../services/documentPipelineService');
const path = require('path');
const fs = require('fs');

const DOCUMENT_UPLOAD_DIR = path.join(__dirname, '../../uploads/documents');
fs.mkdirSync(DOCUMENT_UPLOAD_DIR, { recursive: true });

function inferDocumentType(text = '') {
  const normalized = text.toLowerCase();
  if (normalized.includes('insurance') || normalized.includes('policy card')) return 'insurance_card';
  if (normalized.includes('lab') || normalized.includes('blood report') || normalized.includes('test report')) return 'lab_report';
  return 'referral';
}

function extensionForMimetype(mimetype = '') {
  if (mimetype === 'application/pdf') return 'pdf';
  if (mimetype.includes('png')) return 'png';
  if (mimetype.includes('webp')) return 'webp';
  return 'jpg';
}

async function downloadTwilioMedia(url) {
  const credentials = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
  const response = await fetch(url, { headers: { Authorization: `Basic ${credentials}` } });
  if (!response.ok) throw new Error(`Twilio media download failed (${response.status}).`);
  return Buffer.from(await response.arrayBuffer());
}

function extractReplyText(result) {
  const lastMessage = result.messages[result.messages.length - 1];
  const rawContent = typeof lastMessage.content === 'string' ? lastMessage.content.trim() : '';

  if (rawContent) return rawContent;

  return "Sorry, I couldn't process that — could you rephrase?";
}

function pendingReply(confirmations) {
  if (confirmations.some((confirmation) => confirmation.tool === 'createAppointment')) {
    return "Thanks — your appointment request has been sent to the clinic team for approval. We'll confirm it here once staff have reviewed it.";
  }
  if (confirmations.some((confirmation) => confirmation.tool === 'rescheduleAppointment')) {
    return "Thanks — your reschedule request has been sent to the clinic team for approval. We'll confirm it here once staff have reviewed it.";
  }
  if (confirmations.some((confirmation) => confirmation.tool === 'cancelAppointment')) {
    return "Thanks — your cancellation request has been sent to the clinic team for approval. We'll confirm it here once staff have reviewed it.";
  }
  return "Thanks — your request has been sent to the clinic team for approval.";
}

function receiveMessage(req, res) {
  // Twilio expects a TwiML response to the webhook POST itself. We reply empty
  // and send the real answer asynchronously via the REST API below, same
  // fire-and-continue pattern as the Meta version.
  res.type('text/xml').send('<Response></Response>');
  processIncoming(req.body).catch((err) => {
    console.error('[whatsapp] receiveMessage processing error:', err);
  });
}

async function processIncoming(body) {
  const from = body.From; // e.g. "whatsapp:+919876543210"
  const numMedia = parseInt(body.NumMedia || '0', 10);
  const text = body.Body;

  if (!from) return;

  if (numMedia > 0) {
    const patient = await findOrCreateProspectByPhone(from, models);
    const mediaUrl = body.MediaUrl0;
    const mimetype = body.MediaContentType0 || 'image/jpeg';
    if (!mediaUrl) {
      await sendWhatsAppMessage(from, 'I could not access that attachment. Please try sending the document again.');
      return;
    }

    const type = inferDocumentType(text);
    const buffer = await downloadTwilioMedia(mediaUrl);
    const filename = `whatsapp-${Date.now()}.${extensionForMimetype(mimetype)}`;
    fs.writeFileSync(path.join(DOCUMENT_UPLOAD_DIR, filename), buffer);
    const document = await processUploadedDocument({
      patientId: String(patient._id),
      type,
      rawFileRef: `/uploads/documents/${filename}`,
      buffer,
      mimetype,
      filename,
    });

    const receivedText = document.status === 'pending_review'
      ? "I've received your document and sent it to the clinic team for review. We'll let you know once it has been checked."
      : "I've received and processed your document. The clinic team can now see it in your record.";
    await appendMessage(patient._id, 'patient', text || `[${type} document uploaded]`, models);
    await appendMessage(patient._id, 'bot', receivedText, models);
    await sendWhatsAppMessage(from, receivedText);
    return;
  }

  if (!text) return;

  const patient = await findOrCreateProspectByPhone(from, models);
  await appendMessage(patient._id, 'patient', text, models);

  const conversation = await getOrCreateConversation(patient._id, models);
  const escalationReason = escalationReasonFor(text);
  if (escalationReason) {
    await escalateConversation(patient._id, escalationReason, models);
    const replyText = "I've sent your message to the clinic team so a person can help. They'll reply here as soon as possible.";
    await appendMessage(patient._id, 'bot', replyText, models);
    await sendWhatsAppMessage(from, replyText);
    return;
  }

  if (conversation.escalated && !conversation.resolvedAt) {
    const replyText = "Your message has been added to the clinic team's handoff. They'll reply here as soon as possible.";
    await appendMessage(patient._id, 'bot', replyText, models);
    await sendWhatsAppMessage(from, replyText);
    return;
  }

  const caller = { type: 'patient', patientId: String(patient._id) };

  const { compiled } = buildAgentGraph(caller, models);
  const result = await compiled.invoke({ messages: toAgentMessages(conversation) });

  const pendingConfirmations = result.pendingConfirmations || [];
  if (pendingConfirmations.length > 0) {
    await queuePatientConfirmations(patient, pendingConfirmations, models);
  }

  const replyText = pendingConfirmations.length > 0 ? pendingReply(pendingConfirmations) : extractReplyText(result);
  if (replyText === "Sorry, I couldn't process that — could you rephrase?") {
    await escalateConversation(patient._id, 'Assistant could not confidently process the patient request.', models);
  }
  await appendMessage(patient._id, 'bot', replyText, models);
  await sendWhatsAppMessage(from, replyText);
}

module.exports = { receiveMessage };
