const { store } = require('../store');
const triageService = require('./triageService');

// TODO: 按 MRN 查病人；MRN 先 trim、toUpperCase 再和 store.patients 里每条 p.mrn 规范化后比较，找到返回病人，找不到 undefined
function findPatientByMrn(mrn) {
  const normalization = String(mrn || '').trim().toUpperCase();
  // const patient = store.patients.find(p => p.id === normalization); // 错误：应该用病历号 p.mrn 比较，且需要转大写去空格
  const patient = store.patients.find(p => String(p.mrn || '').trim().toUpperCase() === normalization);
  if(!patient) return undefined;
  return patient;
}

// TODO: 用 triageService.sortWaitlist 对「waitlist 每条拼上病人」后的列表排序，再 findIndex 找 patientId 或 id 匹配的下标；返回 1-based 位置（idx+1），未找到 null
function getQueuePosition(patientId) {
  // const patient = store.patients.find(p => p.id === patientId);
  const waitlist = store.waitlist.map(w => {
    const patient = store.patients.find(p => p.id === w.patientId);
    return {...w, patient: patient || null};
  });
  const sortedWaitlist = triageService.sortWaitlist(waitlist);
  // const queuePosition = sortedWaitlist.findIndex(patientId); // 错误：findIndex 需要传回调函数 (w => w.patientId === ...)
  // if(! queuePosition) return null; // 错误：下标为 0 时 !0 会误判为 true，且应该返回 1-based (即 idx+1)
  // return queuePosition
  const idx = sortedWaitlist.findIndex(w => w.patientId === patientId || w.id === patientId);
  if (idx === -1) return null;
  return idx + 1;
}

// TODO: 根据排队位置和总人数给预估等待分类；无有效位置返回 null；否则按预估分钟数（如 position * 45）返回 { category, label, estimatedMinutes }，如 soon/short/medium/long
function getEstimatedWaitCategory(queuePosition, totalWaiting) {
  if(!queuePosition || queuePosition < 1) return null;
  const avgWaitingMins = 45;
  const estimateMins = queuePosition*avgWaitingMins;
  if(estimateMins <= 30) return{ category: 'soon', label: 'Within 30 mins', estimateMins};
  if(estimateMins <= 120) return{ category: 'short', label: 'Within 1-2 hours', estimateMins};
  if(estimateMins <= 360) return{ category: 'medium', label: 'Within 2-3 hours', estimateMins};
  return { category: 'long', label: 'Over 3 hours', estimateMins};
}

// TODO: 优先级枚举转展示文案，如 CRITICAL -> 'Critical'；可做 map 表，没有则默认 'Medium'
function toPriorityDisplay(level) {
  const map = { CRITICAL: 'Critical', URGENT: 'Urgent', HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' };
  return map[level] || 'Medium';
}

// TODO: 入口。findPatientByMrn(mrn) 找不到返回 null；否则拼状态：
// 是否在 waitlist、排队位置、队列总人数、预估等待、是否已分配床、
// status（ASSIGNED/WAITING/原 status）、currentBed（仅 label/type）、
// requiredBedType、priorityDisplay、lastUpdated；不暴露内部 id、备注等
function getStatusForPatient(mrn) {
  // find patient
  const patient = findPatientByMrn(mrn);
  if(!patient) return null;

  // check waitlist
  const onWaitlist = store.waitlist.some(w => w.patientId === patient.id);
  // check queue
  const queuePosition = onWaitlist ? getQueuePosition(patient.id) : null;

  const totalWaiting = store.waitlist.length;
  // get waiting time
  const waitEstimate = queuePosition ? getEstimatedWaitCategory(queuePosition, totalWaiting): null;

  // check bed
  const assignedBed = store.beds.find(b => b.patientId === patient.id);
  // const status = assignedBed ? 'ASSIGNED': (onWaitlist ? patient.status : "UNKNOWN"); // 错误：在候诊列表中时，状态应固定返回 'WAITING'
  const status = assignedBed ? 'ASSIGNED' : (onWaitlist ? 'WAITING' : patient.status || "UNKNOWN");

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

module.exports = {
  findPatientByMrn,
  getQueuePosition,
  getEstimatedWaitCategory,
  getStatusForPatient,
  toPriorityDisplay
};