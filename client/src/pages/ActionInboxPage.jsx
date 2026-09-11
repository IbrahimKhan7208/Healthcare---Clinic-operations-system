import { BellRing, ClipboardCheck, LifeBuoy, ScanLine } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { listConfirmations } from '../api/confirmations';
import { listDocuments } from '../api/documents';
import { listHandoffs } from '../api/operations';
import styles from './ActionInbox.module.css';
import pageStyles from './Page.module.css';

export function ActionInboxPage() {
  const [counts, setCounts] = useState({ confirmations: 0, documents: 0, handoffs: 0 });
  const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([listConfirmations(), listDocuments({ status: 'pending_review' }), listHandoffs('open')])
      .then(([confirmationResult, documentResult, handoffResult]) => setCounts({ confirmations: confirmationResult.confirmations.length, documents: documentResult.documents.length, handoffs: handoffResult.handoffs.length }))
      .catch((err) => setError(err.message));
  }, []);
  return <div className={pageStyles.container}>
    <header className={styles.header}><BellRing size={26} /><div><p>Staff action required</p><h1>Action inbox</h1><span>Requests that need a person to review before the clinic can proceed.</span></div></header>
    {error && <p className={pageStyles.pageError}>{error}</p>}
    <div className={styles.grid}>
      <Link to="/confirmations" className={styles.card}><ClipboardCheck size={22} /><div><strong>{counts.confirmations} appointment request{counts.confirmations === 1 ? '' : 's'}</strong><span>Booking and rescheduling requests from WhatsApp.</span></div><b>Review</b></Link>
      <Link to="/referrals" className={styles.card}><ScanLine size={22} /><div><strong>{counts.documents} document{counts.documents === 1 ? '' : 's'} to review</strong><span>OCR extraction requiring staff validation.</span></div><b>Review</b></Link>
      <Link to="/handoff" className={styles.card}><LifeBuoy size={22} /><div><strong>{counts.handoffs} human handoff{counts.handoffs === 1 ? '' : 's'}</strong><span>WhatsApp conversations needing a staff response.</span></div><b>Open</b></Link>
    </div>
  </div>;
}
