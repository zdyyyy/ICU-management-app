module.exports = {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',
  
  openaiApiKey: process.env.OPENAI_API_KEY || 'openai_api_key',

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
