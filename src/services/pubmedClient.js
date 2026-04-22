const config = require('../config');

const EUTILS_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

function commonParams() {
  const p = {
    tool: config.ncbiTool,
    email: config.ncbiEmail,
  };
  if (config.ncbiApiKey) {
    p.api_key = config.ncbiApiKey;
  }
  return p;
}

function buildUrl(path, query) {
  const u = new URL(`${EUTILS_BASE}/${path}`);
  Object.entries({ ...commonParams(), ...query }).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      u.searchParams.set(k, String(v));
    }
  });
  return u.toString();
}

/**
 * PubMed esearch — returns PMIDs (newest first in result set order).
 */
async function searchPubMed(term, options = {}) {
  const retmax = options.retmax ?? 15;
  const url = buildUrl('esearch.fcgi', {
    db: 'pubmed',
    term,
    retmax,
    retmode: 'json',
    sort: 'relevance',
  });

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`PubMed esearch failed: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  const idlist = data?.esearchresult?.idlist;
  if (!Array.isArray(idlist)) {
    return [];
  }
  return idlist;
}

function stripTags(s) {
  if (typeof s !== 'string') return '';
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Decode common PubMed XML entities (numeric + a few named). */
function decodeXmlEntities(s) {
  if (typeof s !== 'string') return '';
  return s
    .replace(/&#x([\da-fA-F]+);/g, (_, h) => {
      const cp = parseInt(h, 16);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : '';
    })
    .replace(/&#(\d+);/g, (_, d) => {
      const cp = parseInt(d, 10);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : '';
    })
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function extractArticlesFromPubmedXml(xml) {
  const articles = [];
  const blocks = xml.split('<PubmedArticle>').slice(1);
  for (const block of blocks) {
    const pmidMatch = block.match(/<PMID[^>]*>(\d+)<\/PMID>/);
    const pmid = pmidMatch ? pmidMatch[1] : null;
    if (!pmid) continue;

    const titleMatch = block.match(/<ArticleTitle>([\s\S]*?)<\/ArticleTitle>/);
    const title = titleMatch ? decodeXmlEntities(stripTags(titleMatch[1])) : '';

    const abstractParts = [...block.matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g)];
    const abstract = abstractParts
      .map((m) => decodeXmlEntities(stripTags(m[1])))
      .filter(Boolean)
      .join('\n')
      .trim();

    articles.push({ pmid, title, abstract });
  }
  return articles;
}

/**
 * Fetch metadata + abstract for given PMIDs (single efetch).
 */
async function fetchArticlesByPmids(pmids) {
  if (!pmids.length) {
    return [];
  }
  const url = buildUrl('efetch.fcgi', {
    db: 'pubmed',
    id: pmids.join(','),
    retmode: 'xml',
  });

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`PubMed efetch failed: ${res.status} ${res.statusText}`);
  }
  const xml = await res.text();
  return extractArticlesFromPubmedXml(xml);
}

module.exports = {
  searchPubMed,
  fetchArticlesByPmids,
};
