module.exports = {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',

  bedTypes: ['ICU', 'STEP_DOWN', 'GENERAL', 'EMERGENCY'],


  bedCompatibility: {
    ICU: ['ICU'],
    STEP_DOWN: ['STEP_DOWN', 'GENERAL'],
    GENERAL: ['GENERAL', 'STEP_DOWN'],
    EMERGENCY: ['EMERGENCY', 'GENERAL'],
  },

  allowOverflowAssignment: true,
};
