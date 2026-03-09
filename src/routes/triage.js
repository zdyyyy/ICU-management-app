const express = require('express');
const router = express.Router();
const { store } = require('../store');
const triageService = require('../services/triageService');
const config = require('../config');

// TODO: 返回 config.priorityLevels，供前端展示或校验
router.get('/priority-levels', (req, res) => {
  res.json(config.priorityLevels);
});

// TODO: 根据 req.params.patientId 找到病人，
// 用 triageService.computePriority(patient) 算分，返回 { patientId, priorityScore }；找不到 404
router.get('/score/:patientId', (req, res) => {
  // const patient = req.params.patientId
  const patient = store.patients.find(p => p.id === req.params.patientId);
  if(!patient) return res.status(404).json({ message: 'Patient not found'});
  const priorityScore = triageService.computePriority(patient);
  return res.json({ patientId: patient.id, priorityScore: priorityScore });
});

// TODO: 把 store.waitlist 每条拼上对应病人，用 triageService.sortWaitlist 排序后返回（分数高的在前）
router.get('/waitlist-ranked', (req, res) => {
  const waitlist = store.waitlist.map(w => {
    const patient = store.patients.find(p => p.id === w.patientId);
    return {...w, patient: patient || null};
  });
  const sortedWaitlist = triageService.sortWaitlist(waitlist);
  // res.json([sortedWaitlist]);  // 错误：sortedWaitlist 已是数组，再包一层会变成 [[...]]
  res.json(sortedWaitlist);
});

module.exports = router;
