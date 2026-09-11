const CLINICAL_PATTERN = /\b(symptom|symptoms|diagnos(?:e|is)|treatment|medicine|medication|dose|dosage|prescription|pain|fever|rash|infection|blood pressure|blood sugar|test result|lab result|side effect)\b/i;
const HUMAN_PATTERN = /\b(?:hand\s+(?:me\s+)?off|handoff|real\s+(?:staff|person|human)|clinic\s+staff|staff\s+member|human\s+help|real\s+person|call\s+me|(?:talk|speak|connect|transfer|forward)\s+(?:me\s+)?to\s+(?:a\s+|the\s+)?(?:human|person|staff|agent|representative|doctor))\b/i;

function escalationReasonFor(text = '') {
  if (CLINICAL_PATTERN.test(text)) return 'Clinical question requires a clinician or clinic staff member.';
  if (HUMAN_PATTERN.test(text)) return 'Patient explicitly requested a human handoff.';
  return null;
}

module.exports = { escalationReasonFor };
