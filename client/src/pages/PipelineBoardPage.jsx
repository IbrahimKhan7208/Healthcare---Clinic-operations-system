import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { listPipeline } from '../api/records';
import { Button } from '../components/common/Button';
import { PageHeader, StatusPill } from '../components/common/ManagementView';
import styles from './Page.module.css';
import boardStyles from './PipelineBoard.module.css';

function formatDateTime(value) { return value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'; }
function stageDate(stage, name) { return stage.history?.find((entry) => entry.stage === name)?.enteredAt; }

export function PipelineBoardPage() {
  const [stages, setStages] = useState([]);
  const [pipeline, setPipeline] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    listPipeline()
      .then((result) => { setStages(result.stages); setPipeline(result.pipeline); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={styles.container}>
      <PageHeader eyebrow="Live patient progress" title="Patient pipeline" description="A live view of the stages created by profile, document-review, and appointment events across the clinic." />
      {error && <p className={styles.pageError}>{error}</p>}
      {loading ? <p className={styles.muted}>Loading patient pipeline…</p> : <div className={boardStyles.scroll}><div className={boardStyles.board}>
        {stages.map((stageName) => {
          const cards = pipeline.filter((item) => item.currentStage === stageName);
          return <section className={boardStyles.column} key={stageName}><div className={boardStyles.columnHead}><h2>{stageName}</h2><span className={boardStyles.count}>{cards.length}</span></div><div className={boardStyles.cards}>
            {cards.map((item) => <button type="button" className={boardStyles.card} key={item._id} onClick={() => setSelected(item)}><span className={boardStyles.cardName}>{item.patientId.name || 'Unnamed patient'}</span><span className={boardStyles.cardCode}>{item.patientId.patientCode}</span><span className={boardStyles.cardMeta}>{item.nextAppointment ? <span>Next: {formatDateTime(item.nextAppointment.datetime)}</span> : <span>No scheduled visit</span>}{item.documents.pendingReview > 0 && <span className={boardStyles.warning}>{item.documents.pendingReview} document{item.documents.pendingReview > 1 ? 's' : ''} to review</span>}</span></button>)}
            {!cards.length && <p className={boardStyles.empty}>No patients</p>}
          </div></section>;
        })}
      </div></div>}
      {selected && <aside className={boardStyles.detail}><div className={boardStyles.detailHead}><div><h2>{selected.patientId.name || 'Unnamed patient'}</h2><p>{selected.patientId.patientCode} · {selected.patientId.phone}</p></div><Button variant="ghost" className={boardStyles.close} onClick={() => setSelected(null)} aria-label="Close patient details"><X size={18} /></Button></div>
        <div className={boardStyles.detailGrid}><div><span className={boardStyles.label}>Current stage</span><StatusPill>{selected.currentStage}</StatusPill></div><div><span className={boardStyles.label}>Profile stage</span><span className={boardStyles.value}>{selected.patientId.profileCompletenessStage}</span></div><div><span className={boardStyles.label}>Next appointment</span><span className={boardStyles.value}>{selected.nextAppointment ? formatDateTime(selected.nextAppointment.datetime) : 'None scheduled'}</span></div><div><span className={boardStyles.label}>Doctor</span><span className={boardStyles.value}>{selected.nextAppointment?.doctorId?.name || '—'}</span></div><div><span className={boardStyles.label}>Documents</span><span className={boardStyles.value}>{selected.documents.total} total · {selected.documents.pendingReview} awaiting review</span></div><div><span className={boardStyles.label}>Entered this stage</span><span className={boardStyles.value}>{formatDateTime(stageDate(selected, selected.currentStage))}</span></div></div>
        <div className={boardStyles.timeline}>{selected.history?.map((entry, index) => <div className={boardStyles.timelineEntry} key={`${entry.stage}-${index}`}><strong>{entry.stage}</strong><span>{formatDateTime(entry.enteredAt)}</span></div>)}</div>
      </aside>}
    </div>
  );
}
