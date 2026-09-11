// server/scripts/start-tunnel.js
require('dotenv').config();
const ngrok = require('@ngrok/ngrok');

(async () => {
  const listener = await ngrok.forward({
    addr: 5000,
    authtoken: process.env.NGROK_AUTHTOKEN,
  });
  console.log(`Ingress established at: ${listener.url()}`);
})();