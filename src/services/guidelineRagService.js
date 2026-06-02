const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const config = require('../config');

const EMBEDDED_JSONL_PATH = path.join(
  __dirname,
  '..',
  '..',
  'data',
  'guidelines',
  'chunks.embedded.jsonl'
);
const QUERY_EMBEDDING_MODEL =
  process.env.GUIDELINE_EMBEDDING_MODEL || 'text-embedding-3-small';

let cache = {
  fileMtimeMs: 0,
  chunks: [],
};

const openai = new OpenAI({
  apiKey: config.openaiApiKey,
});

function readEmbeddedChunks() {
  if (!fs.existsSync(EMBEDDED_JSONL_PATH)) return [];

  const stat = fs.statSync(EMBEDDED_JSONL_PATH);
  if (cache.chunks.length > 0 && cache.fileMtimeMs === stat.mtimeMs) {
    return cache.chunks;
  }

  const lines = fs
    .readFileSync(EMBEDDED_JSONL_PATH, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const chunks = lines.map((line) => JSON.parse(line));
  cache = {
    fileMtimeMs: stat.mtimeMs,
    chunks,
  };
  return chunks;
}

function dot(a, b) {
  let total = 0;
  for (let i = 0; i < a.length; i += 1) {
    total += a[i] * b[i];
  }
  return total;
}

function magnitude(v) {
  let total = 0;
  for (let i = 0; i < v.length; i += 1) {
    total += v[i] * v[i];
  }
  return Math.sqrt(total);
}

function cosineSimilarity(a, b) {
  const denom = magnitude(a) * magnitude(b);
  if (!denom) return 0;
  return dot(a, b) / denom;
}

async function retrieveGuidelineEvidence(question, options = {}) {
  const topK = options.topK || 4;
  const minScore = options.minScore || 0.2;

  const chunks = readEmbeddedChunks();
  if (!chunks.length) {
    return {
      context: '',
      citations: [],
      reason: 'NO_EMBEDDED_CHUNKS',
    };
  }

  const queryEmbedding = await openai.embeddings.create({
    model: QUERY_EMBEDDING_MODEL,
    input: question,
  });
  const vector = queryEmbedding.data[0].embedding;
  const ranked = chunks
    .map((chunk) => ({
      ...chunk,
      score: cosineSimilarity(vector, chunk.embedding || []),
    }))
    .filter((chunk) => Number.isFinite(chunk.score) && chunk.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  const citations = ranked.map((item) => ({
    chunkId: item.chunk_id,
    title: item.title,
    fileName: item.file_name,
    page: item.page,
    publishDate: item.publish_date || '',
    version: item.version_or_revision || '',
    clinicalScope: item.clinical_scope || '',
    score: Number(item.score.toFixed(4)),
    excerpt: item.text.slice(0, 280),
  }));

  const contextBlocks = ranked.map((item, index) => {
    return [
      `[Guideline ${index + 1}]`,
      `Title: ${item.title}`,
      `File: ${item.file_name}`,
      `Page: ${item.page}`,
      `Publish Date: ${item.publish_date || 'unknown'}`,
      `Version: ${item.version_or_revision || 'unknown'}`,
      `Snippet: ${item.text}`,
    ].join('\n');
  });

  return {
    context: contextBlocks.join('\n\n'),
    citations,
    reason: ranked.length ? 'OK' : 'LOW_SIMILARITY_OR_EMPTY',
  };
}

module.exports = {
  retrieveGuidelineEvidence,
};
