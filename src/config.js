/**
 * App configuration - adjust for Ottawa hospital / ICU context
 */
module.exports = {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',
  // Triage priority levels (higher = more urgent)
  priorityLevels: {
    CRITICAL: 4,   // Immediate ICU
    URGENT: 3,
    HIGH: 2,
    MEDIUM: 1,
    LOW: 0
  },
  // Bed types
  bedTypes: ['ICU', 'STEP_DOWN', 'GENERAL', 'EMERGENCY'],
  // Which bed types can satisfy a required type (e.g. ICU only → ICU; GENERAL can use GENERAL or STEP_DOWN)
  bedCompatibility: {
    ICU: ['ICU'],
    STEP_DOWN: ['STEP_DOWN', 'GENERAL'],
    GENERAL: ['GENERAL', 'STEP_DOWN'],
    EMERGENCY: ['EMERGENCY', 'GENERAL']
  },
  // In crisis, allow assigning higher-level bed to lower need (e.g. ICU bed for GENERAL)
  allowOverflowAssignment: true
};
