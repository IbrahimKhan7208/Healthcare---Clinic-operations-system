const { buildAgentGraph, executeConfirmedTool } = require('../agent/graph');
const models = require('../models');
const crypto = require('crypto');

function messageType(message) {
  if (typeof message?.getType === 'function') return message.getType();
  if (typeof message?._getType === 'function') return message._getType();
  if (Array.isArray(message?.id)) return message.id[message.id.length - 1];
  return message?.constructor?.name || null;
}

function isHumanMessage(message) {
  return ['human', 'HumanMessage'].includes(messageType(message)) || message?.role === 'user' || message?.type === 'human';
}

function isAiMessage(message) {
  return ['ai', 'AIMessage'].includes(messageType(message));
}

function assistantTextFrom(resultMessages, pendingConfirmations) {
  for (let index = resultMessages.length - 1; index >= 0; index -= 1) {
    const message = resultMessages[index];
    if (isHumanMessage(message)) break;
    if (isAiMessage(message)) {
      const content = message?.kwargs?.content ?? message?.content;
      if (typeof content === 'string' && content.trim()) return content.trim();
    }
  }
  return pendingConfirmations.length > 0 ? "Here's what I'd like to do — take a look below." : null;
}

async function appendSessionMessages(caller, messages) {
  if (!caller.sessionId) throw new Error('Your login session is missing a session ID. Please sign out and sign in again.');
  await models.AgentSession.findOneAndUpdate(
    { sessionId: caller.sessionId },
    {
      $setOnInsert: { staffId: caller.staffId },
      $push: { messages: { $each: messages } },
    },
    { upsert: true, new: true }
  );
}

async function appendSessionTurn(caller, messages, timeline) {
  if (!caller.sessionId) throw new Error('Your login session is missing a session ID. Please sign out and sign in again.');
  await models.AgentSession.findOneAndUpdate(
    { sessionId: caller.sessionId },
    {
      $setOnInsert: { staffId: caller.staffId },
      $push: {
        messages: { $each: messages },
        timeline: { $each: timeline },
      },
    },
    { upsert: true, new: true }
  );
}

function messageTimelineItem(role, content) {
  return { id: crypto.randomUUID(), type: 'message', role, content };
}

async function enrichPendingConfirmations(pendingConfirmations) {
  return Promise.all(
    pendingConfirmations.map(async (confirmation) => {
      if (!['rescheduleAppointment', 'cancelAppointment'].includes(confirmation.tool)) return confirmation;

      try {
        const appointment = await models.Appointment.findById(confirmation.args.appointmentId)
          .populate('patientId', 'name patientCode')
          .populate('doctorId', 'name doctorCode department')
          .lean();

        if (!appointment) return confirmation;

        return {
          ...confirmation,
          context: {
            patientName: appointment.patientId?.name || 'Unnamed patient',
            patientCode: appointment.patientId?.patientCode,
            doctorName: appointment.doctorId?.name || 'Unknown doctor',
            doctorCode: appointment.doctorId?.doctorCode,
            department: appointment.doctorId?.department,
            currentDatetime: appointment.datetime,
            requestedDatetime: confirmation.tool === 'rescheduleAppointment'
              ? confirmation.args.newDatetime
              : appointment.datetime,
          },
        };
      } catch (err) {
        // The confirmation remains usable even if the optional display lookup
        // cannot be completed (for example, a malformed/deleted ID).
        return confirmation;
      }
    })
  );
}

/**
 * POST /api/staff/agent/chat
 * Body: { message: string }
 *
 * Runs the graph for this caller. Read tool calls are already executed by the
 * time this returns. If the model proposed a write, it comes back in
 * `pendingConfirmations` and is NOT yet committed — the staff UI shows it as
 * a diff and calls /confirm to commit.
 */
async function chat(req, res) {
  try {
    const { message } = req.body;
    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'message is required.' });
    }

    if (!req.caller.sessionId) {
      return res.status(401).json({ error: 'Your login session has expired. Please sign in again.' });
    }

    const session = await models.AgentSession.findOne({ sessionId: req.caller.sessionId }).lean();
    const userMessage = { role: 'user', content: message.trim() };
    const messages = [...(session?.messages || []).map(({ role, content }) => ({ role, content })), userMessage];
    const { compiled } = buildAgentGraph(req.caller, models);
    const result = await compiled.invoke({ messages });

    const pendingConfirmations = await enrichPendingConfirmations(result.pendingConfirmations || []);
    const assistantMessage = assistantTextFrom(result.messages, pendingConfirmations);
    const timeline = [
      messageTimelineItem('user', userMessage.content),
      ...(assistantMessage ? [messageTimelineItem('assistant', assistantMessage)] : []),
      ...pendingConfirmations.map((confirmation) => ({
        id: crypto.randomUUID(),
        type: 'confirmation',
        tool: confirmation.tool,
        args: confirmation.args,
        context: confirmation.context,
        status: 'pending',
      })),
    ];
    await appendSessionTurn(req.caller, [
      userMessage,
      ...(assistantMessage ? [{ role: 'assistant', content: assistantMessage }] : []),
    ], timeline);

    res.json({
      messages: result.messages,
      pendingConfirmations,
      assistantMessage,
      timelineAdditions: timeline.slice(1),
    });
  } catch (err) {
    console.error('agent chat error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function getSession(req, res) {
  try {
    if (!req.caller.sessionId) {
      return res.status(401).json({ error: 'Your login session has expired. Please sign in again.' });
    }
    const session = await models.AgentSession.findOne({ sessionId: req.caller.sessionId }).lean();
    const messages = (session?.messages || []).map(({ role, content, createdAt }) => ({ role, content, createdAt }));
    // Sessions written before rich timelines were introduced still render as
    // plain history. Their previously discarded details cannot be recovered.
    const timeline = session?.timeline?.length
      ? session.timeline
      : messages.map(({ role, content }) => messageTimelineItem(role, content));
    res.json({ messages, timeline });
  } catch (err) {
    console.error('get agent session error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/staff/agent/confirm
 * Body: { tool: 'rescheduleAppointment', args: { appointmentId, newDatetime } }
 *
 * Commits a write the staff user has reviewed and approved. Re-derives the
 * scoped tool from req.caller — never trusts a tool/args pair without
 * re-checking permission scope at execution time.
 */
async function confirmTool(req, res) {
  try {
    const { tool, args, sessionEntryId } = req.body;
    if (!tool || !args) {
      return res.status(400).json({ error: 'tool and args are required.' });
    }

    const result = await executeConfirmedTool(req.caller, models, tool, args);
    const content = `Confirmed: ${tool}.`;
    const outcome = messageTimelineItem('assistant', content);
    if (sessionEntryId && req.caller.sessionId) {
      await models.AgentSession.updateOne(
        { sessionId: req.caller.sessionId, 'timeline.id': sessionEntryId },
        { $set: { 'timeline.$.status': 'approved' } }
      );
    }
    await appendSessionMessages(req.caller, [{ role: 'assistant', content }]);
    await models.AgentSession.updateOne(
      { sessionId: req.caller.sessionId },
      { $push: { timeline: outcome } }
    );
    res.json({ result, timelineAddition: outcome });
  } catch (err) {
    console.error('agent confirm error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function rejectToolProposal(req, res) {
  try {
    const { sessionEntryId, tool } = req.body;
    if (!sessionEntryId || !tool) return res.status(400).json({ error: 'sessionEntryId and tool are required.' });
    if (!req.caller.sessionId) return res.status(401).json({ error: 'Your login session has expired. Please sign in again.' });

    const content = `The user chose not to: ${tool}.`;
    const outcome = messageTimelineItem('assistant', content);
    await models.AgentSession.updateOne(
      { sessionId: req.caller.sessionId, 'timeline.id': sessionEntryId },
      { $set: { 'timeline.$.status': 'rejected' } }
    );
    await appendSessionMessages(req.caller, [{ role: 'assistant', content }]);
    await models.AgentSession.updateOne(
      { sessionId: req.caller.sessionId },
      { $push: { timeline: outcome } }
    );
    res.json({ timelineAddition: outcome });
  } catch (err) {
    console.error('agent rejection error:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { chat, confirmTool, rejectToolProposal, getSession };
