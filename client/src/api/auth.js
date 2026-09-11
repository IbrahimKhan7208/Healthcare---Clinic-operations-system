import { apiRequest } from './client';

export function bootstrapAdmin(payload) {
  return apiRequest('/api/staff/auth/bootstrap-admin', { method: 'POST', body: payload, skipAuth: true });
}

export function login(payload) {
  return apiRequest('/api/staff/auth/login', { method: 'POST', body: payload, skipAuth: true });
}

export function registerStaff(payload) {
  return apiRequest('/api/staff/auth/register', { method: 'POST', body: payload });
}
