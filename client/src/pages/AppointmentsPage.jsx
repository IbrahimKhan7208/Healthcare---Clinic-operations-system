import { Ban, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cancelAppointment, createAppointment, getAppointment, listAppointments, listDoctors, listPatients } from '../api/records';
import { Button } from '../components/common/Button';
import { CreateForm, DetailPanel, DetailRow, Field, ManagementWorkspace, PageHeader, RecordTable, StatusPill } from '../components/common/ManagementView';
import styles from './Page.module.css';

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';
}

export function AppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const [appointmentResult, patientResult, doctorResult] = await Promise.all([listAppointments(), listPatients(), listDoctors()]);
      setAppointments(appointmentResult.appointments);
      setPatients(patientResult.patients);
      setDoctors(doctorResult.doctors);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }
  useEffect(() => { loadData(); }, []);

  async function selectAppointment(id) { try { setSelected((await getAppointment(id)).appointment); } catch (err) { setError(err.message); } }
  async function handleCreate(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubmitting(true); setError('');
    try {
      const { appointment } = await createAppointment({
        patientId: form.get('patientId'), doctorId: form.get('doctorId'), datetime: new Date(form.get('datetime')).toISOString(), createdVia: 'staff',
      });
      await loadData();
      setSelected((await getAppointment(appointment._id)).appointment); setShowCreate(false);
    } catch (err) { setError(err.message); } finally { setSubmitting(false); }
  }

  async function handleCancel() {
    if (!selected || selected.status !== 'scheduled') return;
    if (!window.confirm('Cancel this appointment? This action cannot be undone.')) return;

    setCancelling(true); setError('');
    try {
      const { appointment } = await cancelAppointment(selected._id);
      setAppointments((items) => items.map((item) => (item._id === appointment._id ? appointment : item)));
      setSelected(appointment);
    } catch (err) { setError(err.message); } finally { setCancelling(false); }
  }

  return (
    <div className={styles.container}>
      <PageHeader eyebrow="Scheduling" title="Appointments" description="Review the upcoming clinic schedule and create appointments for registered patients."
        action={<Button onClick={() => { setShowCreate(true); setSelected(null); }}><Plus size={16} /> New appointment</Button>} />
      {error && <p className={styles.pageError}>{error}</p>}
      <ManagementWorkspace>
        <RecordTable columns={['When', 'Patient', 'Doctor', 'Status', '']} emptyText="No appointments are scheduled." loading={loading} isEmpty={!appointments.length}>
          {appointments.map((appointment) => <tr key={appointment._id}>
            <td><div className={styles.primaryText}>{formatDateTime(appointment.datetime)}</div><div className={`${styles.muted} mono`}>{appointment._id}</div></td>
            <td>{appointment.patientId?.name || 'Unnamed patient'}<div className={styles.muted}>{appointment.patientId?.phone}</div></td>
            <td>{appointment.doctorId?.name || 'Unknown doctor'}<div className={styles.muted}>{appointment.doctorId?.department}</div></td>
            <td><StatusPill tone={appointment.status}>{appointment.status}</StatusPill></td>
            <td><Button variant="ghost" className={styles.tableAction} onClick={() => selectAppointment(appointment._id)}>View</Button></td>
          </tr>)}
        </RecordTable>
        {showCreate && <CreateForm title="New appointment" description="An appointment is checked against the doctor's existing schedule before it is saved." onClose={() => setShowCreate(false)} onSubmit={handleCreate} submitting={submitting} error={error}>
          <Field label="Patient"><select name="patientId" required defaultValue=""><option value="" disabled>Select a patient</option>{patients.map((patient) => <option key={patient._id} value={patient._id}>{patient.name || 'Unnamed patient'} · {patient.patientCode}</option>)}</select></Field>
          <Field label="Doctor"><select name="doctorId" required defaultValue=""><option value="" disabled>Select a doctor</option>{doctors.map((doctor) => <option key={doctor._id} value={doctor._id}>{doctor.name} · {doctor.department}</option>)}</select></Field>
          <Field label="Date and time"><input name="datetime" type="datetime-local" required /></Field>
        </CreateForm>}
        {!showCreate && selected && <DetailPanel title="Appointment details" onClose={() => setSelected(null)}>
          <DetailRow label="Scheduled for" value={formatDateTime(selected.datetime)} /><DetailRow label="Patient" value={selected.patientId?.name || 'Unnamed patient'} /><DetailRow label="Patient phone" value={selected.patientId?.phone} /><DetailRow label="Doctor" value={selected.doctorId?.name} /><DetailRow label="Department" value={selected.doctorId?.department} /><DetailRow label="Status" value={selected.status} /><DetailRow label="Created via" value={selected.createdVia} /><DetailRow label="Appointment ID" value={selected._id} mono />
          {selected.status === 'scheduled' && <div className={styles.detailActions}><Button variant="danger" onClick={handleCancel} disabled={cancelling}><Ban size={16} />{cancelling ? 'Cancelling…' : 'Cancel appointment'}</Button></div>}
        </DetailPanel>}
      </ManagementWorkspace>
    </div>
  );
}
