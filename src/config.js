module.exports = {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',

  // TODO: 床位类型列表（用于校验、文档等）
  bedTypes: ['ICU', 'STEP_DOWN', 'GENERAL', 'EMERGENCY'],

  // TODO: 兼容规则——键是「所需类型」，值是「可用的床位类型」数组
  // 例如: ICU 只能分配 ICU 床；GENERAL 可以分配 GENERAL 或 STEP_DOWN
  bedCompatibility: {
    ICU: ['ICU'],
    STEP_DOWN: ['STEP_DOWN', 'GENERAL'],
    GENERAL: ['GENERAL', 'STEP_DOWN'],
    EMERGENCY: ['EMERGENCY', 'GENERAL'],
  },

  // TODO: 在危机情况下，是否允许将高级别床分配给低需求病人
  allowOverflowAssignment: true,
};
