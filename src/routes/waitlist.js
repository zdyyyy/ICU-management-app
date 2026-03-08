const express = require('express');
const router = express.Router();
const waitlistService = require('../services/waitlistService');

router.get('/', (req, res) => {
  const list = waitlistService.getWaitlist(true);
  res.json(list);
});

router.post('/add', (req, res) => {
  const patientId = req.body.patientId;
  if (!patientId) return res.status(400).json({ error: 'patientId required' });
  const entry = waitlistService.addToWaitlist(patientId);
  if (!entry) return res.status(400).json({ error: 'Patient not found or already on waitlist' });
  res.status(201).json(entry);
});

router.post('/remove', (req, res) => {
  const patientId = req.body.patientId;
  if (!patientId) return res.status(400).json({ error: 'patientId required' });
  const removed = waitlistService.removeFromWaitlist(patientId);
  if (!removed) return res.status(404).json({ error: 'Not on waitlist' });
  res.json({ removed: patientId, entry: removed });
});

module.exports = router;
