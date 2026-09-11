# Careflow Console

Careflow Console is an AI-enabled clinic operations platform that connects a staff workspace with a patient-facing WhatsApp assistant. It is designed to demonstrate a practical pattern for administrative healthcare workflows: a shared operational system where AI can retrieve records, propose controlled changes, process documents, and route work to people when judgment is required.

The project deliberately stays on the administrative side of care. It does **not** diagnose, prescribe, or provide treatment guidance.

## What it demonstrates

- Tool-calling AI that interacts with real operational records instead of generating ungrounded answers
- One shared backend for staff web workflows and patient WhatsApp conversations
- Human approval gates for consequential actions
- Grounded policy/FAQ retrieval with citations and non-diagnostic safety boundaries
- Document OCR, structured extraction, confidence reporting, and mandatory staff review
- Event-driven workflow automation and a patient pipeline
- WhatsApp intake, appointment requests, document intake, and human handoff

## Product surfaces

### Staff workspace

The React dashboard gives clinic teams a calm, operational view of the work moving through the clinic.

| Area | What staff can do |
| --- | --- |
| Operations brief | See daily appointments, workload, open handoffs, pending documents, follow-ups, and pipeline totals from live data. |
| Operations assistant | Ask questions in natural language, retrieve records, and propose changes through a confirmation card before a write is committed. Conversation history persists for the active login session. |
| Patients, doctors, and appointments | Manage core records, create appointments, and cancel an appointment manually when needed. |
| Confirmation queue | Review WhatsApp-originated booking, reschedule, and cancellation requests before they change records. |
| Referral review | Upload referral letters, insurance cards, and lab reports; inspect OCR output and structured fields; correct values; then approve or reject. |
| Patient pipeline | Track patients across referral, intake, scheduling, visit, follow-up, and discharge stages. |
| Handoff inbox | Claim, reply to, and resolve WhatsApp conversations that need a human. |
| Action inbox | Reach the highest-priority operational work from one place. |

### Patient WhatsApp experience

Patients interact with the same underlying operational records through Twilio WhatsApp.

- General policy, location, insurance, and preparation questions are answered from the clinic knowledge base.
- New contacts start as a minimal, phone-anchored prospect. Name and date of birth are collected only when a booking or document workflow needs them.
- Patients can request booking, rescheduling, or cancellation. These actions create a staff approval request; they are never silently applied.
- Patients can send a referral, insurance card, or lab report. It enters the same OCR and staff-review pipeline as dashboard uploads.
- Explicit requests for a person, clinical/diagnostic questions, and low-confidence assistant failures create a claimable staff handoff.

## Signature workflow

```text
Patient sends a WhatsApp message
            │
            ▼
Phone-scoped assistant identifies an administrative request
            │
            ├── Read-only request → retrieve live records / grounded policy answer
            │
            └── Booking, reschedule, or cancellation → pending staff confirmation
                                                          │
                                                          ▼
                                               Staff reviews the request
                                                          │
                                                          ▼
                                                Controlled tool executes
                                                          │
                                                          ▼
                                           Shared database + event bus update
                                                          │
                                                          ▼
                                             Patient receives WhatsApp outcome
```

The same confirmation pattern is used in the staff assistant: a natural-language request can propose a write, but only an explicit staff confirmation commits it.

## Architecture

```text
┌──────────────────────┐                 ┌─────────────────────────────┐
│ Staff React dashboard │                 │ Patient WhatsApp (Twilio)   │
│  • operations UI      │                 │  • phone-scoped assistant   │
└──────────┬───────────┘                 └──────────────┬──────────────┘
           │                                              │
           └──────────────────────┬───────────────────────┘
                                  ▼
                 ┌────────────────────────────────────┐
                 │ Express application                 │
                 │ • JWT staff authentication          │
                 │ • Twilio webhook verification       │
                 │ • LangGraph tool-calling agent      │
                 │ • confirmation / handoff services   │
                 │ • OCR document intake               │
                 │ • RAG retrieval                      │
                 └───────┬────────────────┬────────────┘
                         │                │
                         ▼                ▼
              ┌────────────────┐  ┌──────────────────────┐
              │ MongoDB        │  │ Pinecone + Cohere     │
              │ operational DB │  │ clinic knowledge base │
              └───────┬────────┘  └──────────────────────┘
                      ▼
              ┌────────────────┐
              │ Event bus      │
              │ pipeline +     │
              │ notifications  │
              └────────────────┘
```

### Core engineering choices

**Constrained tools, not database prompting.** The model receives explicit, validated tools such as `getAppointments`, `createAppointment`, `rescheduleAppointment`, and `cancelAppointment`. It never creates arbitrary database queries or executes raw text-to-database instructions.

**Permission-scoped callers.** Staff tools have organisation-wide operational access. WhatsApp callers are resolved from the verified phone number and are restricted to their own patient record.

**Human-in-the-loop writes.** The LangGraph flow holds mutating tool calls as confirmation proposals. Staff must explicitly approve a change before the confirmed execution path runs it.

**Events connect modules.** Appointment and document events update downstream workflow state. For example, approved referral intake advances a pipeline stage, and approved appointment requests create the corresponding operational event.

**Durable staff-agent sessions.** Each staff login JWT has a unique session ID. The assistant's readable conversation timeline—including rich confirmation cards and their outcomes—is stored against that session, restored on navigation/refresh, and naturally starts fresh on the next login.

## Document intelligence workflow

```text
Upload from dashboard or WhatsApp
        → file/PDF/image extraction
        → OCR
        → LLM structured-field extraction
        → field + OCR confidence scores
        → staff review queue
        → approve, correct, or reject
```

Supported document types are referral letters, insurance cards, and lab reports. Extraction confidence describes document readability; it does not prove that a selected patient is the document owner. Therefore, **every document requires staff review** before approval.

## Grounded knowledge and safety boundaries

The RAG layer indexes clinic-owned Markdown policy documents, embeds them with Cohere, retrieves from Pinecone, and reranks the best candidates before the assistant answers. Both staff and WhatsApp assistants use the same knowledge layer for policy-oriented questions.

- Answers cite the relevant source document naturally.
- Policy retrieval is not used for patient records or doctor availability; those use live operational tools.
- Clinical, diagnostic, medication, and treatment requests are refused and offered a human handoff.
- Human handoff is also available on explicit request or when the assistant cannot confidently complete a patient request.

## Technology

| Layer | Technology |
| --- | --- |
| Staff frontend | React, Vite, React Router, React Markdown, Lucide |
| API | Node.js, Express |
| Database | MongoDB with Mongoose |
| Agent orchestration | LangGraph + LangChain tools + Groq-hosted model |
| Retrieval | Pinecone, Cohere embeddings and reranking |
| Document processing | Tesseract.js, PDF parsing, structured LLM extraction |
| Messaging | Twilio WhatsApp |
| Authentication | JWT + bcrypt password hashing |

## Data model

The operational model intentionally remains focused rather than becoming a full EHR.

- `Patient` — phone, name, date of birth, patient code, profile stage
- `StaffUser` — role-based dashboard identity
- `Doctor` — department, availability, doctor code
- `Appointment` — patient, doctor, time, status, origin
- `Document` — file reference, OCR result, extracted fields, confidence scores, review status
- `PendingConfirmation` — durable approval queue for patient-originated changes
- `ConversationLog` — WhatsApp history, escalation, claim, and resolution state
- `PipelineStage` — current workflow stage and history
- `AgentSession` — staff-session-scoped assistant timeline
- `ConsentRecord` — privacy-aware schema foundation for a future consent layer

## Local setup

### Prerequisites

- Node.js 20+
- MongoDB instance
- Groq API key for the tool-calling model
- Twilio WhatsApp credentials for WhatsApp testing
- Pinecone and Cohere credentials for RAG

### 1. Install dependencies

```bash
cd server
npm install

cd ../client
npm install
```

### 2. Configure the server

Create `server/.env`:

```dotenv
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/careflow-console
JWT_SECRET=replace-with-a-long-random-secret
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

GROQ_API_KEY=your-groq-key
AGENT_MODEL=openai/gpt-oss-120b

COHERE_API_KEY=your-cohere-key
PINECONE_API_KEY=your-pinecone-key
PINECONE_INDEX_NAME=clinic-rag
PINECONE_CLOUD=aws
PINECONE_REGION=us-east-1

TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_WHATSAPP_FROM=whatsapp:+your-twilio-number
PUBLIC_WEBHOOK_URL=https://your-public-url/api/whatsapp/webhook
```

`PUBLIC_WEBHOOK_URL` and Twilio credentials are optional for dashboard-only development, but should be set whenever the webhook is exposed. Signature validation is intentionally bypassed only when those local-development values are absent.

### 3. Ingest the knowledge base

Add or edit the clinic policy Markdown files in `server/src/rag/documents`, then run:

```bash
cd server
node src/rag/ingest.js
```

The script creates the configured Pinecone index when needed and upserts the document chunks.

### 4. Start the application

In separate terminals:

```bash
# API
cd server
node src/server.js

# Staff dashboard
cd client
npm run dev
```

The dashboard is served by Vite at `http://localhost:5173` and the API defaults to `http://localhost:5000`. To point the dashboard at a deployed API, set `VITE_API_BASE_URL` in the client environment.

### 5. Configure WhatsApp testing

Expose the API with a public HTTPS tunnel, set `PUBLIC_WEBHOOK_URL` to the exact `/api/whatsapp/webhook` URL, and configure that URL as the incoming-message webhook in Twilio. The included `server/scripts/start-tunnel.js` can create an ngrok ingress when `NGROK_AUTHTOKEN` is configured.

## Demo path

1. Create the first staff admin at `/setup`, then sign in.
2. Add doctors and patients from the dashboard.
3. Ask the Operations assistant to find appointments, then propose a reschedule or cancellation and approve it from the confirmation card.
4. Upload an insurance card, referral, or lab report; inspect the OCR fields in Referral review and approve or reject it.
5. View the patient's stage in Patient pipeline and the live work summary in Operations brief.
6. Send a WhatsApp policy question, appointment request, document, or “hand me off to staff” message to demonstrate the patient channel.
7. Claim the resulting conversation in Handoff inbox or approve a patient appointment request in Confirmation queue.

## Production considerations

This is a portfolio-grade demonstration built with synthetic data. It intentionally does not claim production healthcare compliance.

A real deployment should add, at minimum:

- formal privacy, security, retention, and audit-log controls
- role and tenant isolation appropriate to the organisation
- encrypted storage and secrets management
- verified identity and consent processes appropriate to each channel
- reliable job queues, retries, observability, and delivery monitoring
- vendor review and contractual controls for all AI, OCR, vector, and messaging providers
- clinical governance and escalation procedures

The current architecture is designed to make these additions practical: actions are explicit tools, approvals are durable records, conversation and document states are separated, and shared services are already behind a single backend boundary.

## Scope boundary

Careflow Console supports operational coordination only. It does not make clinical decisions, interpret results, diagnose conditions, prescribe medication, or replace a clinician.
