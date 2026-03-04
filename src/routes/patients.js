// Import Express web framework
const express = require('express');
// Create a router for patient CRUD endpoints (e.g. mounted at /api/patients)
const router = express.Router();
// Import shared store (patients array) and id() for generating new patient IDs
const { store, id } = require('../store');

// GET / (e.g. GET /api/patients) — return all patients
router.get('/', (req, res) => {
  res.json(store.patients);
});

// GET /:id (e.g. GET /api/patients/xyz) — return one patient by ID
router.get('/:id', (req, res) => {
  // Find patient whose id matches the URL param
  const p = store.patients.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Patient not found' });
  res.json(p);
});

// POST / (e.g. POST /api/patients) — create a new patient
router.post('/', (req, res) => {
  const body = req.body;
  const patient = {
    id: id(),
    name: body.name || 'Unknown',
    mrn: body.mrn || '',                                    // Medical record number (for patient portal lookup)
    priorityLevel: body.priorityLevel || 'MEDIUM',           // Triage priority
    requiredBedType: body.requiredBedType || 'GENERAL',     // e.g. GENERAL, ICU
    arrivalTime: body.arrivalTime || new Date().toISOString(),
    status: 'WAITING',                                      // WAITING, ASSIGNED, etc.
    notes: body.notes || ''
  };
  store.patients.push(patient);
  res.status(201).json(patient);
});

// PATCH /:id (e.g. PATCH /api/patients/xyz) — partially update a patient (only allowed fields)
router.patch('/:id', (req, res) => {
  const p = store.patients.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Patient not found' });
  // Whitelist: only these keys from req.body are applied (prevents changing id, mrn, etc.)
  const allowed = ['name', 'priorityLevel', 'requiredBedType', 'status', 'notes'];
  allowed.forEach(k => { if (req.body[k] !== undefined) p[k] = req.body[k]; });
  res.json(p);
});

// Export router for app.js (e.g. app.use('/api/patients', require('./routes/patients')))
module.exports = router;
