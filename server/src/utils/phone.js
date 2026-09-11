function normalizePhone(raw) {
  if (!raw) return raw;
  const withoutWhatsappPrefix = String(raw).replace(/^whatsapp:/i, '');
  const digitsOnly = withoutWhatsappPrefix.replace(/[^\d]/g, '');
  return `+${digitsOnly}`;
}

module.exports = { normalizePhone };