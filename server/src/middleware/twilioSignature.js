const twilio = require('twilio');

function verifyTwilioSignature(req, res, next) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const publicUrl = process.env.PUBLIC_WEBHOOK_URL;

  if (!authToken || !publicUrl) {
    console.warn('[whatsapp] TWILIO_AUTH_TOKEN or PUBLIC_WEBHOOK_URL not set — skipping signature verification. Fine for local dev, NOT for production.');
    return next();
  }

  const signature = req.headers['x-twilio-signature'];
  if (!signature) {
    return res.sendStatus(401);
  }

  // req.body must be the parsed x-www-form-urlencoded params — see express.urlencoded() in app.js.
  const isValid = twilio.validateRequest(authToken, signature, publicUrl, req.body);

  if (!isValid) {
    return res.sendStatus(401);
  }

  next();
}

module.exports = { verifyTwilioSignature };