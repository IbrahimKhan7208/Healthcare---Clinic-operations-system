const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_WHATSAPP_FROM; // whatsapp:+14155238886 for THIS sandbox

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

async function sendWhatsAppMessage(to, body) {
  if (!client || !fromNumber) {
    console.error('[whatsapp] Missing TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_WHATSAPP_FROM — cannot send message.');
    return null;
  }
  const toAddress = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
  try {
    return await client.messages.create({ from: fromNumber, to: toAddress, body });
  } catch (err) {
    console.error('[whatsapp] send failed:', err.message);
    return null;
  }
}

module.exports = { sendWhatsAppMessage };