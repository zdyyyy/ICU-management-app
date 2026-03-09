const express = require('express');
const router = express.Router();
const patientPortalService = require('../services/patientPortalService');

// TODO: GET /status?mrn=xxx — 从 req.query.mrn 取 MRN；没有则 400；status = patientPortalService.getStatusForPatient(mrn)；没有则 404，有则 res.json(status)

  // GET /status (e.g. GET /api/patient-portal/status?mrn=MRN001)
  router.get('/status', (req, res) => {
    // MRN comes from query string: ?mrn=MRN001
    const mrn = req.query.mrn;
    if (!mrn) {
      // 400 = Bad Request when required parameter is missing
      return res.status(400).json({ error: 'Missing mrn', hint: 'Use ?mrn=YOUR_MRN' });
    }
    // Get patient-friendly status (bed, waitlist position, etc.) from service
    const status = patientPortalService.getStatusForPatient(mrn);
    if (!status) {
      // 404 = no record for this MRN
      return res.status(404).json({ error: 'Not found', message: 'No record for this MRN. Please check and try again.' });
    }
    res.json(status);
  });

module.exports = router;
