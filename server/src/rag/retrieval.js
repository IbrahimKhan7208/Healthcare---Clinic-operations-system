const { embedQuery } = require('./embeddings');
const { rerankChunks } = require('./rerank');
const { getIndex } = require('./pineconeClient');

const TOP_K = 6;
const TOP_N = 3;

async function retrieveRelevantChunks(query) {
  const queryVector = await embedQuery(query);
  const index = getIndex();

  const searchResult = await index.query({
    vector: queryVector,
    topK: TOP_K,
    includeMetadata: true,
  });

  const candidates = (searchResult.matches || []).map((match) => ({
    text: match.metadata.text,
    sourceDoc: match.metadata.source_doc,
    sectionTitle: match.metadata.section_title,
    docId: match.metadata.doc_id,
    vectorScore: match.score,
  }));

  if (candidates.length === 0) return [];

  return rerankChunks(query, candidates, TOP_N);
}

module.exports = { retrieveRelevantChunks };