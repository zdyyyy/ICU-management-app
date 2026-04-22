module.exports = {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',
  
  openaiApiKey: process.env.OPENAI_API_KEY || 'openai_api_key',

  /** NCBI E-utilities (PubMed): https://www.ncbi.nlm.nih.gov/books/NBK25497/ */
  ncbiTool: process.env.NCBI_TOOL || 'icu_resource_manager',
  ncbiEmail: process.env.NCBI_EMAIL || 'dev@localhost',
  ncbiApiKey: process.env.NCBI_API_KEY || '',

  /** How many PubMed hits to pull; abstracts are sent to the model (cap keeps tokens reasonable). */
  literatureSearchPoolSize: Math.min(
    25,
    Math.max(5, parseInt(process.env.LITERATURE_SEARCH_POOL, 10) || 15),
  ),
  literatureMaxArticles: Math.min(
    12,
    Math.max(3, parseInt(process.env.LITERATURE_MAX_ARTICLES, 10) || 8),
  ),

  bedTypes: ['ICU', 'STEP_DOWN', 'GENERAL', 'EMERGENCY'],

  priorityLevels: {
    CRITICAL: 4,
    HIGH: 2,
    MEDIUM: 1,
    LOW: 0
  },

  bedCompatibility: {
    ICU: ['ICU'],
    STEP_DOWN: ['STEP_DOWN', 'GENERAL'],
    GENERAL: ['GENERAL', 'STEP_DOWN'],
    EMERGENCY: ['EMERGENCY', 'GENERAL'],
  },

  allowOverflowAssignment: true,
};
