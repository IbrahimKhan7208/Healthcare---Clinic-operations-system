import { Check, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { approveConfirmation, listConfirmations, rejectConfirmation } from '../api/confirmations';
import { Button } from '../components/common/Button';
import { DetailPanel, DetailRow, ManagementWorkspace, PageHeader, RecordTable } from '../components/common/ManagementView';
import { toolLabel } from '../utils/toolLabels';
import styles from './Page.module.css';

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';
}

function requestSummary(request) {
  if (request.tool === 'createAppointment') return `Appointment requested for ${formatDateTime(request.args.datetime)}`;
  if (request.tool === 'rescheduleAppointment') return `Move appointment to ${formatDateTime(request.args.newDatetime)}`;
  if (request.tool === 'cancelAppointment') return 'Cancel appointment';
  return toolLabel(request.tool);
}

export function ConfirmationsPage() {
  const [confirmations, setConfirmations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);
  const [error, setError] = useState('');

  async function loadConfirmations() {
    setLoading(true);
    try { setConfirmations((await listConfirmations()).confirmations); } catch (err) { setError(err.message); } finally { setLoading(false); }
  }
  useEffect(() => { loadConfirmations(); }, []);

  async function act(request, action) {
    setActingId(request._id); setError('');
    try {
      if (action === 'approve') await approveConfirmation(request._id);
      else await rejectConfirmation(request._id);
      setConfirmations((items) => items.filter((item) => item._id !== request._id));
      if (selected?._id === request._id) setSelected(null);
    } catch (err) { setError(err.message); } finally { setActingId(null); }
  }

  return (
    <div className={styles.container}>
      <PageHeader eyebrow="Staff action required" title="Confirmation queue" description="Patient appointment requests from WhatsApp wait here until a staff member approves or rejects them." />
      {error && <p className={styles.pageError}>{error}</p>}
      <ManagementWorkspace>
        <RecordTable columns={['Patient', 'Request', 'Received', '']} emptyText="There are no appointment requests waiting for review." loading={loading} isEmpty={!confirmations.length}>
          {confirmations.map((request) => <tr key={request._id}>
            <td><div className={styles.primaryText}>{request.context?.patientName || request.patientId?.name || 'Unnamed patient'}</div><div className={`${styles.muted} mono`}>{request.context?.patientCode || request.patientId?.patientCode}</div></td>
            <td><div>{toolLabel(request.tool)}</div><div className={styles.muted}>{requestSummary(request)}</div></td>
            <td>{formatDateTime(request.created_at)}</td>
            <td><Button variant="ghost" className={styles.tableAction} onClick={() => setSelected(request)}>Review</Button></td>
          </tr>)}
        </RecordTable>
        {selected && <DetailPanel title="Review request" onClose={() => setSelected(null)}>
          <DetailRow label="Patient" value={selected.context?.patientName || selected.patientId?.name} /><DetailRow label="Patient code" value={selected.context?.patientCode || selected.patientId?.patientCode} mono />
          <DetailRow label="Request" value={toolLabel(selected.tool)} /><DetailRow label="Doctor" value={selected.context?.doctorName} /><DetailRow label="Department" value={selected.context?.department} />
          {selected.tool !== 'cancelAppointment' && <DetailRow label={selected.tool === 'rescheduleAppointment' ? 'Requested new time' : 'Requested time'} value={formatDateTime(selected.context?.requestedDatetime || selected.args.datetime || selected.args.newDatetime)} />}
          {['rescheduleAppointment', 'cancelAppointment'].includes(selected.tool) && <DetailRow label="Appointment ID" value={selected.args.appointmentId} mono />}
          <div className={styles.reviewActions}>
            <Button onClick={() => act(selected, 'approve')} disabled={actingId === selected._id}><Check size={16} /> {actingId === selected._id ? 'Saving…' : 'Approve'}</Button>
            <Button variant="danger" onClick={() => act(selected, 'reject')} disabled={actingId === selected._id}><X size={16} /> Reject</Button>
          </div>
        </DetailPanel>}
      </ManagementWorkspace>
    </div>
  );
}
