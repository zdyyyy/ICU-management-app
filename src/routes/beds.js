// Import Express: the web framework used to build the API
const express = require('express');
// Create a Router: a mini-app that handles routes; will be mounted in app.js (e.g. at /api/beds)
const router = express.Router();
// Import shared in-memory store (beds array) and id() for generating new IDs
const { store, id } = require('../store');
// Import service that contains bed business logic (available beds, assign, release)
const bedService = require('../services/bedService');

// GET / (e.g. GET /api/beds) — list all beds, or only available ones if ?available=true
router.get('/', (req, res) => {
  // req.query.available is from URL like /api/beds?available=true
  const availableOnly = req.query.available === 'true';
  // Start with all beds from the store
  let beds = store.beds;
  // If client asked for available only, filter via service
  if (availableOnly) beds = bedService.getAvailableBeds();
  // Send JSON response with the beds array
  res.json(beds);
});

// GET /available (e.g. GET /api/beds/available) — list only available beds, optionally by type
router.get('/available', (req, res) => {
  // Optional: ?type=ICU or type=GENERAL to filter by bed type
  const byType = req.query.type || null;
  const beds = bedService.getAvailableBeds(byType);
  res.json(beds);
});

// GET /:id (e.g. GET /api/beds/abc123) — get a single bed by ID
router.get('/:id', (req, res) => {
  // req.params.id is the value from the URL path (e.g. abc123)
  const bed = bedService.getBedById(req.params.id);
  // 404 = Not Found; return error JSON and stop
  if (!bed) return res.status(404).json({ error: 'Bed not found' });
  res.json(bed);
});

// POST / (e.g. POST /api/beds) — create a new bed (body: label, type)
router.post('/', (req, res) => {
  // req.body is the JSON sent in the request (e.g. { label: "Bed-5", type: "ICU" })
  const body = req.body;
  const bed = {
    id: id(),                                                    // Generate unique ID
    label: body.label || `Bed-${store.beds.length + 1}`,        // Display name or default
    type: body.type || 'GENERAL',                                // e.g. GENERAL, ICU
    status: 'AVAILABLE',                                         // New beds start available
    patientId: null,
    occupiedAt: null
  };
  store.beds.push(bed);
  // 201 = Created; convention for successful resource creation
  res.status(201).json(bed);
});

// POST /:id/assign (e.g. POST /api/beds/abc123/assign) — assign a patient to a bed
router.post('/:id/assign', (req, res) => {
  // Expect body like { patientId: "patient-xyz" }
  const { patientId } = req.body;
  if (!patientId) return res.status(400).json({ error: 'patientId required' });
  const bed = bedService.assignPatientToBed(req.params.id, patientId);
  if (!bed) return res.status(400).json({ error: 'Bed not available or not found' });
  res.json(bed);
});

// POST /:id/release (e.g. POST /api/beds/abc123/release) — release a bed (clear patient)
router.post('/:id/release', (req, res) => {
  const bed = bedService.releaseBed(req.params.id);
  if (!bed) return res.status(404).json({ error: 'Bed not found' });
  res.json(bed);
});

// Export the router so app.js can do: app.use('/api/beds', require('./routes/beds'))
module.exports = router;
