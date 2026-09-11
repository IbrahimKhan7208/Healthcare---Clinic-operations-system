const { z } = require('zod');
const { tool } = require('@langchain/core/tools');
const { assertStaff } = require('../permissions');

function buildReferralTools(caller, { Document }) {
  // Staff-only end to end: don't even offer these tools to a patient caller,
  // rather than relying solely on the runtime assertStaff() check inside them.
  if (caller.type !== 'staff') return [];

  const getPendingReferrals = tool(
    async ({ type }) => {
      assertStaff(caller); // review queue is staff-only, no patient-facing equivalent

      const query = { status: 'pending_review' };
      if (type) query.type = type;

      const results = await Document.find(query)
        .populate('patientId', 'name phone')
        .sort({ created_at: 1 })
        .lean();

      return JSON.stringify(results);
    },
    {
      name: 'getPendingReferrals',
      description: 'List documents awaiting staff review (status = pending_review). Staff-only.',
      schema: z.object({
        type: z.enum(['referral', 'insurance_card', 'lab_report']).optional(),
      }),
    }
  );

  const updateInsuranceStatus = tool(
    async ({ documentId, approve, correctedFields }) => {
      assertStaff(caller);

      const document = await Document.findById(documentId);
      if (!document) throw new Error(`Document ${documentId} not found`);
      if (document.type !== 'insurance_card') {
        throw new Error(`Document ${documentId} is not an insurance_card (found: ${document.type})`);
      }

      if (correctedFields) {
        document.extractedFields = { ...document.extractedFields, ...correctedFields };
      }
      document.status = approve ? 'approved' : 'rejected';

      await document.save();

      return JSON.stringify({ documentId, status: document.status, extractedFields: document.extractedFields });
    },
    {
      name: 'updateInsuranceStatus',
      description:
        'Approve or reject an insurance_card document after review, optionally correcting low-confidence ' +
        'extracted fields first. This is a WRITE — requires confirmation. Staff-only.',
      schema: z.object({
        documentId: z.string(),
        approve: z.boolean(),
        correctedFields: z.record(z.string(), z.any()).optional(),
      }),
    }
  );

  return [
    { toolInstance: getPendingReferrals, mutating: false },
    { toolInstance: updateInsuranceStatus, mutating: true },
  ];
}

module.exports = { buildReferralTools };