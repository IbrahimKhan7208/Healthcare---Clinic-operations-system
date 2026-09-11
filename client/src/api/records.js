import { apiRequest } from './client';

export const listDoctors = () => apiRequest('/api/staff/doctors');
export const getDoctor = (id) => apiRequest(`/api/staff/doctors/${id}`);
export const createDoctor = (body) => apiRequest('/api/staff/doctors', { method: 'POST', body });

export const listPatients = () => apiRequest('/api/staff/patients');
export const getPatient = (id) => apiRequest(`/api/staff/patients/${id}`);
export const createPatient = (body) => apiRequest('/api/staff/patients', { method: 'POST', body });

export const listAppointments = () => apiRequest('/api/staff/appointments');
export const getAppointment = (id) => apiRequest(`/api/staff/appointments/${id}`);
export const createAppointment = (body) => apiRequest('/api/staff/appointments', { method: 'POST', body });
export const cancelAppointment = (id) => apiRequest(`/api/staff/appointments/${id}/cancel`, { method: 'PATCH' });

export const listPipeline = () => apiRequest('/api/staff/pipeline');
