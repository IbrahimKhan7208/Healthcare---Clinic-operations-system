require('dotenv').config();

const path = require('path');
const { loadAllDocuments } = require('./chunker');
const { embedDocuments } = require('./embeddings');
const { ensureIndexExists, getIndex } = require('./pineconeClient');

const DOCS_DIR = path.join(__dirname, 'documents');
const BATCH_SIZE = 20; // keep well under Cohere's per-request text-count limit

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function run() {
  console.log('[rag] Loading documents from', DOCS_DIR);
  const chunks = loadAllDocuments(DOCS_DIR);
  console.log(`[rag] Parsed ${chunks.length} chunks from the knowledge base.`);

  await ensureIndexExists();
  const index = getIndex();

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const embeddings = await embedDocuments(batch.map((c) => c.text));

    const records = batch.map((chunk, j) => ({
      id: `${chunk.docId}-${slugify(chunk.sectionTitle)}`,
      values: embeddings[j],
      metadata: {
        doc_id: chunk.docId,
        source_doc: chunk.sourceDoc,
        section_title: chunk.sectionTitle,
        text: chunk.text,
      },
    }));

    await index.upsert({ records });
    console.log(`[rag] Upserted ${records.length} chunks (${i + records.length}/${chunks.length})`);
  }

  console.log('[rag] Ingestion complete.');
}

run().catch((err) => {
  console.error('[rag] Ingestion failed:', err);
  process.exit(1);
});