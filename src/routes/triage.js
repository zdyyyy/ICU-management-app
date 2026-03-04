// Import Express web framework
const express = require('express');
// Create a router for triage-related endpoints (e.g. mounted at /api/triage)
const router = express.Router();
// Import shared store (patients, waitlist)
const { store } = require('../store');
// Service that computes priority scores and sorts waitlist
const triageService = require('../services/triageService');

// GET /priority-levels — return list of valid priority levels from config (e.g. LOW, MEDIUM, HIGH, CRITICAL)
router.get('/priority-levels', (req, res) => {
  res.json(require('../config').priorityLevels);
});

// GET /score/:patientId — compute priority score for one patient (used for triage ordering)
router.get('/score/:patientId', (req, res) => {
  const patient = store.patients.find(p => p.id === req.params.patientId);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  const score = triageService.computePriority(patient);
  res.json({ patientId: patient.id, priorityScore: score });
});

// GET /waitlist-ranked — return waitlist entries with patient data, sorted by priority (highest first)
router.get('/waitlist-ranked', (req, res) => {
  // Map each waitlist entry to include full patient object, then sort by triage logic
  const ranked = triageService.sortWaitlist(store.waitlist.map(w => {
    const p = store.patients.find(x => x.id === w.patientId);
    return { ...w, ...p };
  }));
  res.json(ranked);
});

// Export router for app.js (e.g. app.use('/api/triage', require('./routes/triage')))
module.exports = router;
