import { Check, X } from 'lucide-react';
import { Button } from '../common/Button';
import { toolLabel, argLabel, formatArgValue } from '../../utils/toolLabels';
import styles from './ConfirmationCard.module.css';

export function ConfirmationCard({ tool, args, context, status, onApprove, onReject, busy }) {
  const appointmentContext = ['rescheduleAppointment', 'cancelAppointment'].includes(tool) ? context : null;

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>{toolLabel(tool)}</h3>

      <div className={styles.rows}>
        {appointmentContext && (
          <>
            <div className={styles.row}>
              <span className={styles.rowLabel}>Patient</span>
              <span className={`${styles.rowValue} ${styles.contextValue}`}>{appointmentContext.patientName}</span>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>Doctor</span>
              <span className={`${styles.rowValue} ${styles.contextValue}`}>
                {appointmentContext.doctorName}
                {appointmentContext.department ? ` · ${appointmentContext.department}` : ''}
              </span>
            </div>
            {appointmentContext.currentDatetime && (
              <div className={styles.row}>
                <span className={styles.rowLabel}>Currently scheduled</span>
                <span className={styles.rowValue}>{formatArgValue('datetime', appointmentContext.currentDatetime)}</span>
              </div>
            )}
          </>
        )}
        {Object.entries(args).map(([key, value]) => (
          <div className={styles.row} key={key}>
            <span className={styles.rowLabel}>{argLabel(key)}</span>
            <span className={styles.rowValue}>{formatArgValue(key, value)}</span>
          </div>
        ))}
      </div>

      {status === 'pending' && (
        <div className={styles.actions}>
          <Button variant="primary" onClick={onApprove} disabled={busy}>
            <Check size={16} strokeWidth={2} />
            {busy ? 'Confirming…' : 'Confirm'}
          </Button>
          <Button variant="secondary" onClick={onReject} disabled={busy}>
            <X size={16} strokeWidth={2} />
            Don't make this change
          </Button>
        </div>
      )}

      {status === 'approved' && <p className={`${styles.status} ${styles.statusApproved}`}>Confirmed and saved.</p>}
      {status === 'rejected' && <p className={`${styles.status} ${styles.statusRejected}`}>Not made.</p>}
    </div>
  );
}
