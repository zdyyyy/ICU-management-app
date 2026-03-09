const { store } = require('../store');
const triageService = require('./triageService');

const statusCache = {};
const CACHE_TTL_MS = 15000;

function findPatientByMrn(mrn) {
  const normalization = String(mrn || '').trim().toUpperCase();
  const patient = store.patients.find(p => String(p.mrn || '').trim().toUpperCase() === normalization);
  if(!patient) return undefined;
  return patient;
}

function getQueuePosition(patientId) {
  const waitlist = store.waitlist.map(w => {
    const patient = store.patients.find(p => p.id === w.patientId);
    return {...w, patient: patient || null};
  });
  const sortedWaitlist = triageService.sortWaitlist(waitlist);

  const idx = sortedWaitlist.findIndex(w => w.patientId === patientId || w.id === patientId);
  if (idx === -1) return null;
  return idx + 1;
}

function getEstimatedWaitCategory(queuePosition, totalWaiting) {
  if(!queuePosition || queuePosition < 1) return null;
  const avgWaitingMins = 45;
  const estimateMins = queuePosition*avgWaitingMins;
  if(estimateMins <= 30) return{ category: 'soon', label: 'Within 30 mins', estimateMins};
  if(estimateMins <= 120) return{ category: 'short', label: 'Within 1-2 hours', estimateMins};
  if(estimateMins <= 360) return{ category: 'medium', label: 'Within 2-3 hours', estimateMins};
  return { category: 'long', label: 'Over 3 hours', estimateMins};
}

function toPriorityDisplay(level) {
  const map = { CRITICAL: 'Critical', URGENT: 'Urgent', HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' };
  return map[level] || 'Medium';
}

function getStatusForPatient(mrn) {
  // check cache before performing heavy computations
  const cached = statusCache[mrn];
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    console.log(`[Cache] HIT for MRN: ${mrn}`);
    return cached.data;
  }
  
  console.log(`[Cache] MISS for MRN: ${mrn}. Computing...`);

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
  const status = assignedBed ? 'ASSIGNED' : (onWaitlist ? 'WAITING' : patient.status || "UNKNOWN");

  const result = {
    status,
    queuePosition: queuePosition || undefined,
    totalInQueue: totalWaiting,
    estimatedWait: waitEstimate,
    currentBed: assignedBed ? { label: assignedBed.label, type: assignedBed.type } : undefined,
    requiredBedType: patient.requiredBedType,
    priorityDisplay: toPriorityDisplay(patient.priorityLevel),
    lastUpdated: new Date().toISOString()
  };

  // store the newly computed result in cache
  statusCache[mrn] = {
    data: result,
    timestamp: Date.now()
  };

  return result;
}

module.exports = {
  findPatientByMrn,
  getQueuePosition,
  getEstimatedWaitCategory,
  getStatusForPatient,
  toPriorityDisplay
};
