export const TOOL_LABELS = {
  createAppointment: 'Create appointment',
  rescheduleAppointment: 'Reschedule appointment',
  cancelAppointment: 'Cancel appointment',
  createOrUpdatePatientProfile: 'Update patient profile',
  updateInsuranceStatus: 'Update insurance document status',
};

export function toolLabel(toolName) {
  return TOOL_LABELS[toolName] || toolName;
}

const ARG_LABELS = {
  appointmentId: 'Appointment',
  doctorId: 'Doctor',
  patientId: 'Patient',
  datetime: 'Date & time',
  newDatetime: 'New date & time',
  phone: 'Phone',
  name: 'Name',
  dob: 'Date of birth',
  documentId: 'Document',
  approve: 'Approve',
  correctedFields: 'Corrected fields',
};

export function argLabel(key) {
  return ARG_LABELS[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
}

export function formatArgValue(key, value) {
  if (value === null || value === undefined) return '—';
  if (key === 'newDatetime' || key === 'datetime') {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? String(value)
      : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
