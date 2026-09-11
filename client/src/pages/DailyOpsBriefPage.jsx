import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getOpsBrief } from '../api/operations';
import { PageHeader } from '../components/common/ManagementView';
import styles from './Page.module.css';
import briefStyles from './DailyOpsBrief.module.css';

function formatDate(value) { return value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'; }

export function DailyOpsBriefPage() {
  const [brief, setBrief] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { getOpsBrief().then(setBrief).catch((err) => setError(err.message)); }, []);

  const metrics = brief ? [
    [brief.metrics.todayAppointments, 'appointments today'], [brief.metrics.pendingDocuments, 'documents to review'], [brief.metrics.pendingConfirmations, 'appointment requests'], [brief.metrics.openHandoffs, 'open handoffs'], [brief.metrics.overdueFollowUps, 'overdue follow-ups'],
  ] : [];
  return (
    <div className={styles.container}>
      <PageHeader eyebrow="Live operational summary" title="Daily ops brief" description="A grounded summary of the work currently flowing through the clinic—generated from live records, not guessed by the assistant." />
      {error && <p className={styles.pageError}>{error}</p>}
      {!brief && !error && <p className={styles.muted}>Preparing today’s brief…</p>}
      {brief && <><p className={briefStyles.generated}>Generated {formatDate(brief.generatedAt)}</p><div className={briefStyles.metrics}>{metrics.map(([value, label]) => <div className={briefStyles.metric} key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>
        <div className={briefStyles.grid}><section className={briefStyles.panel}><h2>Needs attention</h2>{brief.actionItems.length ? brief.actionItems.map((item) => <Link key={item.title} to={item.href} className={`${briefStyles.action} ${briefStyles[item.tone] || ''}`}><strong>{item.title}</strong><span>{item.detail}</span></Link>) : <p className={briefStyles.quiet}>Nothing needs staff attention right now.</p>}</section>
          <section className={briefStyles.panel}><h2>Today’s appointments</h2>{brief.todayAppointments.length ? <div className={briefStyles.list}>{brief.todayAppointments.map((appointment) => <div className={briefStyles.row} key={appointment.id}><div><strong>{appointment.patientName}</strong><span>{appointment.doctorName}{appointment.department ? ` · ${appointment.department}` : ''}</span></div><span>{formatDate(appointment.datetime)}</span></div>)}</div> : <p className={briefStyles.quiet}>No scheduled appointments today.</p>}</section>
          <section className={briefStyles.panel}><h2>Pipeline snapshot</h2><div className={briefStyles.stageRows}>{Object.entries(brief.pipelineCounts).length ? Object.entries(brief.pipelineCounts).map(([stage, count]) => <div className={briefStyles.stageRow} key={stage}><span>{stage}</span><b>{count}</b></div>) : <p className={briefStyles.quiet}>No patient stages yet.</p>}</div></section>
          <section className={briefStyles.panel}><h2>Doctor load today</h2>{brief.busiestDoctors.length ? <div className={briefStyles.list}>{brief.busiestDoctors.map((doctor) => <div className={briefStyles.row} key={doctor.name}><div><strong>{doctor.name}</strong><span>{doctor.department || 'Clinic schedule'}</span></div><span>{doctor.count} appointment{doctor.count === 1 ? '' : 's'}</span></div>)}</div> : <p className={briefStyles.quiet}>No doctor appointments scheduled today.</p>}</section>
        </div></>}
    </div>
  );
}
