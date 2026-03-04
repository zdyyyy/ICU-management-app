
module.exports = {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',
  
  priorityLevels: {
    CRITICAL: 4,
    URGENT: 3,
    HIGH: 2,
    MEDIUM: 1,
    LOW: 0
  },
  
  bedTypes: ['ICU', 'STEP_DOWN', 'GENERAL', 'EMERGENCY'],
  
  bedCompatibility: {
    ICU: ['ICU'],
    STEP_DOWN: ['STEP_DOWN', 'GENERAL'],
    GENERAL: ['GENERAL', 'STEP_DOWN'],
    EMERGENCY: ['EMERGENCY', 'GENERAL']
  },
  
  allowOverflowAssignment: true
};
