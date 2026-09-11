const { getCohereClient } = require('./cohereClient');

const EMBED_MODEL = 'embed-english-v3.0';
const EMBED_DIMENSION = 1024; // must match the Pinecone index dimension

async function embedDocuments(texts) {
  const cohere = getCohereClient();
  const response = await cohere.embed({
    texts,
    model: EMBED_MODEL,
    inputType: 'search_document',
  });
  return response.embeddings;
}

async function embedQuery(text) {
  const cohere = getCohereClient();
  const response = await cohere.embed({
    texts: [text],
    model: EMBED_MODEL,
    inputType: 'search_query',
  });
  return response.embeddings[0];
}

module.exports = { embedDocuments, embedQuery, EMBED_MODEL, EMBED_DIMENSION };