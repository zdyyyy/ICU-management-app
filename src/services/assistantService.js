const { OpenAI } = require('openai');
const bedService = require('./bedService');
const triageService = require('./triageService');
const waitlistService = require('./waitlistService');
const config = require('../config');

// Initialize OpenAI client
// Note: It expects OPENAI_API_KEY in process.env or explicitly passed
const openai = new OpenAI({
  apiKey: config.openaiApiKey,
});

// Avoid "ByteString" error on Windows when request body contains Unicode (e.g. Chinese).
// (Previous: no toByteSafe; direct use of systemPrompt and question caused ByteString error.)
function toByteSafe(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[\u0100-\uFFFF]/g, '?');
}

/**
 * Ask the Assistant a question based on current ICU context (Real-time RAG)
 */
async function askAssistant(question) {
  const availableBeds = bedService.getAvailableBeds();
  const waitlistData = waitlistService.getWaitlist(true);
  const rankedWaitlist = triageService.sortWaitlist(waitlistData);

  let systemPrompt = `
You are an intelligent Assistant for the ICU Head Nurse. 
Your goal is to help make decisions based on the REAL-TIME data provided below.

=== CURRENT ICU STATUS ===
Available Beds:
${JSON.stringify(availableBeds, null, 2)}

Ranked Waitlist (Top priority patients first):
${JSON.stringify(rankedWaitlist.slice(0, 5), null, 2)} // Only show top 5 to save tokens

=== INSTRUCTIONS ===
- Answer the user's question accurately based ONLY on the data above.
- Be concise, professional, and act as a clinical operational assistant.
- Do not hallucinate patients or beds that are not in the data.
  `;
  // Previous (caused ByteString error on Windows with Unicode):
  // const response = await openai.chat.completions.create({
  //   model: 'gpt-4o-mini',
  //   messages: [
  //     { role: 'system', content: systemPrompt },
  //     { role: 'user', content: question }
  //   ],
  //   temperature: 0.2,
  // });
  // return response.choices[0].message.content;
  systemPrompt = toByteSafe(systemPrompt);
  const safeQuestion = toByteSafe(question);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // or 'gpt-3.5-turbo'
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: safeQuestion }
      ],
      temperature: 0.2, // Low temperature for more factual responses
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("[Assistant Error]", error.message);
    // Previous: throw new Error("Failed to communicate with the Assistant AI.");
    const msg = process.env.NODE_ENV === 'development' ? error.message : "Failed to communicate with the Assistant AI.";
    throw new Error(msg);
  }
}

module.exports = {
  askAssistant
};