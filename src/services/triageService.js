const config = require('../config');

function computePriority(patient) {
  const patientLevel = config.priorityLevels[patient.priorityLevel] ?? config.priorityLevels.MEDIUM;
  const arrivalMs = patient.arrivalTime ? new Date(patient.arrivalTime).getTime() : 0;
  const waitingMinutes = arrivalMs ? (Date.now() - arrivalMs) / 60000 : 0;
  const waitingBoost = Math.min(waitingMinutes / 60, 2);
  const waitingScore = patientLevel + waitingBoost;
  return waitingScore;
}

function sortWaitlist(waitlist) {
  return [...waitlist].sort((a, b) => {
    // const pa = computePriority(a);
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
