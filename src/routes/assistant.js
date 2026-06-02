const express = require('express');
const router = express.Router();
const assistantService = require('../services/assistantService');

// POST /api/assistant/ask
// Body: { "question": "Who should get the next ICU bed and why?" }
router.post('/ask', async (req, res) => {
  const { question } = req.body;
  
  if (!question) {
    return res.status(400).json({ error: 'Question is required' });
  }

  try {
    const result = await assistantService.askAssistant(question);
    if (typeof result === 'string') {
      return res.json({ answer: result, citations: [], rag: { reason: 'LEGACY_MODE' } });
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;