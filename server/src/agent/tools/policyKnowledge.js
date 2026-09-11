const { z } = require('zod');
const { tool } = require('@langchain/core/tools');
const { retrieveRelevantChunks } = require('../../rag/retrieval');

/**
 * Read-only, touches Pinecone/Cohere only — never the clinic DB, so it's
 * identical for staff and patient callers and needs no permission scoping.
 */
function buildPolicyKnowledgeTools() {
  const searchClinicPolicy = tool(
    async ({ query }) => {
      const chunks = await retrieveRelevantChunks(query);

      if (chunks.length === 0) {
        return JSON.stringify({ results: [], note: 'No relevant policy information found for this question.' });
      }

      return JSON.stringify({
        results: chunks.map((c) => ({
          sourceDoc: c.sourceDoc,
          sectionTitle: c.sectionTitle,
          text: c.text,
        })),
      });
    },
    {
      name: 'searchClinicPolicy',
      description:
        "Search the clinic's policy and FAQ knowledge base — hours, locations, cancellation/rescheduling " +
        'policy, insurance, billing, new-patient guidance, and general FAQs. Use this for any question about ' +
        'clinic policy or general information. Do NOT use this for doctor availability (use findDoctors ' +
        'instead) or specific appointment/patient data (use getAppointments instead) — those come from the ' +
        'live system, not this knowledge base. Always cite the sourceDoc naturally in your answer (e.g. ' +
        '"per our Cancellation Policy...").',
      schema: z.object({
        query: z.string().describe('The question or topic to search the knowledge base for.'),
      }),
    }
  );

  return [{ toolInstance: searchClinicPolicy, mutating: false }];
}

module.exports = { buildPolicyKnowledgeTools };