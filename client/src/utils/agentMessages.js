function getMessageType(message) {
  return message?.id?.[message.id.length - 1] || null;
}

function getMessageContent(message) {
  return message?.kwargs?.content ?? '';
}

function isHumanMessage(message) {
  return getMessageType(message) === 'HumanMessage' || message?.role === 'user' || message?.type === 'human';
}

/**
 * Finds the text the assistant actually wants to show the person. When the
 * model's last turn was purely a tool call (proposing a write), its own
 * message content is empty — real text only shows up once the graph loops
 * back after a read, or never, if it halted on a pending write.
 */
export function extractDisplayText(resultMessages, pendingConfirmations) {
  for (let i = resultMessages.length - 1; i >= 0; i -= 1) {
    const message = resultMessages[i];
    // The response contains the history supplied to this request too. Never
    // cross the current user's message, or an empty tool-call turn can show a
    // stale assistant answer from a previous turn.
    if (isHumanMessage(message)) break;
    if (getMessageType(message) === 'AIMessage') {
      const content = getMessageContent(message);
      if (content && content.trim()) return content.trim();
    }
  }

  if (pendingConfirmations && pendingConfirmations.length > 0) {
    return "Here's what I'd like to do — take a look below.";
  }

  return null;
}

export { getMessageType, getMessageContent };
