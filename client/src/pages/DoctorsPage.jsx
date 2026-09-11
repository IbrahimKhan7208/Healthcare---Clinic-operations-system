import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createDoctor, getDoctor, listDoctors } from '../api/records';
import { Button } from '../components/common/Button';
import { CreateForm, DetailPanel, DetailRow, Field, ManagementWorkspace, PageHeader, RecordTable } from '../components/common/ManagementView';
import { useAuth } from '../context/AuthContext';
import styles from './Page.module.css';

export function DoctorsPage() {
  const { staff } = useAuth();
  const [doctors, setDoctors] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function loadDoctors() {
    setLoading(true);
    try { setDoctors((await listDoctors()).doctors); } catch (err) { setError(err.message); } finally { setLoading(false); }
  }
  useEffect(() => { loadDoctors(); }, []);

  async function selectDoctor(id) {
    try { setSelected((await getDoctor(id)).doctor); } catch (err) { setError(err.message); }
  }
  async function handleCreate(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubmitting(true); setError('');
    try {
      const { doctor } = await createDoctor({ name: form.get('name'), department: form.get('department') });
      setDoctors((items) => [...items, doctor].sort((a, b) => a.name.localeCompare(b.name)));
      setSelected(doctor); setShowCreate(false);
    } catch (err) { setError(err.message); } finally { setSubmitting(false); }
  }

  return (
    <div className={styles.container}>
      <PageHeader eyebrow="Clinical directory" title="Doctors" description="Manage the clinic's doctor directory and review scheduled availability."
        action={staff?.role === 'admin' ? <Button onClick={() => { setShowCreate(true); setSelected(null); }}><Plus size={16} /> Add doctor</Button> : null} />
      {error && <p className={styles.pageError}>{error}</p>}
      <ManagementWorkspace>
        <RecordTable columns={['Doctor', 'Department', 'Availability', '']} emptyText="No doctors have been added yet." loading={loading} isEmpty={!doctors.length}>
          {doctors.map((doctor) => <tr key={doctor._id}>
            <td><div className={styles.primaryText}>{doctor.name}</div><div className={`${styles.muted} mono`}>{doctor.doctorCode}</div></td>
            <td>{doctor.department}</td>
            <td className={styles.muted}>{doctor.availability?.length ? `${doctor.availability.length} weekly slot${doctor.availability.length > 1 ? 's' : ''}` : 'Not set'}</td>
            <td><Button variant="ghost" className={styles.tableAction} onClick={() => selectDoctor(doctor._id)}>View</Button></td>
          </tr>)}
        </RecordTable>
        {showCreate && <CreateForm title="Add doctor" description="A directory code is generated automatically." onClose={() => setShowCreate(false)} onSubmit={handleCreate} submitting={submitting} error={error}>
          <Field label="Full name"><input name="name" required placeholder="Dr. Aisha Patel" /></Field>
          <Field label="Department"><input name="department" required placeholder="Cardiology" /></Field>
        </CreateForm>}
        {!showCreate && selected && <DetailPanel title="Doctor details" onClose={() => setSelected(null)}>
          <DetailRow label="Name" value={selected.name} /><DetailRow label="Department" value={selected.department} /><DetailRow label="Directory code" value={selected.doctorCode} mono />
          <DetailRow label="Weekly availability" value={selected.availability?.length ? selected.availability.map((slot) => `${slot.dayOfWeek} ${slot.startTime}–${slot.endTime}`).join(', ') : 'Not set'} />
        </DetailPanel>}
      </ManagementWorkspace>
    </div>
  );
}
