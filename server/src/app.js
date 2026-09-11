const express = require('express');
const path = require('path');
const cors = require('cors');
const agentRoutes = require('./routes/agentRoutes');
const authRoutes = require('./routes/authRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const patientRoutes = require('./routes/patientRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');
const confirmationRoutes = require('./routes/confirmationRoutes');
const documentRoutes = require('./routes/documentRoutes');
const pipelineRoutes = require('./routes/pipelineRoutes');
const handoffRoutes = require('./routes/handoffRoutes');
const opsBriefRoutes = require('./routes/opsBriefRoutes');

const app = express();

// The staff SPA runs on Vite's development origin, while the API runs on
// port 5000. Browsers therefore require an explicit CORS response; Postman
// does not enforce this, which is why API-only tests still worked. Set
// CORS_ALLOWED_ORIGINS to a comma-separated list when deploying the client.
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Requests without an Origin header (health checks, Postman, server to
      // server calls) are not browser CORS requests and remain supported.
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Origin ${origin} is not allowed by CORS.`));
    },
  })
);

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/staff/auth', authRoutes);
app.use('/api/staff/agent', agentRoutes);
app.use('/api/staff/doctors', doctorRoutes);
app.use('/api/staff/patients', patientRoutes);
app.use('/api/staff/appointments', appointmentRoutes);
app.use('/api/staff/confirmations', confirmationRoutes);
app.use('/api/staff/documents', documentRoutes);
app.use('/api/staff/pipeline', pipelineRoutes);
app.use('/api/staff/handoffs', handoffRoutes);
app.use('/api/staff/ops-brief', opsBriefRoutes);
app.use('/api/whatsapp', whatsappRoutes);

module.exports = app;
