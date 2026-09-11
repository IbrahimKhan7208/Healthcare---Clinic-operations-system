import { useEffect, useState } from 'react';
import { sendAgentChat, confirmAgentTool, getAgentSession, rejectAgentTool } from '../api/agent';
import { extractDisplayText } from '../utils/agentMessages';
import { toolLabel } from '../utils/toolLabels';
import { ChatPanel } from '../components/agent/ChatPanel';

function makeId() {
  return crypto.randomUUID();
}

export function AgentPage() {
  // `history` is the plain conversation used by the server to rebuild the
  // graph context; `timeline` is the richer persisted view with cards.
  const [history, setHistory] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmingId, setConfirmingId] = useState(null);
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    let active = true;
    getAgentSession()
      .then(({ messages, timeline }) => {
        if (!active) return;
        const restored = messages || [];
        setHistory(restored.map(({ role, content }) => ({ role, content })));
        setTimeline(timeline || []);
      })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setRestoring(false); });
    return () => { active = false; };
  }, []);

  async function handleSend(text) {
    setError('');
    const userMessage = { role: 'user', content: text };
    setHistory((items) => [...items, userMessage]);
    setTimeline((t) => [...t, { type: 'message', id: makeId(), role: 'user', content: text }]);
    setLoading(true);

    try {
      const result = await sendAgentChat(text);
      const pending = result.pendingConfirmations || [];
      const displayText = result.assistantMessage || extractDisplayText(result.messages, pending);

      const additions = result.timelineAdditions || [
        ...(displayText ? [{ type: 'message', id: makeId(), role: 'assistant', content: displayText }] : []),
        ...pending.map((p) => ({ type: 'confirmation', id: makeId(), tool: p.tool, args: p.args, context: p.context, status: 'pending' })),
      ];
      setTimeline((items) => [...items, ...additions]);

      if (displayText) setHistory((h) => [...h, { role: 'assistant', content: displayText }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(itemId) {
    const item = timeline.find((t) => t.id === itemId);
    if (!item) return;

    setConfirmingId(itemId);
    setError('');

    try {
      const { timelineAddition } = await confirmAgentTool(item.tool, item.args, item.id);
      setTimeline((t) => t.map((entry) => (entry.id === itemId ? { ...entry, status: 'approved' } : entry)));
      setHistory((h) => [...h, { role: 'assistant', content: `Confirmed: ${toolLabel(item.tool)}.` }]);
      if (timelineAddition) setTimeline((t) => [...t, timelineAddition]);
    } catch (err) {
      setError(err.message);
    } finally {
      setConfirmingId(null);
    }
  }

  async function handleReject(itemId) {
    const item = timeline.find((t) => t.id === itemId);
    if (!item) return;

    setConfirmingId(itemId); setError('');
    try {
      const { timelineAddition } = await rejectAgentTool(item.id, item.tool);
      setTimeline((t) => t.map((entry) => (entry.id === itemId ? { ...entry, status: 'rejected' } : entry)));
      setHistory((h) => [...h, { role: 'assistant', content: `The user chose not to: ${toolLabel(item.tool)}.` }]);
      if (timelineAddition) setTimeline((t) => [...t, timelineAddition]);
    } catch (err) {
      setError(err.message);
    } finally {
      setConfirmingId(null);
    }
  }

  return (
    <ChatPanel
      timeline={timeline}
      loading={loading || restoring}
      error={error}
      onSend={handleSend}
      onApprove={handleApprove}
      onReject={handleReject}
      confirmingId={confirmingId}
    />
  );
}
