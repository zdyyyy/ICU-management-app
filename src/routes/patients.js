const express = require('express');
const router = express.Router();
const { store, id } = require('../store');

router.get('/', (req, res) => {
  res.json(store.patients);
});

router.get('/:id', (req, res) => {
  const p = store.patients.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Patient not found' });
  res.json(p);
});

router.post('/', (req, res) => {
  const body = req.body;
  const patient = {
    id: id(),
    name: body.name || 'Unknown',
    mrn: body.mrn || '',
    priorityLevel: body.priorityLevel || 'MEDIUM',
    requiredBedType: body.requiredBedType || 'GENERAL',
    arrivalTime: body.arrivalTime || new Date().toISOString(),
    status: 'WAITING',
    notes: body.notes || ''
  };
  store.patients.push(patient);
  res.status(201).json(patient);
});

router.patch('/:id', (req, res) => {
  const p = store.patients.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Patient not found' });
  const allowed = ['name', 'priorityLevel', 'requiredBedType', 'status', 'notes'];
  allowed.forEach(k => { if (req.body[k] !== undefined) p[k] = req.body[k]; });
  res.json(p);
});

module.exports = router;
