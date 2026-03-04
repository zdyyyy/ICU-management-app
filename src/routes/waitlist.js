const express = require('express');
const router = express.Router();
const { store, id } = require('../store');
const suggestionService = require('../services/suggestionService');

router.get('/', (req, res) => {
  const withPatient = waitlist => waitlist.map(w => ({
    ...w,
    patient: store.patients.find(p => p.id === w.patientId)
  }));
  res.json(withPatient(store.waitlist));
});

router.post('/add', (req, res) => {
  const { patientId } = req.body;
  if (!patientId) return res.status(400).json({ error: 'patientId required' });
  const patient = store.patients.find(p => p.id === patientId);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
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

router.post('/remove', (req, res) => {
  const { patientId } = req.body;
  const idx = store.waitlist.findIndex(w => w.patientId === patientId);
  if (idx === -1) return res.status(404).json({ error: 'Not on waitlist' });
  store.waitlist.splice(idx, 1);
  res.json({ removed: patientId });
});

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

router.get('/next-bed-suggestions', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 5, 20);
  const suggestions = suggestionService.getNextBedSuggestions(limit);
  res.json({
    suggestions,
    count: suggestions.length,
    message: suggestions.length ? `${suggestions.length} patient-bed suggestion(s)` : 'No matching patient-bed pairs'
  });
});

module.exports = router;
