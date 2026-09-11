const { Pinecone } = require('@pinecone-database/pinecone');
const { EMBED_DIMENSION } = require('./embeddings');

const INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'clinic-rag';

let client = null;

function getPineconeClient() {
  if (!client) {
    if (!process.env.PINECONE_API_KEY) throw new Error('PINECONE_API_KEY is not set');
    client = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  }
  return client;
}

/**
 * Creates the index if it doesn't exist yet, using the classic
 * dimension+metric+serverless-spec shape (still supported in SDK v9, though
 * marked legacy in favor of the newer schema-based index API — chosen here
 * for simplicity; a real migration to schema-based indexes would be an
 * isolated future change, not something this pipeline depends on).
 * waitUntilReady blocks until the index is actually queryable, so callers
 * never need to poll separately.
 */
async function ensureIndexExists() {
  const pc = getPineconeClient();
  const existing = await pc.indexes.list();
  const alreadyExists = existing.indexes?.some((idx) => idx.name === INDEX_NAME);
  if (alreadyExists) return;

  console.log(`[rag] Creating Pinecone index "${INDEX_NAME}" (dimension ${EMBED_DIMENSION})...`);
  await pc.indexes.create({
    name: INDEX_NAME,
    dimension: EMBED_DIMENSION,
    metric: 'cosine',
    spec: {
      serverless: {
        cloud: process.env.PINECONE_CLOUD || 'aws',
        region: process.env.PINECONE_REGION || 'us-east-1',
      },
    },
    waitUntilReady: true,
  });
  console.log(`[rag] Index "${INDEX_NAME}" is ready.`);
}

function getIndex() {
  return getPineconeClient().index({ name: INDEX_NAME });
}

module.exports = { getPineconeClient, ensureIndexExists, getIndex, INDEX_NAME };