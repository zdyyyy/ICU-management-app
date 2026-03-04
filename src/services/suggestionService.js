// ========== 依赖 ==========
// 引入内存数据仓库（病人、床位、候诊列表）
const { store } = require('../store');
// 引入配置（床位兼容性、是否允许溢出分配）
const config = require('../config');
// 引入分诊服务（排序候诊列表、计算优先级分数）
const triageService = require('./triageService');
// 引入床位服务（本文件未直接调用，预留或供上层组合使用）
const bedService = require('./bedService');

// ========== 床位是否满足需求类型 ==========
/**
 * 判断床位类型 bedType 是否满足病人所需类型 requiredType（即是否在 config.bedCompatibility[requiredType] 中）
 */
function bedSatisfiesRequirement(bedType, requiredType) {
  const allowed = config.bedCompatibility[requiredType];
  if (!allowed) return bedType === requiredType;
  return allowed.includes(bedType);
}

// ========== 匹配质量 ==========
/**
 * 返回匹配质量：exact 同类型、compatible 兼容替代、overflow 如用 ICU 满足 GENERAL（危机时可启用）
 */
function getMatchQuality(bedType, requiredType) {
  if (bedType === requiredType) return 'exact';
  const allowed = config.bedCompatibility[requiredType];
  if (allowed && allowed.includes(bedType)) return 'compatible';
  return 'overflow';
}

// ========== 批量“下一床”建议 ==========
/**
 * 按分诊排序后的候诊列表，为每位病人分配当前最优可用床，不重复使用床或病人；返回 (病人, 床位, 匹配质量) 列表，最多 limit 条
 */
function getNextBedSuggestions(limit = 5) {
  // ---------- 1. 准备排序后的候诊列表 ----------
  // 将 waitlist 每条记录与对应病人合并，过滤掉找不到病人的无效项，再按分诊优先级排序
  const ranked = triageService.sortWaitlist(
    store.waitlist.map(w => {
      const p = store.patients.find(x => x.id === w.patientId);
      return p ? { ...w, ...p } : null;
    }).filter(Boolean)
  );
  // 当前所有可用床的副本（status === 'AVAILABLE'），不修改原 store.beds
  const availableBeds = [...store.beds.filter(b => b.status === 'AVAILABLE')];
  // 本轮已“分配”出去的床位 id，保证一床只建议给一个病人
  const usedBedIds = new Set();
  // 本轮已加入建议的病人 id，保证同一病人只出现一次
  const usedPatientIds = new Set();
  const suggestions = [];

  // ---------- 2. 按优先级顺序为病人找床 ----------
  for (const patient of ranked) {
    if (suggestions.length >= limit) break;
    if (usedPatientIds.has(patient.patientId)) continue;

    // 病人所需床位类型，缺省为 GENERAL
    const required = patient.requiredBedType || 'GENERAL';
    let best = null;       // 当前找到的最优床
    let bestQuality = null; // 最优床的匹配质量：exact > compatible > overflow

    for (const bed of availableBeds) {
      if (usedBedIds.has(bed.id)) continue;
      const quality = getMatchQuality(bed.type, required);
      // 仅接受：完全匹配、兼容类型，或 overflow 且配置允许溢出分配
      const allowed = quality === 'exact' || quality === 'compatible' || (quality === 'overflow' && config.allowOverflowAssignment);
      if (!allowed) continue;
      // 用分数比较：exact=2, compatible=1, overflow=0，优先选分数高的
      const score = quality === 'exact' ? 2 : quality === 'compatible' ? 1 : 0;
      const bestScore = bestQuality === 'exact' ? 2 : bestQuality === 'compatible' ? 1 : 0;
      if (!best || score > bestScore) {
        best = bed;
        bestQuality = quality;
      }
    }
    if (!best) continue; // 没有可用床满足该病人，跳过

    usedBedIds.add(best.id);
    usedPatientIds.add(patient.patientId);
    const priorityScore = triageService.computePriority(patient);
    suggestions.push({
      patient: {
        id: patient.id,
        patientId: patient.patientId,
        name: patient.name,
        mrn: patient.mrn,
        priorityLevel: patient.priorityLevel,
        requiredBedType: patient.requiredBedType,
        arrivalTime: patient.arrivalTime
      },
      bed: { id: best.id, label: best.label, type: best.type },
      matchQuality: bestQuality,
      priorityScore: Math.round(priorityScore * 100) / 100
    });
  }

  return suggestions;
}

// ========== 单条建议（兼容旧接口） ==========
/**
 * 只返回一条“下一床”建议：当前优先级最高且能分到床的病人及其推荐床
 */
function getNextBedSuggestion() {
  const list = getNextBedSuggestions(1);
  return list[0] || null;
}

// ========== 导出 ==========
module.exports = {
  bedSatisfiesRequirement,
  getMatchQuality,
  getNextBedSuggestions,
  getNextBedSuggestion
};
