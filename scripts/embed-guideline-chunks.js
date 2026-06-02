// Node.js file system APIs.
const fs = require('fs');
// Node.js path helper utilities.
const path = require('path');
// Official OpenAI SDK client.
const { OpenAI } = require('openai');

// Resolve repository root from scripts folder.
const PROJECT_ROOT = path.resolve(__dirname, '..');
// Directory containing all guideline processing artifacts.
const GUIDELINES_DIR = path.join(PROJECT_ROOT, 'data', 'guidelines');
// Chunk input file (text chunks produced by chunk builder).
const INPUT_JSONL_PATH = path.join(GUIDELINES_DIR, 'chunks.jsonl');
// Embedded output file (chunks + embedding vectors).
const OUTPUT_JSONL_PATH = path.join(GUIDELINES_DIR, 'chunks.embedded.jsonl');

// Embedding model can be overridden from env.
const EMBEDDING_MODEL = process.env.GUIDELINE_EMBEDDING_MODEL || 'text-embedding-3-small';
// API batch size (trade-off: speed vs request payload size).
const BATCH_SIZE = 40;

// Read a JSONL file into array of objects.
function readJsonLines(filePath) {
  // Validate file exists before reading.
  if (!fs.existsSync(filePath)) {
    throw new Error(`Chunks file not found: ${filePath}`);
  }

  // Read text, split by lines, ignore blanks, parse JSON per line.
  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

// Parse optional CLI args: --limit and --offset.
function parseArgs() {
  // Small helper to get value from --name=value pattern.
  const getArg = (name) => {
    // Find matching CLI arg.
    const arg = process.argv.find((v) => v.startsWith(`${name}=`));
    // Return suffix value or empty string if absent.
    return arg ? arg.slice(name.length + 1) : '';
  };

  // Optional max number of chunks to embed.
  const limitRaw = getArg('--limit');
  // Optional number of chunks to skip from the start.
  const offsetRaw = getArg('--offset');

  // Convert strings to numbers with sensible defaults.
  return {
    limit: limitRaw ? Number(limitRaw) : null,
    offset: offsetRaw ? Number(offsetRaw) : 0,
  };
}

// Apply offset/limit selection on loaded chunk rows.
function pickInputRows(rows, options) {
  // Only accept positive finite offsets.
  const start = Number.isFinite(options.offset) && options.offset > 0 ? options.offset : 0;
  // Drop first N rows if offset is provided.
  const sliced = rows.slice(start);
  // If no valid limit, return all remaining rows.
  if (!Number.isFinite(options.limit) || options.limit <= 0) return sliced;
  // Otherwise return first limit rows.
  return sliced.slice(0, options.limit);
}

// Generator that yields consecutive array slices.
function* chunkArray(items, size) {
  // Walk list in fixed-size windows.
  for (let i = 0; i < items.length; i += size) {
    // Yield one batch.
    yield items.slice(i, i + size);
  }
}

// Main embedding routine.
async function main() {
  // API key is required to call embeddings endpoint.
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required for embedding generation.');
  }

  // Parse CLI options.
  const options = parseArgs();
  // Load all chunk records.
  const allRows = readJsonLines(INPUT_JSONL_PATH);
  // Apply optional offset/limit.
  const rows = pickInputRows(allRows, options);
  // Guard against empty input after filtering.
  if (!rows.length) {
    throw new Error('No chunks selected for embedding.');
  }

  // Initialize OpenAI client with env API key.
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  // Keep output lines in memory then write once at end.
  const outputLines = [];
  // Progress counter for logs.
  let processed = 0;

  // Iterate in batches to improve throughput.
  for (const batch of chunkArray(rows, BATCH_SIZE)) {
    // API accepts array of strings as embedding input.
    const input = batch.map((row) => row.text);
    // Request embeddings for this batch.
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input,
    });

    // Merge returned vectors back into original chunk rows.
    response.data.forEach((item, index) => {
      // Original source chunk for this embedding result.
      const source = batch[index];
      // Output payload extends source metadata.
      const payload = {
        ...source,
        embedding_model: EMBEDDING_MODEL,
        embedding: item.embedding,
      };
      // Store as JSON line string.
      outputLines.push(JSON.stringify(payload));
    });

    // Update progress and print status.
    processed += batch.length;
    console.log(`Embedded ${processed}/${rows.length} chunks`);
  }

  // Persist final embedded JSONL file.
  fs.writeFileSync(OUTPUT_JSONL_PATH, `${outputLines.join('\n')}\n`, 'utf8');
  // Final summary logs.
  console.log(`\nWrote embedded chunks: ${OUTPUT_JSONL_PATH}`);
  console.log(`Rows: ${outputLines.length}`);
}

// Top-level error handling.
main().catch((error) => {
  // Print concise failure reason.
  console.error(`Embedding job failed: ${error.message}`);
  // Return failure code to shell/CI.
  process.exitCode = 1;
});
