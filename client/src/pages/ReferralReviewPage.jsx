import { Check, ScanLine, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '../api/client';
import { getDocument, listDocuments, reviewDocument, uploadDocument } from '../api/documents';
import { listPatients } from '../api/records';
import { Button } from '../components/common/Button';
import { PageHeader, RecordTable, StatusPill } from '../components/common/ManagementView';
import styles from './Page.module.css';
import reviewStyles from './ReferralReview.module.css';

function formatDate(value) { return value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'; }
function overallConfidence(document) { return Math.round((document.confidenceScores?.overall || 0) * 100); }
function extractedPatientName(document) { return document.type === 'insurance_card' ? document.extractedFields?.memberName : document.extractedFields?.patientName; }
function normalizedName(value) { return String(value || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase(); }
function identityState(document, patient) {
  const extractedName = extractedPatientName(document);
  if (!patient) return { label: 'Needs matching', tone: 'missing' };
  if (extractedName && patient.name && normalizedName(extractedName) !== normalizedName(patient.name)) return { label: 'Name mismatch', tone: 'mismatch' };
  return { label: extractedName ? 'Name matches' : 'Name not extracted', tone: extractedName ? 'match' : 'missing' };
}

export function ReferralReviewPage() {
  const [documents, setDocuments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('pending_review');
  const [draftFields, setDraftFields] = useState('{}');
  const [patientId, setPatientId] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState('');
  const uploadFormRef = useRef(null);
  const selectedPatient = patients.find((patient) => patient._id === patientId);
  const selectedIdentity = selected ? identityState({ ...selected, extractedFields: (() => { try { return JSON.parse(draftFields); } catch { return selected.extractedFields; } })() }, selectedPatient) : null;

  async function loadDocuments(nextFilter = filter) {
    setLoading(true);
    try {
      const [documentResult, patientResult] = await Promise.all([listDocuments(nextFilter === 'all' ? {} : { status: nextFilter }), listPatients()]);
      setDocuments(documentResult.documents); setPatients(patientResult.patients);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }
  useEffect(() => { loadDocuments(); }, [filter]);

  async function selectDocument(id) {
    try {
      const { document } = await getDocument(id);
      setSelected(document); setDraftFields(JSON.stringify(document.extractedFields || {}, null, 2)); setPatientId(document.patientId?._id || document.patientId || '');
    } catch (err) { setError(err.message); }
  }
  async function handleReview(approve) {
    if (!selected) return;
    let correctedFields;
    try { correctedFields = JSON.parse(draftFields); } catch { setError('Extracted fields must be valid JSON before saving.'); return; }
    setReviewing(true); setError('');
    try {
      await reviewDocument(selected._id, { approve, correctedFields, patientId: patientId || undefined });
      setSelected(null); await loadDocuments();
    } catch (err) { setError(err.message); } finally { setReviewing(false); }
  }
  async function handleUpload(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const file = form.get('file');
    if (!(file instanceof File) || !file.size) { setError('Choose a document to upload.'); return; }
    setUploading(true); setError('');
    try { await uploadDocument({ file, type: form.get('type'), patientId: form.get('patientId') || undefined }); formElement.reset(); await loadDocuments(); }
    catch (err) { setError(err.message); } finally { setUploading(false); }
  }
  return (
    <div className={styles.container}>
      <PageHeader eyebrow="Document intelligence" title="Referral review" description="Review OCR extraction, correct uncertain fields, and approve documents into the matched patient record." />
      {error && <p className={styles.pageError}>{error}</p>}
      <form ref={uploadFormRef} className={reviewStyles.upload} onSubmit={handleUpload}>
        <h2>Upload for review</h2><p>Upload a referral letter, insurance card, or lab report from the staff dashboard.</p>
        <div className={reviewStyles.uploadFields}><select name="type" defaultValue="referral"><option value="referral">Referral letter</option><option value="insurance_card">Insurance card</option><option value="lab_report">Lab report</option></select><select name="patientId" defaultValue=""><option value="">Match from extraction</option>{patients.map((patient) => <option key={patient._id} value={patient._id}>{patient.name || 'Unnamed patient'} · {patient.patientCode}</option>)}</select><input name="file" type="file" accept="image/*,application/pdf" /><Button type="submit" disabled={uploading}><Upload size={16} /> {uploading ? 'Processing…' : 'Upload'}</Button></div>
      </form>
      <div className={reviewStyles.filterRow}>{[['pending_review', 'Needs review'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['all', 'All documents']].map(([value, label]) => <button key={value} type="button" onClick={() => { setFilter(value); setSelected(null); }} className={`${reviewStyles.filter} ${filter === value ? reviewStyles.filterActive : ''}`}>{label}</button>)}</div>
      <div className={reviewStyles.layout}>
        <RecordTable columns={['Document', 'Patient', 'Extraction', 'Identity', 'Received', '']} emptyText="No documents match this view." loading={loading} isEmpty={!documents.length}>
          {documents.map((document) => { const identity = identityState(document, document.patientId); return <tr key={document._id}><td><div className={styles.primaryText}>{document.type.replace('_', ' ')}</div><div className={`${styles.muted} mono`}>{document._id}</div></td><td>{document.patientId?.name || 'Unmatched'}<div className={styles.muted}>{document.patientId?.patientCode}</div></td><td><span className={`${reviewStyles.confidence} ${overallConfidence(document) < 75 ? reviewStyles.confidenceLow : ''}`}>{overallConfidence(document)}%</span></td><td><span className={`${reviewStyles.identity} ${reviewStyles[`identity${identity.tone}`]}`}>{identity.label}</span></td><td>{formatDate(document.created_at)}</td><td><Button variant="ghost" className={styles.tableAction} onClick={() => selectDocument(document._id)}>Review</Button></td></tr>; })}
        </RecordTable>
        {selected && <aside className={reviewStyles.review}><div className={reviewStyles.reviewHead}><h2>Review {selected.type.replace('_', ' ')}</h2><p>{selected.patientId?.name || 'Patient needs matching'} · <StatusPill>{selected.status.replace('_', ' ')}</StatusPill></p></div>
          <label className={reviewStyles.field}><span>Associate patient</span><select value={patientId} onChange={(event) => setPatientId(event.target.value)}><option value="">Select a patient before approval</option>{patients.map((patient) => <option key={patient._id} value={patient._id}>{patient.name || 'Unnamed patient'} · {patient.patientCode}</option>)}</select></label>
          {selectedIdentity?.tone === 'mismatch' && <p className={reviewStyles.mismatch}>Identity mismatch: the document name is <strong>{extractedPatientName({ ...selected, extractedFields: (() => { try { return JSON.parse(draftFields); } catch { return selected.extractedFields; } })() })}</strong>, but the selected patient is <strong>{selectedPatient?.name}</strong>. Approval is blocked until this is corrected.</p>}
          <div className={reviewStyles.scores}>{Object.entries(selected.confidenceScores || {}).filter(([key]) => !['overall', 'ocr'].includes(key)).map(([key, score]) => <div className={`${reviewStyles.score} ${Number(score) < .75 ? reviewStyles.scoreLow : ''}`} key={key}><span>{key}</span><span>{Math.round(Number(score) * 100)}%</span></div>)}</div>
          <label className={reviewStyles.field}><span>Extracted fields — edit JSON to correct uncertain values</span><textarea value={draftFields} onChange={(event) => setDraftFields(event.target.value)} disabled={selected.status !== 'pending_review'} /></label>
          <a className={reviewStyles.original} href={`${API_BASE_URL}${selected.rawFileRef}`} target="_blank" rel="noreferrer">Open original document</a><label className={reviewStyles.field}><span>OCR text</span><pre className={reviewStyles.ocr}>{selected.ocrResult || 'No OCR text extracted.'}</pre></label>
          {selected.status === 'pending_review' && <div className={reviewStyles.actions}><Button onClick={() => handleReview(true)} disabled={reviewing}><Check size={16} /> {reviewing ? 'Saving…' : 'Approve'}</Button><Button variant="danger" onClick={() => handleReview(false)} disabled={reviewing}><X size={16} /> Reject</Button></div>}
        </aside>}
      </div>
    </div>
  );
}
