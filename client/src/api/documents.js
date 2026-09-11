import { API_BASE_URL, apiRequest, getToken } from './client';

export const listDocuments = (params = {}) => {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value));
  return apiRequest(`/api/staff/documents${query.size ? `?${query}` : ''}`);
};
export const getDocument = (id) => apiRequest(`/api/staff/documents/${id}`);
export const reviewDocument = (id, body) => apiRequest(`/api/staff/documents/${id}/review`, { method: 'PATCH', body });

export async function uploadDocument({ file, type, patientId }) {
  const form = new FormData();
  form.append('file', file);
  form.append('type', type);
  if (patientId) form.append('patientId', patientId);
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_BASE_URL}/api/staff/documents`, { method: 'POST', headers, body: form });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Upload failed (${response.status})`);
  return data;
}
