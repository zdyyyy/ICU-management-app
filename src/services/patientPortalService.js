// ========== 依赖 ==========
// 引入内存数据仓库（病人、床位、候诊列表）
const { store } = require('../store');
// 引入分诊服务（用于按优先级排序候诊列表）
const triageService = require('./triageService');

// ========== 按 MRN 查找病人 ==========
/**
 * 根据 MRN（病历号，常提供给患者用于自助查询）查找病人
 */
function findPatientByMrn(mrn) {
  // 将入参转为字符串、去首尾空格、大写，便于大小写不敏感匹配
  const normalized = String(mrn || '').trim().toUpperCase();
  // 在 store.patients 中查找 mrn 规范化后与 normalized 相等的病人
  return store.patients.find(p => String(p.mrn || '').trim().toUpperCase() === normalized);
}

// ========== 排队位置（1-based） ==========
/**
 * 按分诊优先级顺序计算某病人在候诊队列中的位置（从 1 开始），与“下一床建议”顺序一致
 */
function getQueuePosition(patientId) {
  // 将 waitlist 每条记录与对应病人合并，过滤掉找不到病人的无效项
  const ranked = triageService.sortWaitlist(
    store.waitlist.map(w => {
      const p = store.patients.find(x => x.id === w.patientId);
      return p ? { ...w, ...p } : null;
    }).filter(Boolean)
  );
  // 在排序后的列表中找当前病人下标（支持用 patientId 或 id 匹配）
  const idx = ranked.findIndex(r => r.patientId === patientId || r.id === patientId);
  // 未找到返回 null，否则返回 1-based 位置（idx + 1）
  return idx === -1 ? null : idx + 1;
}

// ========== 预估等待时间分类（展示用） ==========
/**
 * 根据排队位置和总等候人数给出简单的等待时间分类（暂无真实 ETA 模型）
 */
function getEstimatedWaitCategory(queuePosition, totalWaiting) {
  // 无有效排队位置则返回 null
  if (!queuePosition || queuePosition < 1) return null;
  // 假设平均每前进一位约 45 分钟（可后续改为配置或模型）
  const avgPlacementMinutes = 45;
  // 预估分钟数 = 当前位次 × 平均分钟
  const estimatedMinutes = queuePosition * avgPlacementMinutes;
  // 按区间返回分类与展示文案
  if (estimatedMinutes <= 30) return { category: 'soon', label: 'Within ~30 min', estimatedMinutes };
  if (estimatedMinutes <= 120) return { category: 'short', label: 'Within 1–2 hours', estimatedMinutes };
  if (estimatedMinutes <= 240) return { category: 'medium', label: 'Within 2–4 hours', estimatedMinutes };
  return { category: 'long', label: 'Over 4 hours – staff will update', estimatedMinutes };
}

// ========== 患者门户用状态（脱敏） ==========
/**
 * 返回供患者门户展示的状态：字段精简，不暴露敏感备注等
 */
function getStatusForPatient(mrn) {
  const patient = findPatientByMrn(mrn);
  if (!patient) return null;

  // 是否在候诊列表中
  const onWaitlist = store.waitlist.some(w => w.patientId === patient.id);
  // 在候诊列表中则算排队位置，否则为 null
  const queuePosition = onWaitlist ? getQueuePosition(patient.id) : null;
  // 当前候诊队列总人数
  const totalWaiting = store.waitlist.length;
  // 若有排队位置则计算预估等待分类
  const waitEstimate = queuePosition ? getEstimatedWaitCategory(queuePosition, totalWaiting) : null;

  // 查找该病人是否已被分配床位
  const assignedBed = store.beds.find(b => b.patientId === patient.id);
  // 状态：已分配 > 候诊中 > 病人原有 status 或 UNKNOWN
  const status = assignedBed ? 'ASSIGNED' : (onWaitlist ? 'WAITING' : patient.status || 'UNKNOWN');

  // 组装返回对象：状态、排队位置、队列总人数、预估等待、当前床位（仅 label/type）、所需床位类型、优先级展示、最后更新时间
  return {
    status,
    queuePosition: queuePosition || undefined,
    totalInQueue: totalWaiting,
    estimatedWait: waitEstimate,
    currentBed: assignedBed ? { label: assignedBed.label, type: assignedBed.type } : undefined,
    requiredBedType: patient.requiredBedType,
    priorityDisplay: toPriorityDisplay(patient.priorityLevel),
    lastUpdated: new Date().toISOString()
  };
}

// ========== 优先级展示文案 ==========
/**
 * 将内部优先级枚举转为对患者友好的显示文案
 */
function toPriorityDisplay(level) {
  const map = { CRITICAL: 'Critical', URGENT: 'Urgent', HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' };
  return map[level] || 'Medium';
}

// ========== 导出 ==========
module.exports = {
  findPatientByMrn,
  getQueuePosition,
  getEstimatedWaitCategory,
  getStatusForPatient
};
