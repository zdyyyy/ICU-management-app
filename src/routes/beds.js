const express = require('express');
const router = express.Router();
const { store, id } = require('../store');
const bedService = require('../services/bedService');

router.get('/', (req, res) => {
  const availableOnly = req.query.available === 'true';
  let beds = store.beds;
  if (availableOnly) beds = bedService.getAvailableBeds();
  res.json(beds);
});

router.get('/available', (req, res) => {
  const byType = req.query.type || null;
  const beds = bedService.getAvailableBeds(byType);
  res.json(beds);
});

router.get('/:id', (req, res) => {
  const bed = bedService.getBedById(req.params.id);
  if (!bed) return res.status(404).json({ error: 'Bed not found' });
  res.json(bed);
});

router.post('/', (req, res) => {
  // TODO: 从 req.body 取 label、type（缺省 label 用 'Bed-xxx', type 用 'GENERAL'）
  // 构造床对象 { id: id(), label, type, status: 'AVAILABLE', patientId: null, occupiedAt: null }，store.beds.push(bed)，res.status(201).json(bed)
  const body = req.body;
  const bed = {
    id: id(),
    label: body.label || `Bed-${store.beds.length + 1}`,
    type: body.type || 'GENERAL',
    status: 'AVAILABLE',
    patientId: null,
    occupiedAt: null,
  }
  store.beds.push(bed)
  res.status(201).json(bed);
});

router.post('/:id/assign', (req, res) => {
  // TODO: patientId = req.body.patientId，没有则 res.status(400).json({ error: 'patientId required' })
  // bed = bedService.assignPatientToBed(req.params.id, patientId)，失败则 400，成功 res.json(bed)
  const patientId = req.body.patientId
  if (!patientId) return res.status(400).json({error: 'patientId required'});
  const bed = bedService.assignPatientToBed(req.params.id, patientId);
  if (!bed) return res.status(400).json({ error: 'Bed not available or not found' });
  return res.json(bed);
});

router.post('/:id/release', (req, res) => {
  // TODO: bed = bedService.releaseBed(req.params.id)，失败则 404，成功 res.json(bed)
  const bed = bedService.releaseBed(req.params.id);
  if (!bed) return res.status(404).json({error: 'Bed not found'});
  return res.json(bed);
});

module.exports = router;
