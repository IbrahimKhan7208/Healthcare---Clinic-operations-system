import { apiRequest } from './client';

export function sendAgentChat(message) {
  return apiRequest('/api/staff/agent/chat', { method: 'POST', body: { message } });
}

export function getAgentSession() {
  return apiRequest('/api/staff/agent/session');
}

export function confirmAgentTool(tool, args, sessionEntryId) {
  return apiRequest('/api/staff/agent/confirm', { method: 'POST', body: { tool, args, sessionEntryId } });
}

export function rejectAgentTool(sessionEntryId, tool) {
  return apiRequest('/api/staff/agent/reject', { method: 'POST', body: { sessionEntryId, tool } });
}
