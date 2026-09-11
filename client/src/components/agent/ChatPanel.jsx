import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { ConfirmationCard } from './ConfirmationCard';
import { Button } from '../common/Button';
import styles from './ChatPanel.module.css';

export function ChatPanel({ timeline, loading, error, onSend, onApprove, onReject, confirmingId }) {
  const [draft, setDraft] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [timeline, loading]);

  function handleSubmit(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || loading) return;
    onSend(text);
    setDraft('');
  }

  return (
    <div className={styles.panel}>
      <div className={styles.history}>
        {timeline.length === 0 && (
          <div className={styles.emptyState}>
            <h2 className={styles.emptyTitle}>Ask about anything in the system</h2>
            <p>
              "How many referrals are pending?", "Reschedule Rahul Sharma's appointment with Dr. Mehta to Friday
              3pm", "What's Dr. Patel's availability this week?" — reads happen immediately; anything that changes
              a record comes back here for you to confirm first.
            </p>
          </div>
        )}

        {timeline.map((item) =>
          item.type === 'message' ? (
            <MessageBubble key={item.id} role={item.role} content={item.content} />
          ) : (
            <ConfirmationCard
              key={item.id}
              tool={item.tool}
              args={item.args}
              context={item.context}
              status={item.status}
              busy={confirmingId === item.id}
              onApprove={() => onApprove(item.id)}
              onReject={() => onReject(item.id)}
            />
          )
        )}

        {loading && <p className={styles.thinking}>Thinking…</p>}
        <div ref={bottomRef} />
      </div>

      <form className={styles.composer} onSubmit={handleSubmit}>
        {error && <div className={styles.errorNote}>{error}</div>}
        <input
          className={styles.input}
          placeholder="Ask a question or describe what needs to change…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={loading}
        />
        <Button type="submit" disabled={loading || !draft.trim()}>
          <Send size={16} strokeWidth={2} />
          Send
        </Button>
      </form>
    </div>
  );
}
