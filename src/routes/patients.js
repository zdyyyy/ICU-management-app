const express = require('express');
const router = express.Router();
const patientService = require('../services/patientService');

router.get('/', (req, res) => {
  res.json(patientService.getPatients());
});

router.get('/:id', (req, res) => {
  const patient = patientService.getPatientById(req.params.id);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  return res.json(patient);
});

router.post('/', (req, res) => {
  const patient = patientService.createPatient(req.body);
  if (!patient) return res.status(501).json({ error: 'failed to create patient' });
  return res.status(201).json(patient);
});

router.patch('/:id', (req, res) => {
  const body = { ...(req.body || {}) };
  if (req.query.mrn !== undefined) body.mrn = req.query.mrn;
  if (Object.keys(body).length === 0) {
    console.warn('[PATCH /api/patients] empty body - use ?mrn=1 in URL or send JSON body');
  } else {
    console.log('[PATCH /api/patients] body:', JSON.stringify(body));
  }
  const patient = patientService.updatePatient(req.params.id, body);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  res.json(patient);
});

module.exports = router;
