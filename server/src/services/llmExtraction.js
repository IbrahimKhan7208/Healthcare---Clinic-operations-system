const { z } = require('zod');
const { ChatGroq } = require('@langchain/groq');

const SCHEMAS = {
  referral: z.object({
    patientName: z.string().nullable(),
    ageOrDob: z.string().nullable(),
    referringDoctor: z.string().nullable(),
    referringHospital: z.string().nullable(),
    reasonForReferral: z.string().nullable(),
    date: z.string().nullable(),
  }),
  insurance_card: z.object({
    memberName: z.string().nullable(),
    insurer: z.string().nullable(),
    policyNumber: z.string().nullable(),
    validThru: z.string().nullable(),
    sumInsured: z.string().nullable(),
  }),
  lab_report: z.object({
    patientName: z.string().nullable(),
    collectedDate: z.string().nullable(),
    labName: z.string().nullable(),
    tests: z
      .array(
        z.object({
          name: z.string(),
          result: z.string().nullable(),
          unit: z.string().nullable(),
          referenceRange: z.string().nullable(),
        })
      )
      .default([]),
  }),
};

const FIELD_LIST = {
  referral: 'patientName, ageOrDob, referringDoctor, referringHospital, reasonForReferral, date',
  insurance_card: 'memberName, insurer, policyNumber, validThru, sumInsured',
  lab_report: 'patientName, collectedDate, labName, tests (array of {name, result, unit, referenceRange})',
};

function buildPrompt(type, ocrText) {
  return `You are extracting structured data from OCR text of an Indian healthcare document (type: ${type}).
The OCR text may contain errors, garbled characters, or misread digits — use context to infer the most
likely correct value where reasonable, but if a field is genuinely not present or unreadable, use null.

Extract exactly these fields: ${FIELD_LIST[type]}

Also return a "fieldConfidence" object with a 0-1 confidence score per field, reflecting how certain you
are the extracted value is correct given the OCR text quality — not just whether a value was found.

Respond with ONLY a JSON object of the shape:
{ "fields": { ...extracted fields... }, "fieldConfidence": { ...same keys, 0-1 numbers... } }

OCR TEXT:
"""
${ocrText}
"""`;
}

async function extractStructuredFields(type, ocrText) {
  const schema = SCHEMAS[type];
  if (!schema) throw new Error(`No extraction schema for document type: ${type}`);

  const llm = new ChatGroq({
    model: process.env.AGENT_MODEL || 'openai/gpt-oss-120b',
    temperature: 0,
    apiKey: process.env.GROQ_API_KEY,
  });

  const response = await llm.invoke([{ role: 'user', content: buildPrompt(type, ocrText) }]);
  const raw = typeof response.content === 'string' ? response.content : '';

  let parsed;
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
  } catch (err) {
    return { fields: {}, fieldConfidence: {}, valid: false, error: 'LLM did not return parseable JSON' };
  }

  const result = schema.safeParse(parsed.fields || {});
  return {
    fields: result.success ? result.data : parsed.fields || {},
    fieldConfidence: parsed.fieldConfidence || {},
    valid: result.success,
    error: result.success ? null : result.error.message,
  };
}

module.exports = { extractStructuredFields, SCHEMAS };