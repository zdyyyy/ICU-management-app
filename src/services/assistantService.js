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

/**
 * Ask the Assistant a question based on current ICU context (Real-time RAG)
 */
async function askAssistant(question) {
  // Fetch all the real-time context from our systems
  const availableBeds = bedService.getAvailableBeds();
  const waitlistData = waitlistService.getWaitlist(true); // Waitlist with patient details
  const rankedWaitlist = triageService.sortWaitlist(waitlistData); // Ranked by priority

  // Build a prompt with the retrieved data
  const systemPrompt = `
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

  try {
    // Generation: Send to LLM
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // or 'gpt-3.5-turbo' if 4o-mini is not available
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question }
      ],
      temperature: 0.2, // Low temperature for more factual responses
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("[Assistant Error]", error.message);
    throw new Error("Failed to communicate with the Assistant AI.");
  }
}

module.exports = {
  askAssistant
};