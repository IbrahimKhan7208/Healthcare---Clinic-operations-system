import { Check, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import { claimHandoff, listHandoffs, replyToHandoff, resolveHandoff } from '../api/operations';
import { Button } from '../components/common/Button';
import { PageHeader } from '../components/common/ManagementView';
import { useAuth } from '../context/AuthContext';
import styles from './Page.module.css';
import handoffStyles from './HandoffInbox.module.css';

function formatDate(value) { return value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'; }

export function HandoffInboxPage() {
  const { staff } = useAuth();
  const [handoffs, setHandoffs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('open');
  const [reply, setReply] = useState('');
  const [acting, setActing] = useState(false);
  const [error, setError] = useState('');

  async function load(nextFilter = filter) {
    try { const result = await listHandoffs(nextFilter); setHandoffs(result.handoffs); setSelected((current) => result.handoffs.find((item) => item._id === current?._id) || null); } catch (err) { setError(err.message); }
  }
  useEffect(() => { load(); }, [filter]);
  async function claim() { if (!selected) return; setActing(true); setError(''); try { const { handoff } = await claimHandoff(selected._id); setSelected(handoff); await load(); } catch (err) { setError(err.message); } finally { setActing(false); } }
  async function sendReply(event) { event.preventDefault(); if (!selected || !reply.trim()) return; setActing(true); setError(''); try { const { handoff } = await replyToHandoff(selected._id, reply); setReply(''); setSelected(handoff); await load(); } catch (err) { setError(err.message); } finally { setActing(false); } }
  async function resolve() { if (!selected) return; setActing(true); setError(''); try { await resolveHandoff(selected._id); await load(); setSelected(null); } catch (err) { setError(err.message); } finally { setActing(false); } }
  const isMine = selected?.claimedBy && String(selected.claimedBy._id || selected.claimedBy) === String(staff?.id || staff?._id);
  return (
    <div className={styles.container}>
      <PageHeader eyebrow="Human support" title="Handoff inbox" description="WhatsApp conversations that need a person: clinical questions, an explicit request for staff, or an assistant response with insufficient confidence." />
      {error && <p className={styles.pageError}>{error}</p>}<div className={handoffStyles.filters}>{[['open', 'Open'], ['unclaimed', 'Unclaimed'], ['claimed', 'Claimed'], ['resolved', 'Resolved']].map(([value, label]) => <button type="button" key={value} onClick={() => setFilter(value)} className={`${handoffStyles.filter} ${filter === value ? handoffStyles.filterActive : ''}`}>{label}</button>)}</div>
      <div className={handoffStyles.layout}><section className={handoffStyles.list}>{handoffs.length ? handoffs.map((handoff) => <button type="button" key={handoff._id} onClick={() => setSelected(handoff)} className={`${handoffStyles.item} ${selected?._id === handoff._id ? handoffStyles.itemActive : ''}`}><div className={handoffStyles.itemHead}><strong>{handoff.patientId?.name || 'Unnamed patient'}</strong><span>{formatDate(handoff.escalatedAt)}</span></div><span className={handoffStyles.reason}>{handoff.escalationReason}</span>{handoff.claimedBy && <span className={handoffStyles.owner}>Claimed by {handoff.claimedBy.name}</span>}</button>) : <p className={handoffStyles.empty}>No conversations in this view.</p>}</section>
        <section className={handoffStyles.conversation}>{selected ? <><div className={handoffStyles.conversationHead}><div><h2>{selected.patientId?.name || 'Unnamed patient'}</h2><p>{selected.patientId?.patientCode} · {selected.patientId?.phone}</p></div>{!selected.claimedBy && filter !== 'resolved' && <Button onClick={claim} disabled={acting}>Claim conversation</Button>}</div><div className={handoffStyles.messages}>{selected.messages?.map((message, index) => <div key={`${message.timestamp}-${index}`} className={`${handoffStyles.message} ${handoffStyles[message.sender] || handoffStyles.bot}`}>{message.text}<small>{message.sender} · {formatDate(message.timestamp)}</small></div>)}</div>{isMine && filter !== 'resolved' && <form className={handoffStyles.composer} onSubmit={sendReply}><textarea value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Reply to the patient over WhatsApp…" disabled={acting} /><div className={handoffStyles.actions}><Button type="button" variant="secondary" onClick={resolve} disabled={acting}><Check size={16} /> Resolve</Button><Button type="submit" disabled={acting || !reply.trim()}><Send size={16} /> Send reply</Button></div></form>}{selected.claimedBy && !isMine && filter !== 'resolved' && <p className={handoffStyles.empty}>This conversation is currently claimed by {selected.claimedBy.name}.</p>}</> : <p className={handoffStyles.empty}>Select a conversation to read its full context.</p>}</section></div>
    </div>
  );
}
