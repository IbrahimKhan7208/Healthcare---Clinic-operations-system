import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPatient, getPatient, listPatients } from '../api/records';
import { Button } from '../components/common/Button';
import { CreateForm, DetailPanel, DetailRow, Field, ManagementWorkspace, PageHeader, RecordTable, StatusPill } from '../components/common/ManagementView';
import styles from './Page.module.css';

function formatDate(value) { return value ? new Date(value).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—'; }

export function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  async function loadPatients() { setLoading(true); try { setPatients((await listPatients()).patients); } catch (err) { setError(err.message); } finally { setLoading(false); } }
  useEffect(() => { loadPatients(); }, []);
  async function selectPatient(id) { try { setSelected((await getPatient(id)).patient); } catch (err) { setError(err.message); } }
  async function handleCreate(event) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setSubmitting(true); setError('');
    try {
      const body = { phone: form.get('phone'), name: form.get('name') || undefined, dob: form.get('dob') || undefined };
      const { patient } = await createPatient(body);
      setPatients((items) => [patient, ...items]); setSelected(patient); setShowCreate(false);
    } catch (err) { setError(err.message); } finally { setSubmitting(false); }
  }
  return (
    <div className={styles.container}>
      <PageHeader eyebrow="Patient records" title="Patients" description="Find patient records, see profile completeness, and add new people to the clinic." action={<Button onClick={() => { setShowCreate(true); setSelected(null); }}><Plus size={16} /> Add patient</Button>} />
      {error && <p className={styles.pageError}>{error}</p>}
      <ManagementWorkspace>
        <RecordTable columns={['Patient', 'Phone', 'Profile', '']} emptyText="No patients have been added yet." loading={loading} isEmpty={!patients.length}>
          {patients.map((patient) => <tr key={patient._id}><td><div className={styles.primaryText}>{patient.name || 'Unnamed patient'}</div><div className={`${styles.muted} mono`}>{patient.patientCode}</div></td><td>{patient.phone}</td><td><StatusPill>{patient.profileCompletenessStage}</StatusPill></td><td><Button variant="ghost" className={styles.tableAction} onClick={() => selectPatient(patient._id)}>View</Button></td></tr>)}
        </RecordTable>
        {showCreate && <CreateForm title="Add patient" description="Phone is required. Add a name and birth date when they are known." onClose={() => setShowCreate(false)} onSubmit={handleCreate} submitting={submitting} error={error}>
          <Field label="Phone"><input name="phone" required placeholder="+919876543210" /></Field><Field label="Full name"><input name="name" placeholder="Ibrahim Khan" /></Field><Field label="Date of birth"><input name="dob" type="date" /></Field>
        </CreateForm>}
        {!showCreate && selected && <DetailPanel title="Patient details" onClose={() => setSelected(null)}><DetailRow label="Name" value={selected.name} /><DetailRow label="Patient code" value={selected.patientCode} mono /><DetailRow label="Phone" value={selected.phone} /><DetailRow label="Date of birth" value={formatDate(selected.dob)} /><DetailRow label="Profile stage" value={selected.profileCompletenessStage} /></DetailPanel>}
      </ManagementWorkspace>
    </div>
  );
}
