const express = require('express');
const router = express.Router();
const patientPortalService = require('../services/patientPortalService');
const rateLimit = require('express-rate-limit');

// TODO: 配置限流器，设置 windowMs 为 1 分钟（即 60000 毫秒），max 设为 5（每分钟最多查 5 次）
// message 可以提示: "Too many requests from this IP, please try again after a minute."
const portalLimiter = rateLimit({
  windowMs: 0, // TODO: 填入一分钟的毫秒数
  max: 0,      // TODO: 填入最大请求次数
  message: ""  // TODO: 填入超限后的提示信息
});

// GET /status (e.g. GET /api/patient-portal/status?mrn=MRN001)
// 注意：在这里挂载 portalLimiter 中间件，保护这个敏感/对外的接口
router.get('/status', portalLimiter, (req, res) => {
    const mrn = req.query.mrn;
    if (!mrn) {
      return res.status(400).json({ error: 'Missing mrn', hint: 'Use ?mrn=YOUR_MRN' });
    }

    const status = patientPortalService.getStatusForPatient(mrn);
    if (!status) {
      return res.status(404).json({ error: 'Not found', message: 'No record for this MRN. Please check and try again.' });
    }
    res.json(status);
  });

module.exports = router;
