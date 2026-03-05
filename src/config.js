module.exports = {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',

  bedTypes: ['ICU', 'STEP_DOWN', 'GENERAL', 'EMERGENCY'],

  // TODO: 病人分诊优先级——键为等级名，值为数字（越大越优先），例如 CRITICAL: 4, HIGH: 2, MEDIUM: 1, LOW: 0
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
