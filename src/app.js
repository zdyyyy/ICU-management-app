const express = require('express');
const cors = require('cors');
const config = require('./config');

const bedsRouter = require('./routes/beds');
const patientsRouter = require('./routes/patients');
const waitlistRouter = require('./routes/waitlist');
const triageRouter = require('./routes/triage');
const patientPortalRouter = require('./routes/patientPortal');
const assistantRouter = require('./routes/assistant');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.type('html').send(`
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>ICU Resource Manager</title></head>
<body style="font-family: system-ui; max-width: 600px; margin: 2rem auto; padding: 0 1rem;">
  <h1>ICU Resource Manager</h1>
  <p>API is running.</p>
  <ul>
    <li><a href="/api/health">/api/health</a> – health check</li>
  </ul>
</body>
</html>
  `);
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'icu-resource-manager' });
});

app.use('/api/beds', bedsRouter);
app.use('/api/patients', patientsRouter);
app.use('/api/waitlist', waitlistRouter);
app.use('/api/triage', triageRouter);
app.use('/api/patient-portal', patientPortalRouter);
app.use('/api/assistant', assistantRouter);

module.exports = app;
