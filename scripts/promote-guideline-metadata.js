const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const GUIDELINES_DIR = path.join(PROJECT_ROOT, 'data', 'guidelines');
const GENERATED_PATH = path.join(GUIDELINES_DIR, 'index.generated.csv');
const FINAL_PATH = path.join(GUIDELINES_DIR, 'index.csv');

const REQUIRED_HEADERS = [
  'file_name',
  'title',
  'doc_type',
  'publish_date',
  'version_or_revision',
  'source_url',
  'clinical_scope',
  'language',
  'license_note',
  'issuer',
  'confidence',
  'review_status',
];

const DEFAULTS = {
  source_url: 'TODO_ADD_SOURCE_URL',
  license_note: 'TODO_VERIFY_LICENSE',
  review_status: 'auto_extracted',
};

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function escapeCsv(value) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function readCsvRows(csvPath) {
  const content = fs.readFileSync(csvPath, 'utf8');
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    throw new Error(`CSV is empty: ${csvPath}`);
  }

  const headers = parseCsvLine(lines[0]);
  for (const header of REQUIRED_HEADERS) {
    if (!headers.includes(header)) {
      throw new Error(`Missing header "${header}" in ${csvPath}`);
    }
  }

  const rows = lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = cols[idx] || '';
    });
    return row;
  });

  return rows;
}

function normalizeRows(rows) {
  return rows.map((row) => {
    const normalized = { ...row };

    if (!normalized.source_url) normalized.source_url = DEFAULTS.source_url;
    if (!normalized.license_note) normalized.license_note = DEFAULTS.license_note;
    if (!normalized.review_status) normalized.review_status = DEFAULTS.review_status;

    if (!normalized.clinical_scope) normalized.clinical_scope = 'general_public_health';
    if (!normalized.doc_type) normalized.doc_type = 'unknown';
    if (!normalized.language) normalized.language = 'unknown';
    if (!normalized.version_or_revision) normalized.version_or_revision = 'unknown';
    if (!normalized.confidence) normalized.confidence = 'low';
    if (!normalized.issuer) normalized.issuer = 'unknown';

    return normalized;
  });
}

function writeCsv(rows, outputPath) {
  const lines = [REQUIRED_HEADERS.join(',')];
  for (const row of rows) {
    lines.push(REQUIRED_HEADERS.map((header) => escapeCsv(row[header])).join(','));
  }

  fs.writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');
}

function main() {
  if (!fs.existsSync(GENERATED_PATH)) {
    throw new Error(`Generated metadata not found: ${GENERATED_PATH}`);
  }

  const rows = readCsvRows(GENERATED_PATH);
  const normalized = normalizeRows(rows);
  writeCsv(normalized, FINAL_PATH);

  const placeholderUrls = normalized.filter((row) => row.source_url === DEFAULTS.source_url).length;
  const placeholderLicenses = normalized.filter(
    (row) => row.license_note === DEFAULTS.license_note
  ).length;

  console.log(`Promoted metadata to: ${FINAL_PATH}`);
  console.log(`Rows: ${normalized.length}`);
  console.log(`Placeholder source_url: ${placeholderUrls}`);
  console.log(`Placeholder license_note: ${placeholderLicenses}`);
  console.log('You can index now, then backfill placeholders later.');
}

try {
  main();
} catch (error) {
  console.error(`Promote metadata failed: ${error.message}`);
  process.exitCode = 1;
}
