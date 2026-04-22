const { OpenAI } = require('openai');
const pubmedClient = require('./pubmedClient');
const config = require('../config');

const openai = new OpenAI({
  apiKey: config.openaiApiKey,
});

function toByteSafe(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[\u0100-\uFFFF]/g, '?');
}

async function buildPubMedSearchQuery(userQuestion) {
  const q = toByteSafe(userQuestion).slice(0, 2000);
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'You convert a user\'s medical literature question into a concise PubMed search query. ' +
          'Output ONLY the query string: English keywords and MeSH-style terms when helpful, no quotes around the whole query, no explanation. ' +
          'If the user wrote in another language, translate concepts to English for PubMed.',
      },
      { role: 'user', content: q },
    ],
    temperature: 0.1,
    max_tokens: 120,
  });
  const text = response.choices[0]?.message?.content?.trim();
  return text || q;
}

function formatContextForPrompt(articles) {
  return articles
    .map((a, i) => {
      const abs = a.abstract || '(No abstract in PubMed for this entry.)';
      return `[${i + 1}] PMID:${a.pmid}\nTitle: ${a.title}\nAbstract:\n${abs}`;
    })
    .join('\n\n---\n\n');
}

async function answerFromRetrievedPapers(userQuestion, articles) {
  const ctx = formatContextForPrompt(articles);
  const safeQ = toByteSafe(userQuestion);
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'You are a medical literature assistant. Answer using ONLY the PubMed article excerpts provided below. ' +
          'If the excerpts do not support a claim, say you cannot infer it from these papers. ' +
          'Cite PMIDs in square brackets like [PMID 12345678] when you rely on a source. ' +
          'Be concise and structured. This is for research literacy, not patient-specific medical advice.',
      },
      {
        role: 'user',
        content: `Question:\n${safeQ}\n\n--- Retrieved PubMed excerpts ---\n${ctx}`,
      },
    ],
    temperature: 0.2,
  });
  return response.choices[0]?.message?.content?.trim() || '';
}

/**
 * RAG-style Q&A: PubMed search → fetch abstracts → grounded answer.
 */
async function askLiterature(userQuestion) {
  const searchQuery = await buildPubMedSearchQuery(userQuestion);
  const pool = await pubmedClient.searchPubMed(searchQuery, {
    retmax: config.literatureSearchPoolSize,
  });
  const selected = pool.slice(0, config.literatureMaxArticles);
  const articles = await pubmedClient.fetchArticlesByPmids(selected);

  if (!articles.length) {
    return {
      answer:
        'No PubMed articles were retrieved for this query. Try broader keywords or check the suggested search string and try again.',
      searchQuery,
      pmids: [],
      disclaimer:
        'Information is derived from PubMed metadata and is not a substitute for professional medical advice.',
    };
  }

  const answer = await answerFromRetrievedPapers(userQuestion, articles);
  return {
    answer,
    searchQuery,
    pmids: articles.map((a) => a.pmid),
    articles: articles.map((a) => ({
      pmid: a.pmid,
      title: a.title,
      hasAbstract: Boolean(a.abstract),
    })),
    disclaimer:
      'This answer is generated from retrieved PubMed abstracts/metadata for research and education only; it is not medical advice.',
  };
}

module.exports = {
  askLiterature,
};
