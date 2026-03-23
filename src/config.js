module.exports = {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',
  
  openaiApiKey: process.env.OPENAI_API_KEY || 'openai_api_key',

  ragTopK: Math.min(20, Math.max(1, parseInt(process.env.RAG_TOP_K || '4', 10))),
  ragEmbeddingModel: process.env.RAG_EMBEDDING_MODEL || 'text-embedding-3-small',

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
