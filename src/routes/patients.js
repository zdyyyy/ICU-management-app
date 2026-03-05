const express = require('express');
const router = express.Router();
const patientService = require('../services/patientService');

router.get('/', (req, res) => {
  // TODO: res.json(patientService.getPatients())
  res.json(patientService.getPatients());
});

router.get('/:id', (req, res) => {
  // TODO: patient = patientService.getPatientById(req.params.id)；没有则 404，有则 res.json(patient)
  const patient = patientService.getPatientById(req.params.id);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  return res.json(patient);
});

router.post('/', (req, res) => {
  // TODO: patient = patientService.createPatient(req.body)；res.status(201).json(patient)
  const patient = patientService.createPatient(req.body);
  if (!patient) return res.status(501).json({ error: 'failed to create patient' });
  return res.status(201).json(patient);
});

router.patch('/:id', (req, res) => {
  // TODO: patient = patientService.updatePatient(req.params.id, req.body)；失败 404，成功 res.json(patient)
  const patient = patientService.updatePatient(req.params.id, req.body);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  res.json(patient);
});

module.exports = router;
