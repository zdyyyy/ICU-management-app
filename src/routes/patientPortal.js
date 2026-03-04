// Import Express web framework
const express = require('express');
// Create a router for patient-facing endpoints (often mounted at /api/patient-portal)
const router = express.Router();
// Service that returns safe, minimal status for patients (no internal IDs or staff notes)
const patientPortalService = require('../services/patientPortalService');

/**
 * Patient-facing API: look up status by MRN (medical record number).
 * GET /api/patient-portal/status?mrn=MRN001
 * Response is minimal and safe for patient display (no internal IDs, no staff notes).
 */
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

// Export router for use in app.js (e.g. app.use('/api/patient-portal', require('./routes/patientPortal')))
module.exports = router;
