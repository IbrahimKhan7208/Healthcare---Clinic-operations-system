import { apiRequest } from './client';

export const getOpsBrief = () => apiRequest('/api/staff/ops-brief');
export const listHandoffs = (status = 'open') => apiRequest(`/api/staff/handoffs?status=${encodeURIComponent(status)}`);
export const claimHandoff = (id) => apiRequest(`/api/staff/handoffs/${id}/claim`, { method: 'POST' });
export const replyToHandoff = (id, message) => apiRequest(`/api/staff/handoffs/${id}/reply`, { method: 'POST', body: { message } });
export const resolveHandoff = (id) => apiRequest(`/api/staff/handoffs/${id}/resolve`, { method: 'POST' });
