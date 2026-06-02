const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const GUIDELINES_DIR = path.join(PROJECT_ROOT, 'data', 'guidelines');
const OUTPUT_PATH = path.join(GUIDELINES_DIR, 'index.generated.csv');

const CSV_HEADERS = [
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

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function escapeCsv(value) {
  const safe = String(value ?? '');
  return `"${safe.replace(/"/g, '""')}"`;
}

function getDocType(fileName, textPreview) {
  const haystack = `${fileName} ${textPreview}`.toLowerCase();
  if (haystack.includes('toolkit')) return 'toolkit';
  if (haystack.includes('guideline')) return 'guideline';
  return 'unknown';
}

function extractTitle(fileName, textPreview) {
  const baseName = normalizeWhitespace(path.parse(fileName).name);
  const lines = textPreview
    .split('\n')
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean);

  const candidates = lines.filter((line) => {
    if (line.length < 12 || line.length > 220) return false;
    if (/^(contents|table of contents|foreword|acknowledg(e)?ments?)$/i.test(line)) {
      return false;
    }
    return !/^\d+$/.test(line);
  });

  if (!candidates.length) return baseName;

  const first = candidates[0];
  const tooShort = first.length < Math.min(32, Math.floor(baseName.length * 0.55));
  const looksTruncated = /(?:\band\b|\bon\b|\bfor\b|[-,:])$/i.test(first);
  const isPrefixOnly =
    baseName.toLowerCase().startsWith(first.toLowerCase()) &&
    baseName.length - first.length > 15;
  if (tooShort || looksTruncated || isPrefixOnly) return baseName;

  return first;
}

function extractPublishDate(textPreview) {
  const normalized = normalizeWhitespace(textPreview);

  const fullDate = normalized.match(
    /\b(20\d{2})[-/](0[1-9]|1[0-2])[-/](0[1-9]|[12]\d|3[01])\b/
  );
  if (fullDate) return fullDate[0].replace(/\//g, '-');

  const monthYear = normalized.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})\b/i
  );
  if (monthYear) {
    const month = monthYear[1].toLowerCase();
    const year = monthYear[2];
    const monthMap = {
      january: '01',
      february: '02',
      march: '03',
      april: '04',
      may: '05',
      june: '06',
      july: '07',
      august: '08',
      september: '09',
      october: '10',
      november: '11',
      december: '12',
    };
    return `${year}-${monthMap[month]}`;
  }

  const year = normalized.match(/\b(20\d{2})\b/);
  return year ? year[1] : '';
}

function extractVersionOrRevision(fileName, textPreview) {
  const haystack = `${fileName} ${textPreview}`;

  if (/living guideline/i.test(haystack)) return 'living guideline';

  const version = haystack.match(/\bversion\s+([0-9]+(?:\.[0-9]+)*)\b/i);
  if (version) return `version ${version[1]}`;

  const revision = haystack.match(/\b(revision|revised|update(?:d)?)\b.*?(20\d{2})/i);
  if (revision) return `${revision[1].toLowerCase()} ${revision[2]}`;

  return 'unknown';
}

function inferClinicalScope(fileName, textPreview) {
  const haystack = `${fileName} ${textPreview}`.toLowerCase();

  const icuCoreTerms = [
    'meningitis',
    'tuberculosis',
    'arboviral',
    'dengue',
    'zika',
    'yellow fever',
    'mpox',
    'infection prevention',
  ];
  if (icuCoreTerms.some((term) => haystack.includes(term))) return 'icu_core';

  const icuRelatedTerms = ['hiv', 'hand hygiene', 'clinical management'];
  if (icuRelatedTerms.some((term) => haystack.includes(term))) return 'icu_related';

  return 'general_public_health';
}

function inferLanguage(textPreview) {
  const ascii = textPreview.replace(/[^\x00-\x7F]/g, '');
  const ratio = ascii.length / Math.max(textPreview.length, 1);
  return ratio > 0.9 ? 'en' : 'unknown';
}

function inferConfidence(meta) {
  const score = [
    meta.title && meta.title !== path.parse(meta.file_name).name,
    meta.publish_date && meta.publish_date !== '',
    meta.version_or_revision && meta.version_or_revision !== 'unknown',
    meta.doc_type !== 'unknown',
  ].filter(Boolean).length;

  if (score >= 4) return 'high';
  if (score >= 2) return 'medium';
  return 'low';
}

async function extractMetadata(pdfPath) {
  const fileName = path.basename(pdfPath);
  const fileBuffer = fs.readFileSync(pdfPath);
  const parser = new PDFParse({ data: fileBuffer });
  const parsed = await parser.getText({ max: 3 });
  const preview = parsed.text.split('\n').slice(0, 180).join('\n');

  const meta = {
    file_name: fileName,
    title: extractTitle(fileName, preview),
    doc_type: getDocType(fileName, preview),
    publish_date: extractPublishDate(preview),
    version_or_revision: extractVersionOrRevision(fileName, preview),
    source_url: '',
    clinical_scope: inferClinicalScope(fileName, preview),
    language: inferLanguage(preview),
    license_note: '',
    issuer: /who|world health organization/i.test(preview) ? 'WHO' : 'unknown',
    confidence: 'low',
    review_status: 'auto_extracted',
  };

  meta.confidence = inferConfidence(meta);
  await parser.destroy();
  return meta;
}

async function main() {
  if (!fs.existsSync(GUIDELINES_DIR)) {
    throw new Error(`Guidelines directory not found: ${GUIDELINES_DIR}`);
  }

  const files = fs
    .readdirSync(GUIDELINES_DIR)
    .filter((name) => name.toLowerCase().endsWith('.pdf'))
    .sort((a, b) => a.localeCompare(b));

  if (!files.length) {
    console.log('No PDF files found under data/guidelines.');
    return;
  }

  const rows = [];
  for (const file of files) {
    const pdfPath = path.join(GUIDELINES_DIR, file);
    try {
      const meta = await extractMetadata(pdfPath);
      rows.push(meta);
      console.log(`Extracted metadata: ${file}`);
    } catch (error) {
      console.error(`Failed to parse ${file}: ${error.message}`);
      rows.push({
        file_name: file,
        title: path.parse(file).name,
        doc_type: 'unknown',
        publish_date: '',
        version_or_revision: 'unknown',
        source_url: '',
        clinical_scope: 'general_public_health',
        language: 'unknown',
        license_note: '',
        issuer: 'unknown',
        confidence: 'low',
        review_status: 'auto_extracted',
      });
    }
  }

  const csvLines = [CSV_HEADERS.join(',')];
  for (const row of rows) {
    const line = CSV_HEADERS.map((header) => escapeCsv(row[header] || '')).join(',');
    csvLines.push(line);
  }

  const csvOutput = `${csvLines.join('\n')}\n`;
  let finalOutputPath = OUTPUT_PATH;
  try {
    fs.writeFileSync(OUTPUT_PATH, csvOutput, 'utf8');
  } catch (error) {
    if (error.code === 'EBUSY') {
      finalOutputPath = path.join(
        GUIDELINES_DIR,
        `index.generated.${Date.now()}.csv`
      );
      fs.writeFileSync(finalOutputPath, csvOutput, 'utf8');
      console.warn(
        `Primary output file is locked. Wrote fallback file: ${finalOutputPath}`
      );
    } else {
      throw error;
    }
  }

  console.log(`\nGenerated CSV: ${finalOutputPath}`);
  console.log(`Rows: ${rows.length}`);
  console.log('Next step: manually review source_url, license_note, and clinical_scope.');
}

main().catch((error) => {
  console.error(`Metadata extraction failed: ${error.message}`);
  process.exitCode = 1;
});
