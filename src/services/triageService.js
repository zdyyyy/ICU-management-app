// ========== 依赖 ==========
// 引入配置（优先级权重 priorityLevels 等）
const config = require('../config');

// ========== 分诊优先级分数 ==========
/**
 * 计算单名病人的分诊优先级分数（ICU/医院场景）
 * 可扩展：生命体征、诊断、等待时间等
 */
function computePriority(patient) {
  // 从 config 取该优先级等级对应的数字，缺省用 MEDIUM
  const level = config.priorityLevels[patient.priorityLevel] ?? config.priorityLevels.MEDIUM;
  // 若有到达时间，计算已等待分钟数，否则为 0
  const waitMinutes = patient.arrivalTime ? (Date.now() - new Date(patient.arrivalTime).getTime()) / 60000 : 0;
  // 等待时间加成：每等 1 小时最多加 2 分，避免长时间等待者被忽略
  const waitBoost = Math.min(waitMinutes / 60, 2);
  return level + waitBoost;
}

// ========== 候诊列表排序 ==========
/**
 * 按优先级分数从高到低排序，同分则按到达时间从早到晚
 */
function sortWaitlist(waitlist) {
  // 复制数组再排序，不修改原数组
  return [...waitlist].sort((a, b) => {
    const pa = computePriority(a);
    const pb = computePriority(b);
    // 分数高的排前面（pb - pa > 0 则 b 在前）
    if (pb !== pa) return pb - pa;
    // 同分则到达时间早的排前面
    return new Date(a.arrivalTime || 0) - new Date(b.arrivalTime || 0);
  });
}

// ========== 导出 ==========
module.exports = {
  computePriority,
  sortWaitlist
};
