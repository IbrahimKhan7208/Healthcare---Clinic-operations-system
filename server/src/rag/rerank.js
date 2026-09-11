const { getCohereClient } = require('./cohereClient');

const RERANK_MODEL = 'rerank-english-v3.0';

async function rerankChunks(query, candidates, topN = 3) {
  if (candidates.length === 0) return [];

  const cohere = getCohereClient();
  const response = await cohere.rerank({
    query,
    documents: candidates.map((c) => c.text),
    model: RERANK_MODEL,
    topN: Math.min(topN, candidates.length),
  });

  return response.results.map((r) => ({
    ...candidates[r.index],
    relevanceScore: r.relevanceScore,
  }));
}

module.exports = { rerankChunks, RERANK_MODEL };