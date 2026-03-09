const express = require('express');
const router = express.Router();
const { store } = require('../store');
const triageService = require('../services/triageService');
const config = require('../config');

router.get('/priority-levels', (req, res) => {
  res.json(config.priorityLevels);
});

router.get('/score/:patientId', (req, res) => {
  const patient = store.patients.find(p => p.id === req.params.patientId);
  if(!patient) return res.status(404).json({ message: 'Patient not found'});
  const priorityScore = triageService.computePriority(patient);
  return res.json({ patientId: patient.id, priorityScore: priorityScore });
});

router.get('/waitlist-ranked', (req, res) => {
  const waitlist = store.waitlist.map(w => {
    const patient = store.patients.find(p => p.id === w.patientId);
    return {...w, patient: patient || null};
  });
  const sortedWaitlist = triageService.sortWaitlist(waitlist);
  res.json(sortedWaitlist);
});

module.exports = router;
