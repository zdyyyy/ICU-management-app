
const express = require('express');

const cors = require('cors');

const config = require('./config');

const { store, id } = require('./store');


const patientsRouter = require('./routes/patients');
const bedsRouter = require('./routes/beds');
const triageRouter = require('./routes/triage');
const waitlistRouter = require('./routes/waitlist');
const patientPortalRouter = require('./routes/patientPortal');


const app = express();


app.use(cors());

app.use(express.json());


app.get('/', (req, res) => {
  const port = config.port;
  
  res.type('html').send(`
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>ICU Resource Manager</title></head>
<body style="font-family: system-ui; max-width: 600px; margin: 2rem auto; padding: 0 1rem;">
  <h1>ICU Resource Manager</h1>
  <p>API is running. Use these endpoints:</p>
  <ul>
    <li><a href="/api/health">/api/health</a> – health check</li>
    <li><a href="/api/patients">/api/patients</a> – patients</li>
    <li><a href="/api/beds">/api/beds</a> – beds</li>
    <li><a href="/api/triage">/api/triage</a> – triage</li>
    <li><a href="/api/waitlist">/api/waitlist</a> – waitlist</li>
    <li><a href="/api/patient-portal">/api/patient-portal</a> – patient portal</li>
  </ul>
</body>
</html>
  `);
});


app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'icu-resource-manager' });
});


app.use('/api/patients', patientsRouter);
app.use('/api/beds', bedsRouter);
app.use('/api/triage', triageRouter);
app.use('/api/waitlist', waitlistRouter);
app.use('/api/patient-portal', patientPortalRouter);


if (config.env === 'development' && store.patients.length === 0) {
  
  store.patients = [
    { id: id(), name: 'Patient A', mrn: 'MRN001', priorityLevel: 'CRITICAL', requiredBedType: 'ICU', arrivalTime: new Date().toISOString(), status: 'WAITING', notes: '' },
    { id: id(), name: 'Patient B', mrn: 'MRN002', priorityLevel: 'URGENT', requiredBedType: 'ICU', arrivalTime: new Date(Date.now() - 3600000).toISOString(), status: 'WAITING', notes: '' },
    { id: id(), name: 'Patient C', mrn: 'MRN003', priorityLevel: 'HIGH', requiredBedType: 'GENERAL', arrivalTime: new Date().toISOString(), status: 'WAITING', notes: '' }
  ];
  
  store.beds = [
    { id: id(), label: 'ICU-1', type: 'ICU', status: 'AVAILABLE', patientId: null, occupiedAt: null },
    { id: id(), label: 'ICU-2', type: 'ICU', status: 'AVAILABLE', patientId: null, occupiedAt: null },
    { id: id(), label: 'GEN-1', type: 'GENERAL', status: 'AVAILABLE', patientId: null, occupiedAt: null }
  ];
  
  store.waitlist = store.patients.slice(0, 2).map(p => ({ id: id(), patientId: p.id, arrivalTime: p.arrivalTime, addedAt: new Date().toISOString() }));
  console.log('Seeded sample data for development.');
}


module.exports = app;
