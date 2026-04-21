const fs = require('fs').promises;
const path = require('path');
const { OpenAI } = require('openai');
const config = require('../config');

const KNOWLEDGE_DIR = path.join(__dirname, '..', '..', 'knowledge');
const CHUNK_SIZE = 900;
const CHUNK_OVERLAP = 120;

const openai = new OpenAI({ apiKey: config.openaiApiKey });

let cachedIndex = null;
let buildPromise = null;

function cosineSimilarity(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}


function chunkText(text, maxChunk = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const clean = text.replace(/\r\n/g, '\n').trim();
  if (!clean.length) return [];
  const chunks = [];
  let start = 0;
  while (start < clean.length) {
    const end = Math.min(start + maxChunk, clean.length);
    chunks.push(clean.slice(start, end));
    if (end === clean.length) break;
    start = end - overlap;
  }
  return chunks;
}

async function loadAllChunks() {
  let files;
  try {
    files = await fs.readdir(KNOWLEDGE_DIR);
  } catch (e) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }

  const chunks = [];
  const exts = ['.md', '.txt'];
  for (const file of files) {
    if (!exts.some((ext) => file.endsWith(ext))) continue;
    const full = path.join(KNOWLEDGE_DIR, file);
    const stat = await fs.stat(full);
    if (!stat.isFile()) continue;
    const content = await fs.readFile(full, 'utf8');
    const parts = chunkText(`[Source: ${file}]\n${content}`);
    chunks.push(...parts);
  }
  return chunks;
}

async function embedBatch(inputs) {
  if (!inputs.length) return [];
  const out = [];
  const batchSize = 64;
  for (let i = 0; i < inputs.length; i += batchSize) {
    const batch = inputs.slice(i, i + batchSize);
    const res = await openai.embeddings.create({
      model: config.ragEmbeddingModel,
      input: batch,
    });
    const ordered = [...res.data].sort((a, b) => a.index - b.index);
    for (const row of ordered) {
      out.push(row.embedding);
    }
  }
  return out;
}

async function buildIndex() {
  const chunks = await loadAllChunks();
  if (!chunks.length) {
    return { chunks: [], embeddings: [] };
  }
  const embeddings = await embedBatch(chunks);
  if (embeddings.length !== chunks.length) {
    throw new Error('RAG embedding count mismatch');
  }
  return { chunks, embeddings };
}

async function getIndex() {
  if (cachedIndex) return cachedIndex;
  if (!buildPromise) {
    buildPromise = buildIndex()
      .then((idx) => {
        cachedIndex = idx;
        return idx;
      })
      .finally(() => {
        buildPromise = null;
      });
  }
  return buildPromise;
}

/**
 * Returns top-k knowledge chunks most similar to the query (vector RAG).
 */
async function retrieveRelevantChunks(question, topK = config.ragTopK) {
  if (!question || typeof question !== 'string') return [];
  const idx = await getIndex();
  if (!idx.chunks.length) return [];

  const qRes = await openai.embeddings.create({
    model: config.ragEmbeddingModel,
    input: question,
  });
  const qEmb = qRes.data[0].embedding;

  const scored = idx.embeddings.map((emb, i) => ({
    i,
    score: cosineSimilarity(qEmb, emb),
  }));
  scored.sort((a, b) => b.score - a.score);
  const k = Math.min(topK, scored.length);
  return scored.slice(0, k).map((s) => idx.chunks[s.i]);
}

/** Preload embeddings so the first /assistant/ask is faster. */
async function warmup() {
  await getIndex();
}

module.exports = {
  retrieveRelevantChunks,
  warmup,
};
