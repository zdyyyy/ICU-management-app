// ========== 依赖 ==========
// 引入内存数据仓库（beds 数组）
const { store } = require('../store');
// 引入配置（床位类型、兼容性等，本文件未直接使用，预留扩展）
const config = require('../config');

// ========== 可用床位查询 ==========
/**
 * 获取可用床位列表；若传入 bedType 则只返回该类型的床位
 */
function getAvailableBeds(bedType = null) {
  // 先筛出状态为 AVAILABLE 的床位
  const beds = store.beds.filter(b => b.status === 'AVAILABLE');
  // 若指定类型，再按类型过滤
  if (bedType) return beds.filter(b => b.type === bedType);
  return beds;
}

// ========== 按 ID 查单张床 ==========
/**
 * 根据床位 id 返回单张床对象，找不到则 undefined
 */
function getBedById(bedId) {
  return store.beds.find(b => b.id === bedId);
}

// ========== 分配病人到床位 ==========
/**
 * 将病人分配到指定床位；仅当床位存在且为 AVAILABLE 时执行并返回该床，否则返回 null
 */
function assignPatientToBed(bedId, patientId) {
  const bed = getBedById(bedId);
  if (!bed || bed.status !== 'AVAILABLE') return null;
  bed.status = 'OCCUPIED';
  bed.patientId = patientId;
  bed.occupiedAt = new Date().toISOString();
  return bed;
}

// ========== 释放床位 ==========
/**
 * 解除床位与病人的绑定，恢复为可用；床位不存在则返回 null
 */
function releaseBed(bedId) {
  const bed = getBedById(bedId);
  if (!bed) return null;
  bed.status = 'AVAILABLE';
  bed.patientId = null;
  bed.occupiedAt = null;
  return bed;
}

// ========== 为单个病人推荐一张床 ==========
/**
 * 为病人推荐一张床：优先其所需类型（requiredBedType）的可用床，否则任选一张可用床，没有则 null
 */
function suggestBedForPatient(patient) {
  const preferred = patient.requiredBedType || 'GENERAL';
  const available = getAvailableBeds(preferred);
  if (available.length) return available[0];
  return getAvailableBeds()[0] || null;
}

// ========== 导出 ==========
module.exports = {
  getAvailableBeds,
  getBedById,
  assignPatientToBed,
  releaseBed,
  suggestBedForPatient
};
