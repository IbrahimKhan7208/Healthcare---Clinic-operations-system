import { apiRequest } from './client';

export function listConfirmations(status = 'pending') {
  return apiRequest(`/api/staff/confirmations?status=${encodeURIComponent(status)}`);
}

export function approveConfirmation(id) {
  return apiRequest(`/api/staff/confirmations/${id}/approve`, { method: 'POST' });
}

export function rejectConfirmation(id) {
  return apiRequest(`/api/staff/confirmations/${id}/reject`, { method: 'POST' });
}
