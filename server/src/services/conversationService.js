async function getOrCreateConversation(patientId, { ConversationLog }) {
  let conversation = await ConversationLog.findOne({ patientId, channel: 'whatsapp' });
  if (!conversation) {
    conversation = await ConversationLog.create({ patientId, channel: 'whatsapp', messages: [] });
  }
  return conversation;
}

async function appendMessage(patientId, sender, text, { ConversationLog }) {
  const conversation = await getOrCreateConversation(patientId, { ConversationLog });
  conversation.messages.push({ sender, text, timestamp: new Date() });
  await conversation.save();
  return conversation;
}

async function escalateConversation(patientId, reason, { ConversationLog }) {
  const conversation = await getOrCreateConversation(patientId, { ConversationLog });
  if (!conversation.escalated || conversation.resolvedAt) {
    conversation.escalated = true;
    conversation.escalationReason = reason;
    conversation.escalatedAt = new Date();
    conversation.resolvedAt = null;
    conversation.claimedBy = null;
    conversation.claimedAt = null;
    await conversation.save();
  }
  return conversation;
}

function toAgentMessages(conversation) {
  return conversation.messages
    .filter((m) => m.sender === 'patient' || m.sender === 'bot')
    .map((m) => ({ role: m.sender === 'patient' ? 'user' : 'assistant', content: m.text }));
}

module.exports = { getOrCreateConversation, appendMessage, escalateConversation, toAgentMessages };
