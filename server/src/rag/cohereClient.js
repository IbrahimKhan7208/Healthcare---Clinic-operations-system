const { CohereClient } = require('cohere-ai');

let client = null;

function getCohereClient() {
  if (!client) {
    if (!process.env.COHERE_API_KEY) throw new Error('COHERE_API_KEY is not set');
    client = new CohereClient({ token: process.env.COHERE_API_KEY });
  }
  return client;
}

module.exports = { getCohereClient };