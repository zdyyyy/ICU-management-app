
const config = require('../config');


function computePriority(patient) {
  
  const level = config.priorityLevels[patient.priorityLevel] ?? config.priorityLevels.MEDIUM;
  
  const waitMinutes = patient.arrivalTime ? (Date.now() - new Date(patient.arrivalTime).getTime()) / 60000 : 0;
  
  const waitBoost = Math.min(waitMinutes / 60, 2);
  return level + waitBoost;
}


function sortWaitlist(waitlist) {
  
  return [...waitlist].sort((a, b) => {
    const pa = computePriority(a);
    const pb = computePriority(b);
    
    if (pb !== pa) return pb - pa;
    
    return new Date(a.arrivalTime || 0) - new Date(b.arrivalTime || 0);
  });
}

module.exports = {
  computePriority,
  sortWaitlist
};
