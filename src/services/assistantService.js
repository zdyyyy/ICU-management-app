const { OpenAI } = require('openai');
const bedService = require('./bedService');
const triageService = require('./triageService');
const waitlistService = require('./waitlistService');
const ragService = require('./ragService');
const config = require('../config');

const openai = new OpenAI({
  apiKey: config.openaiApiKey,
});

/**
 * ICU assistant: live bed/waitlist data + vector RAG over local knowledge/*.md
 */
async function askAssistant(question) {
  const availableBeds = bedService.getAvailableBeds();
  const waitlistData = waitlistService.getWaitlist(true);
  const rankedWaitlist = triageService.sortWaitlist(waitlistData);

  let ragSection = '(No protocol snippets retrieved.)';
  try {
    const ragChunks = await ragService.retrieveRelevantChunks(
      question,
      config.ragTopK
    );
    if (ragChunks.length) {
      ragSection = ragChunks
        .map((c, n) => `--- Snippet ${n + 1} ---\n${c}`)
        .join('\n\n');
    }
  } catch (err) {
    console.warn('[RAG]', err.message);
  }

  const systemPrompt = `
You are an intelligent Assistant for the ICU Head Nurse.
Your goal is to help make operational decisions using (1) LIVE system data and (2) retrieved policy/protocol excerpts when relevant.

=== CURRENT ICU STATUS (authoritative for beds, patients, and waitlist) ===
Available Beds:
${JSON.stringify(availableBeds, null, 2)}

Ranked Waitlist (top 5 by priority):
${JSON.stringify(rankedWaitlist.slice(0, 5), null, 2)}

=== RETRIEVED KNOWLEDGE (from local documents — use for policy framing, not for inventing patient/bed facts) ===
${ragSection}

=== INSTRUCTIONS ===
- For who gets which bed, counts, and patient order: rely ONLY on CURRENT ICU STATUS.
- Use RETRIEVED KNOWLEDGE to explain rationale, policy norms, or safety communication — without contradicting live data.
- Be concise and professional. Do not hallucinate patients or beds not present in CURRENT ICU STATUS.
  `;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question },
      ],
      temperature: 0.2,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('[Assistant Error]', error.message);
    const msg =
      config.env === 'development'
        ? error.message
        : 'Failed to communicate with the Assistant AI.';
    throw new Error(msg);
  }
}

module.exports = {
  askAssistant
};