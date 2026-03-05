const { store } = require('../store');
const config = require('../config');

function getAvailableBeds(bedType = null) {
  // TODO: 从 store.beds 里筛出 status === 'AVAILABLE' 的床
  // 若 bedType 有值，再只保留 bed.type === bedType 的
  const beds = store.beds.filter(bed => bed.status === 'AVAILABLE');
  if (bedType) {
    return beds.filter(bed => bed.type === bedType);
  }
  return beds;
}

function getBedById(bedId) {
  // TODO: 在 store.beds 里找 id === bedId 的那张床，找不到返回 undefined
  return store.beds.find(bed => bed.id === bedId)
}

function assignPatientToBed(bedId, patientId) {
  // TODO: 用 getBedById 拿到床；若不存在或 status !== 'AVAILABLE' 则 return null
  // 否则：bed.status = 'OCCUPIED'，bed.patientId = patientId，bed.occupiedAt = new Date().toISOString()
  // 返回该床对象
  const bed = getBedById(bedId);
  if (!bed || bed.status !== 'AVAILABLE') return null;
  bed.status = 'OCCUPIED';
  bed.patientId = patientId;
  bed.occupiedAt = new Date().toISOString();
  return bed;
}

function releaseBed(bedId) {
  // TODO: 用 getBedById 拿到床；若不存在 return null
  // 否则：bed.status = 'AVAILABLE'，bed.patientId = null，bed.occupiedAt = null，返回该床
  const bed = getBedById(bedId);
  if (!bed) return null;
  bed.status = 'AVAILABLE';
  bed.patientId = null;
  bed.occupiedAt = null;
  return bed;
}

function suggestBedForPatient(patient) {
  // TODO: 病人有 requiredBedType（没有则当 'GENERAL'）
  // 先找该类型可用床 getAvailableBeds(requiredBedType)，有则返回第一张
  // 没有则 getAvailableBeds() 任意可用床返回第一张；都没有 return null
  const preferred = patient.requiredBedType || 'GENERAL'
  const available = getAvailableBeds(preferred);
  if (available.length) return available[0];
  return getAvailableBeds()[0] || null;
}

module.exports = {
  getAvailableBeds,
  getBedById,
  assignPatientToBed,
  releaseBed,
  suggestBedForPatient
};
