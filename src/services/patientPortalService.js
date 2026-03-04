const { store } = require('../store');
const triageService = require('./triageService');

function findPatientByMrn(mrn) {
  const normalized = String(mrn || '').trim().toUpperCase();
  return store.patients.find(p => String(p.mrn || '').trim().toUpperCase() === normalized);
}

function getQueuePosition(patientId) {
  const ranked = triageService.sortWaitlist(
    store.waitlist.map(w => {
      const p = store.patients.find(x => x.id === w.patientId);
      return p ? { ...w, ...p } : null;
    }).filter(Boolean)
  );
  const idx = ranked.findIndex(r => r.patientId === patientId || r.id === patientId);
  return idx === -1 ? null : idx + 1;
}

function getEstimatedWaitCategory(queuePosition, totalWaiting) {
  if (!queuePosition || queuePosition < 1) return null;
  const avgPlacementMinutes = 45;
  const estimatedMinutes = queuePosition * avgPlacementMinutes;
  if (estimatedMinutes <= 30) return { category: 'soon', label: 'Within ~30 min', estimatedMinutes };
  if (estimatedMinutes <= 120) return { category: 'short', label: 'Within 1–2 hours', estimatedMinutes };
  if (estimatedMinutes <= 240) return { category: 'medium', label: 'Within 2–4 hours', estimatedMinutes };
  return { category: 'long', label: 'Over 4 hours – staff will update', estimatedMinutes };
}

function getStatusForPatient(mrn) {
  const patient = findPatientByMrn(mrn);
  if (!patient) return null;

  const onWaitlist = store.waitlist.some(w => w.patientId === patient.id);
  const queuePosition = onWaitlist ? getQueuePosition(patient.id) : null;
  const totalWaiting = store.waitlist.length;
  const waitEstimate = queuePosition ? getEstimatedWaitCategory(queuePosition, totalWaiting) : null;

  const assignedBed = store.beds.find(b => b.patientId === patient.id);
  const status = assignedBed ? 'ASSIGNED' : (onWaitlist ? 'WAITING' : patient.status || 'UNKNOWN');

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

function toPriorityDisplay(level) {
  const map = { CRITICAL: 'Critical', URGENT: 'Urgent', HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' };
  return map[level] || 'Medium';
}

module.exports = {
  findPatientByMrn,
  getQueuePosition,
  getEstimatedWaitCategory,
  getStatusForPatient
};
