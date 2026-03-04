const express = require('express');
const router = express.Router();
const { store } = require('../store');
const triageService = require('../services/triageService');

router.get('/priority-levels', (req, res) => {
  res.json(require('../config').priorityLevels);
});

router.get('/score/:patientId', (req, res) => {
  const patient = store.patients.find(p => p.id === req.params.patientId);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  const score = triageService.computePriority(patient);
  res.json({ patientId: patient.id, priorityScore: score });
});

router.get('/waitlist-ranked', (req, res) => {
  const ranked = triageService.sortWaitlist(store.waitlist.map(w => {
    const p = store.patients.find(x => x.id === w.patientId);
    return { ...w, ...p };
  }));
  res.json(ranked);
});

module.exports = router;
