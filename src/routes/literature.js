const express = require('express');
const rateLimit = require('express-rate-limit');
const literatureQAService = require('../services/literatureQAService');

const router = express.Router();

const literatureLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 8,
  message: { error: 'Too many literature requests. Please wait and try again.' },
});

// POST /api/literature/ask
// Body: { "question": "What is the evidence for low tidal volume in ARDS?" }
router.post('/ask', literatureLimiter, async (req, res) => {
  const { question } = req.body;

  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'question (string) is required' });
  }

  try {
    const result = await literatureQAService.askLiterature(question.trim());
    res.json(result);
  } catch (error) {
    console.error('[Literature QA]', error.message);
    const msg =
      process.env.NODE_ENV === 'development' ? error.message : 'Literature Q&A failed.';
    res.status(500).json({ error: msg });
  }
});

module.exports = router;
