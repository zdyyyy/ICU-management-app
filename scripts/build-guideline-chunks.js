// Node.js file system APIs.
const fs = require('fs');
// Node.js path utilities.
const path = require('path');
// PDF parser used to extract page text.
const { PDFParse } = require('pdf-parse');

// Resolve project root from scripts directory.
const PROJECT_ROOT = path.resolve(__dirname, '..');
// Folder containing guideline source/output files.
const GUIDELINES_DIR = path.join(PROJECT_ROOT, 'data', 'guidelines');
// Filtered metadata input (selected docs to chunk).
const INDEX_INPUT_PATH = path.join(GUIDELINES_DIR, 'index.for-indexing.csv');
// Final chunk output (JSON Lines).
const OUTPUT_JSONL_PATH = path.join(GUIDELINES_DIR, 'chunks.jsonl');

// Upper size bound for each chunk.
const MAX_CHUNK_CHARS = 1200;
// Lower preference threshold for chunk flushing.
const MIN_CHUNK_CHARS = 300;

// Parse one CSV line safely (supports quotes and escaped quotes).
function parseCsvLine(line) {
  // Parsed cell list.
  const values = [];
  // Current cell text buffer.
  let current = '';
  // Quote state flag.
  let inQuotes = false;

  // Character-by-character CSV parsing.
  for (let i = 0; i < line.length; i += 1) {
    // Current character.
    const ch = line[i];
    // Lookahead char (for escaped quote detection).
    const next = line[i + 1];

    // Handle quote controls.
    if (ch === '"') {
      // Escaped quote inside quoted field ("").
      if (inQuotes && next === '"') {
        // Append literal quote to current cell.
        current += '"';
        // Skip consumed escaped char.
        i += 1;
      } else {
        // Enter/exit quoted region.
        inQuotes = !inQuotes;
      }
      // Do not append control quote char itself.
      continue;
    }

    // Comma separates cells only when not inside quotes.
    if (ch === ',' && !inQuotes) {
      // Commit cell value.
      values.push(current);
      // Reset cell buffer.
      current = '';
      // Continue to next char.
      continue;
    }

    // Normal character appended to current cell.
    current += ch;
  }
  // Push final trailing cell.
  values.push(current);
  // Return parsed CSV cells.
  return values;
}

// Read index.for-indexing.csv into array of objects.
function readIndexRows(csvPath) {
  // Ensure file exists.
  if (!fs.existsSync(csvPath)) {
    throw new Error(`Index input file not found: ${csvPath}`);
  }

  // Read, split, trim, and drop blank lines.
  const lines = fs
    .readFileSync(csvPath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  // Need at least one data row plus header.
  if (lines.length < 2) {
    throw new Error(`Index input has no rows: ${csvPath}`);
  }

  // Parse header columns.
  const headers = parseCsvLine(lines[0]);
  // Convert each data line into row object.
  return lines.slice(1).map((line) => {
    // Parse this CSV line.
    const cols = parseCsvLine(line);
    // Output row map.
    const row = {};
    // Assign each header -> value.
    headers.forEach((header, idx) => {
      // Default missing values to empty string.
      row[header] = cols[idx] || '';
    });
    // Return normalized row.
    return row;
  });
}

// Normalize OCR/PDF text artifacts.
function cleanPageText(text) {
  // Replace CR with LF, remove trailing spaces, collapse gaps.
  return text
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

// Split page text into paragraph blocks.
function splitParagraphs(text) {
  // Paragraph boundary = blank line.
  return text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

// Ensure very long paragraph is split into max-sized pieces.
function splitLongParagraph(paragraph, maxChars) {
  // Fast path for normal-size paragraph.
  if (paragraph.length <= maxChars) return [paragraph];
  // Try sentence-aware splitting first.
  const sentences = paragraph
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  // If sentence split failed, fallback to fixed slicing.
  if (!sentences.length) {
    // Output slices.
    const parts = [];
    // Slice paragraph in maxChars windows.
    for (let i = 0; i < paragraph.length; i += maxChars) {
      parts.push(paragraph.slice(i, i + maxChars));
    }
    // Return fallback pieces.
    return parts;
  }

  // Sentence-aware packing into <= maxChars pieces.
  const parts = [];
  // Current piece buffer.
  let current = '';
  // Walk sentence list and accumulate.
  for (const sentence of sentences) {
    // Candidate if we append this sentence.
    const next = current ? `${current} ${sentence}` : sentence;
    // If too long, flush current piece.
    if (next.length > maxChars) {
      // Flush non-empty current.
      if (current) parts.push(current);
      // Extremely long single sentence fallback split.
      if (sentence.length > maxChars) {
        for (let i = 0; i < sentence.length; i += maxChars) {
          parts.push(sentence.slice(i, i + maxChars));
        }
        // Reset current because we fully consumed sentence.
        current = '';
      } else {
        // Start new piece with this sentence.
        current = sentence;
      }
    } else {
      // Safe to append.
      current = next;
    }
  }
  // Flush last buffered piece.
  if (current) parts.push(current);
  // Return split pieces.
  return parts;
}

// Build near-uniform chunks from paragraph pieces.
function buildChunksFromParagraphs(paragraphs, maxChars, minChars) {
  // Final output chunks.
  const chunks = [];
  // Current chunk buffer.
  let current = '';

  // Helper to trim and push current chunk if non-empty.
  const pushCurrent = () => {
    // Remove leading/trailing whitespace.
    const normalized = current.trim();
    // Skip empty chunk.
    if (!normalized) return;
    // Commit chunk.
    chunks.push(normalized);
    // Reset buffer.
    current = '';
  };

  // Process paragraph by paragraph.
  for (const paragraph of paragraphs) {
    // Further split oversized paragraphs.
    const pieces = splitLongParagraph(paragraph, maxChars);
    // Append each piece to current chunk when possible.
    for (const piece of pieces) {
      // Candidate chunk with paragraph separator.
      const candidate = current ? `${current}\n\n${piece}` : piece;
      // If candidate would exceed max, flush current first.
      if (candidate.length > maxChars) {
        pushCurrent();
        // Start new chunk with current piece.
        current = piece;
      } else {
        // Safe append.
        current = candidate;
      }

      // Optional early flush: keep chunk sizes balanced.
      if (current.length >= minChars && current.length >= Math.floor(maxChars * 0.7)) {
        pushCurrent();
      }
    }
  }
  // Flush trailing buffered chunk.
  pushCurrent();
  // Return all built chunks.
  return chunks;
}

// Extract cleaned text for every page of a PDF file.
async function extractPageTexts(pdfAbsolutePath) {
  // Load PDF bytes from disk.
  const data = fs.readFileSync(pdfAbsolutePath);
  // Initialize parser instance.
  const parser = new PDFParse({ data });
  // Extract all page text.
  const textResult = await parser.getText();
  // Release parser resources.
  await parser.destroy();

  // Guard if parser response format is unexpected.
  if (!Array.isArray(textResult.pages)) {
    return [];
  }

  // Convert parser page output to normalized format.
  return textResult.pages.map((page, idx) => ({
    // 1-based page numbers for human references.
    pageNumber: idx + 1,
    // Clean and normalize page text.
    text: cleanPageText(page.text || ''),
  }));
}

// Serialize one record as JSONL line.
function toJsonLine(record) {
  return JSON.stringify(record);
}

// Main chunk building pipeline.
async function main() {
  // Read selected docs list.
  const rows = readIndexRows(INDEX_INPUT_PATH);
  // Collect JSONL lines in memory.
  const jsonLines = [];
  // Total chunks across all docs.
  let totalChunks = 0;
  // Number of docs processed.
  let totalDocs = 0;

  // Process each selected guideline document.
  for (const row of rows) {
    // Absolute source PDF path from index CSV.
    const pdfPath = row.absolute_file_path;
    // Skip invalid/missing file paths.
    if (!pdfPath || !fs.existsSync(pdfPath)) {
      console.warn(`Skipping missing file: ${row.file_name}`);
      continue;
    }

    // Extract cleaned text page by page.
    const pages = await extractPageTexts(pdfPath);
    // Per-document chunk counter.
    let docChunkCount = 0;

    // Build chunks for each page.
    for (const page of pages) {
      // Ignore empty pages.
      if (!page.text) continue;
      // Split page into paragraphs.
      const paragraphs = splitParagraphs(page.text);
      // Build chunk array with min/max constraints.
      const chunks = buildChunksFromParagraphs(
        paragraphs,
        MAX_CHUNK_CHARS,
        MIN_CHUNK_CHARS
      );

      // Convert each chunk to JSONL record with metadata.
      chunks.forEach((chunkText, chunkIdx) => {
        // Increment counters.
        docChunkCount += 1;
        totalChunks += 1;

        // Push one serialized chunk record.
        jsonLines.push(
          toJsonLine({
            // Stable ID: file::page::chunk.
            chunk_id: `${path.parse(row.file_name).name}::p${page.pageNumber}::c${chunkIdx + 1}`,
            // Document-level metadata copied from index row.
            file_name: row.file_name,
            title: row.title,
            doc_type: row.doc_type,
            clinical_scope: row.clinical_scope,
            publish_date: row.publish_date,
            version_or_revision: row.version_or_revision,
            language: row.language,
            issuer: row.issuer,
            review_status: row.review_status,
            // Left blank now; can be backfilled from metadata later.
            source_url: '',
            license_note: '',
            // Chunk location metadata.
            page: page.pageNumber,
            chunk_index_on_page: chunkIdx + 1,
            // The actual chunk text used for embedding/retrieval.
            text: chunkText,
            // Helpful debug stat.
            char_count: chunkText.length,
          })
        );
      });
    }

    // Count successful document.
    totalDocs += 1;
    // Per-doc progress log.
    console.log(`Chunked ${row.file_name}: ${docChunkCount} chunks`);
  }

  // Write JSONL output once at the end.
  fs.writeFileSync(OUTPUT_JSONL_PATH, `${jsonLines.join('\n')}\n`, 'utf8');
  // Final summary logs.
  console.log(`\nWrote chunks file: ${OUTPUT_JSONL_PATH}`);
  console.log(`Documents chunked: ${totalDocs}`);
  console.log(`Total chunks: ${totalChunks}`);
}

// Top-level async error handling.
main().catch((error) => {
  // Friendly error message.
  console.error(`Build chunks failed: ${error.message}`);
  // Non-zero process status for scripts/CI.
  process.exitCode = 1;
});
