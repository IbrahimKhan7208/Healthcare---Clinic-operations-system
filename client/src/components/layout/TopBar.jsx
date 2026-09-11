import { Bell, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { listConfirmations } from '../../api/confirmations';
import { listDocuments } from '../../api/documents';
import { listHandoffs } from '../../api/operations';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';
import styles from './TopBar.module.css';

function formatRole(role) {
  if (!role) return '';
  return role.replace(/_/g, ' ');
}

export function TopBar() {
  const { staff, logout } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    let active = true;
    async function refreshCount() {
      try {
        const [confirmationResult, documentResult, handoffResult] = await Promise.all([listConfirmations(), listDocuments({ status: 'pending_review' }), listHandoffs('open')]);
        if (active) setPendingCount(confirmationResult.confirmations.length + documentResult.documents.length + handoffResult.handoffs.length);
      } catch {
        // Navigation should remain usable if the notification request fails.
      }
    }
    refreshCount();
    const interval = window.setInterval(refreshCount, 30000);
    return () => { active = false; window.clearInterval(interval); };
  }, []);

  return (
    <header className={styles.bar}>
      <div className={styles.workspaceLabel}><span className={styles.workspaceDot} /> Staff workspace</div>
      <div className={styles.actions}>
      <div className={styles.identity}>
        <span className={styles.avatar}>{staff?.name?.slice(0, 1)?.toUpperCase() || 'S'}</span>
        <span className={styles.name}>{staff?.name}</span>
        <span className={styles.role}>{formatRole(staff?.role)}</span>
      </div>
      <Link className={styles.notifications} to="/action-inbox" aria-label={`${pendingCount} pending staff actions`}>
        <Bell size={18} strokeWidth={1.75} />
        {pendingCount > 0 && <span className={styles.badge}>{pendingCount > 99 ? '99+' : pendingCount}</span>}
      </Link>
      <Button variant="ghost" onClick={logout}>
        <LogOut size={16} strokeWidth={1.75} />
        Log out
      </Button>
      </div>
    </header>
  );
}
