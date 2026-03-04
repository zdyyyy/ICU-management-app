// Import Express web framework
const express = require('express');
// Create a router for waitlist and bed-suggestion endpoints (e.g. mounted at /api/waitlist)
const router = express.Router();
// Import shared store (waitlist, patients) and id() for new waitlist entry IDs
const { store, id } = require('../store');
// Service that suggests which patient should get the next available bed
const suggestionService = require('../services/suggestionService');

// GET / (e.g. GET /api/waitlist) — list all waitlist entries with patient details attached
router.get('/', (req, res) => {
  // Helper: add full patient object to each waitlist entry (so frontend has name, MRN, etc.)
  const withPatient = waitlist => waitlist.map(w => ({
    ...w,
    patient: store.patients.find(p => p.id === w.patientId)
  }));
  res.json(withPatient(store.waitlist));
});

// POST /add — add a patient to the waitlist (body: { patientId })
router.post('/add', (req, res) => {
  const { patientId } = req.body;
  if (!patientId) return res.status(400).json({ error: 'patientId required' });
  const patient = store.patients.find(p => p.id === patientId);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  // Prevent duplicate: patient must not already be on waitlist
  if (store.waitlist.some(w => w.patientId === patientId)) {
    return res.status(400).json({ error: 'Patient already on waitlist' });
  }
  const entry = {
    id: id(),
    patientId,
    arrivalTime: new Date().toISOString(),
    addedAt: new Date().toISOString()
  };
  store.waitlist.push(entry);
  res.status(201).json(entry);
});

// POST /remove — remove a patient from the waitlist (body: { patientId })
router.post('/remove', (req, res) => {
  const { patientId } = req.body;
  const idx = store.waitlist.findIndex(w => w.patientId === patientId);
  if (idx === -1) return res.status(404).json({ error: 'Not on waitlist' });
  // splice(idx, 1) removes one element at index idx
  store.waitlist.splice(idx, 1);
  res.json({ removed: patientId });
});

// GET /next-bed-suggestion — get single suggestion: which patient should get the next bed (if any)
router.get('/next-bed-suggestion', (req, res) => {
  const one = suggestionService.getNextBedSuggestion();
  if (!one) {
    return res.json({
      suggestion: null,
      suggestions: [],
      message: store.waitlist.length ? 'No bed available for waitlist' : 'Waitlist empty'
    });
  }
  res.json({
    suggestion: one,
    suggestions: [one],
    message: 'Bed available for highest priority patient'
  });
});

// GET /next-bed-suggestions — get up to N patient–bed suggestions (?limit=5, max 20)
router.get('/next-bed-suggestions', (req, res) => {
  // Parse ?limit=5; default 5, cap at 20 to avoid huge responses
  const limit = Math.min(parseInt(req.query.limit, 10) || 5, 20);
  const suggestions = suggestionService.getNextBedSuggestions(limit);
  res.json({
    suggestions,
    count: suggestions.length,
    message: suggestions.length ? `${suggestions.length} patient-bed suggestion(s)` : 'No matching patient-bed pairs'
  });
});

// Export router for app.js (e.g. app.use('/api/waitlist', require('./routes/waitlist')))
module.exports = router;
