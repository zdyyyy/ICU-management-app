// Node.js file system utilities (read/write CSV files).
const fs = require('fs');
// Node.js path utilities (build safe cross-platform paths).
const path = require('path');

// Resolve project root from /scripts directory.
const PROJECT_ROOT = path.resolve(__dirname, '..');
// Absolute folder that stores guideline data artifacts.
const GUIDELINES_DIR = path.join(PROJECT_ROOT, 'data', 'guidelines');
// Source metadata CSV (produced by metadata promotion step).
const SOURCE_CSV = path.join(GUIDELINES_DIR, 'index.csv');
// Filtered CSV for next pipeline step (chunk builder input).
const OUTPUT_CSV = path.join(GUIDELINES_DIR, 'index.for-indexing.csv');

// Keep output columns explicit so downstream scripts are stable.
const OUTPUT_HEADERS = [
  'file_name',
  'title',
  'doc_type',
  'publish_date',
  'version_or_revision',
  'clinical_scope',
  'language',
  'issuer',
  'review_status',
  'absolute_file_path',
];

// Default scopes used when user does not pass --scopes=...
const DEFAULT_SCOPES = new Set(['icu_core', 'icu_related']);

// Parse one CSV line while respecting quoted commas and escaped quotes.
function parseCsvLine(line) {
  // Final parsed cell values.
  const values = [];
  // Current cell text buffer.
  let current = '';
  // Track if parser is currently inside "...".
  let inQuotes = false;

  // Scan each character to implement a tiny CSV parser.
  for (let i = 0; i < line.length; i += 1) {
    // Current character.
    const ch = line[i];
    // Next character (used to detect escaped quotes "").
    const next = line[i + 1];

    // Handle double quote logic.
    if (ch === '"') {
      // Inside quotes + next quote means escaped literal quote.
      if (inQuotes && next === '"') {
        // Append one real quote to current cell.
        current += '"';
        // Skip the second quote because we consumed it.
        i += 1;
      } else {
        // Toggle quote mode when entering/leaving quoted segment.
        inQuotes = !inQuotes;
      }
      // Quote characters are control chars, not part of field text.
      continue;
    }

    // Comma ends a cell only when not inside quotes.
    if (ch === ',' && !inQuotes) {
      // Commit current cell.
      values.push(current);
      // Reset cell buffer.
      current = '';
      // Continue reading next cell.
      continue;
    }

    // Normal character, append to current cell buffer.
    current += ch;
  }

  // Push final trailing cell.
  values.push(current);
  // Return parsed row.
  return values;
}

// Escape one cell for CSV output.
function escapeCsv(value) {
  // Normalize undefined/null to string.
  const text = String(value ?? '');
  // Double-up quotes then wrap with quotes.
  return `"${text.replace(/"/g, '""')}"`;
}

// Read CSV file into array of row objects.
function readRows(csvPath) {
  // Fail early if metadata file is missing.
  if (!fs.existsSync(csvPath)) {
    throw new Error(`Metadata file not found: ${csvPath}`);
  }

  // Read file and split to non-empty trimmed lines.
  const lines = fs
    .readFileSync(csvPath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  // Need at least header + one row.
  if (lines.length < 2) {
    throw new Error(`Metadata file has no data rows: ${csvPath}`);
  }

  // Parse header row into field names.
  const headers = parseCsvLine(lines[0]);
  // Map each data line into object {header: value}.
  return lines.slice(1).map((line) => {
    // Parse current CSV row.
    const cols = parseCsvLine(line);
    // Output row object.
    const row = {};
    // Assign each column by header index.
    headers.forEach((header, idx) => {
      // Default to empty string for missing trailing columns.
      row[header] = cols[idx] || '';
    });
    // Return normalized row object.
    return row;
  });
}

// Resolve scope filter from CLI arg --scopes=icu_core,icu_related
function resolveScopesFromArgs() {
  // Find optional scopes argument.
  const arg = process.argv.find((item) => item.startsWith('--scopes='));
  // No arg: use defaults.
  if (!arg) return DEFAULT_SCOPES;

  // Parse comma-separated scope values.
  const values = arg
    .slice('--scopes='.length)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  // Build set from provided values, fallback to default when empty.
  return new Set(values.length ? values : Array.from(DEFAULT_SCOPES));
}

// Keep only rows that match selected scopes and existing files.
function buildOutputRows(rows, scopes) {
  return rows
    // Keep requested clinical scopes only.
    .filter((row) => scopes.has(row.clinical_scope))
    // Add absolute file path for downstream PDF processing.
    .map((row) => ({
      ...row,
      absolute_file_path: path.join(GUIDELINES_DIR, row.file_name),
    }))
    // Drop rows pointing to missing PDF files.
    .filter((row) => fs.existsSync(row.absolute_file_path));
}

// Write selected rows to index.for-indexing.csv.
function writeOutput(rows) {
  // Start with CSV header row.
  const lines = [OUTPUT_HEADERS.join(',')];
  // Convert each row object to ordered CSV row.
  for (const row of rows) {
    lines.push(
      OUTPUT_HEADERS.map((header) => escapeCsv(row[header] || '')).join(',')
    );
  }
  // Persist to disk with trailing newline.
  fs.writeFileSync(OUTPUT_CSV, `${lines.join('\n')}\n`, 'utf8');
}

// Script entrypoint.
function main() {
  // Resolve allowed scopes (default or from args).
  const scopes = resolveScopesFromArgs();
  // Read source metadata index.
  const rows = readRows(SOURCE_CSV);
  // Apply scope + file existence filters.
  const outputRows = buildOutputRows(rows, scopes);

  // Save filtered indexing input.
  writeOutput(outputRows);

  // Friendly scope label for logs.
  const scopeLabel = Array.from(scopes).join(', ');
  // Print summary for quick verification.
  console.log(`Built indexing input: ${OUTPUT_CSV}`);
  console.log(`Included scopes: ${scopeLabel}`);
  console.log(`Rows selected: ${outputRows.length}/${rows.length}`);
}

// Catch top-level errors so script exits with non-zero status.
try {
  main();
} catch (error) {
  // Print readable failure reason.
  console.error(`Build indexing input failed: ${error.message}`);
  // Mark process failed for CI/shell scripts.
  process.exitCode = 1;
}
