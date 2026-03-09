const config = require('../config');

// TODO: 根据病人的 priorityLevel 从 config.priorityLevels 取基础分，可选加上等候时间加成（等候越久分数略升），返回一个数字用于排序
function computePriority(patient) {
  // const patientLevel = config.priorityLevels[patient.priorityLevels] ?? config.priorityLevels.MEDIUM;  // 错误：病人字段是 priorityLevel（单数），不是 priorityLevels
  const patientLevel = config.priorityLevels[patient.priorityLevel] ?? config.priorityLevels.MEDIUM;
  // const waitingMinutes = (Date.now() - patient.arrivalTime):0;  // 错误：语法错误；arrivalTime 是 ISO 字符串，需转成时间戳再算差值，且单位应为分钟
  const arrivalMs = patient.arrivalTime ? new Date(patient.arrivalTime).getTime() : 0;
  const waitingMinutes = arrivalMs ? (Date.now() - arrivalMs) / 60000 : 0;
  const waitingBoost = Math.min(waitingMinutes / 60, 2);
  const waitingScore = patientLevel + waitingBoost;
  return waitingScore;
}

// TODO: 对 waitlist 按优先级排序（分数高的在前）；同分可按 arrivalTime 早的在前；返回新数组不修改原数组
function sortWaitlist(waitlist) {
  return [...waitlist].sort((a, b) => {
    // const pa = computePriority(a);   // 错误：a 可能是 { ...w, patient }，priorityLevel 在 a.patient 里
    // const pb = computePriority(b);
    // if(pb != pa) return pb - pa;
    const patientA = a.patient || a;
    const patientB = b.patient || b;
    const pa = computePriority(patientA);
    const pb = computePriority(patientB);
    if (pb !== pa) return pb - pa;
    return new Date(a.arrivalTime || 0) - new Date(b.arrivalTime || 0);
  });
}

module.exports = {
  computePriority,
  sortWaitlist
};
