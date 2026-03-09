const express = require('express');
const router = express.Router();
const patientPortalService = require('../services/patientPortalService');


  router.get('/status', (req, res) => {
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
