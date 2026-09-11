import { X } from 'lucide-react';
import { Button } from './Button';
import styles from './ManagementView.module.css';

export function PageHeader({ eyebrow, title, description, action }) {
  return (
    <header className={styles.pageHeader}>
      <div>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1>{title}</h1>
        <p className={styles.description}>{description}</p>
      </div>
      {action}
    </header>
  );
}

export function ManagementWorkspace({ children }) {
  return <div className={styles.workspace}>{children}</div>;
}

export function RecordTable({ columns, children, emptyText, loading, isEmpty = false }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {!loading && isEmpty && <p className={styles.empty}>{emptyText}</p>}
      {loading && <p className={styles.empty}>Loading records…</p>}
    </div>
  );
}

export function StatusPill({ children, tone = 'neutral' }) {
  const toneClass = `pill${String(tone).replace(/[^a-z]/gi, '')}`;
  return <span className={`${styles.pill} ${styles[toneClass] || styles.pillneutral}`}>{children}</span>;
}

export function DetailPanel({ title, onClose, children }) {
  return (
    <aside className={styles.detail} aria-label={`${title} details`}>
      <div className={styles.detailHead}>
        <h2>{title}</h2>
        <Button variant="ghost" className={styles.close} onClick={onClose} aria-label="Close details">
          <X size={18} />
        </Button>
      </div>
      <div className={styles.detailBody}>{children}</div>
    </aside>
  );
}

export function DetailRow({ label, value, mono = false }) {
  return (
    <div className={styles.detailRow}>
      <span>{label}</span>
      <strong className={mono ? styles.mono : ''}>{value || '—'}</strong>
    </div>
  );
}

export function CreateForm({ title, description, onClose, onSubmit, submitting, error, children }) {
  return (
    <aside className={styles.detail} aria-label={title}>
      <div className={styles.detailHead}>
        <h2>{title}</h2>
        <Button variant="ghost" className={styles.close} onClick={onClose} aria-label="Close form">
          <X size={18} />
        </Button>
      </div>
      <p className={styles.formDescription}>{description}</p>
      <form className={styles.form} onSubmit={onSubmit}>
        {children}
        {error && <p className={styles.formError}>{error}</p>}
        <div className={styles.formActions}>
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={submitting}>{submitting ? 'Saving…' : 'Save record'}</Button>
        </div>
      </form>
    </aside>
  );
}

export function Field({ label, children }) {
  return <label className={styles.field}><span>{label}</span>{children}</label>;
}
