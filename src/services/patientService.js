const { store, id } = require('../store');

function getPatients() {
  return store.patients;
}

function getPatientById(patientId) {
  const patient = store.patients.find(p => p.id === patientId);
  return patient;
}

function createPatient(body) {
  const patientId = id();
  const patient = {
    id: patientId,
    name: (body && body.name) || 'Unknown',
    mrn:  (body && body.mrn) || '',
    priorityLevel: (body && body.priorityLevel) || 'MEDIUM',
    requiredBedType: (body && body.requiredBedType) || 'GENERAL',
    notes: (body && body.notes) || '',
    arrivalTime: (body && body.arrivalTime) || new Date().toISOString(),
    status: 'WAITING',
  };
  store.patients.push(patient);
  return patient;
}

// updatePatient: allow PATCH to update patient fields (including mrn for patient-portal lookup).
// Changes from original:
// - Added 'mrn' to allowed so PATCH can set/update MRN (was: ['name', 'priorityLevel', 'requiredBedType', 'status', 'notes']).
// - Added guard so missing/invalid body does not throw (was: no guard; forEach ran on undefined).
// Original allowed: const allowed = ['name', 'priorityLevel', 'requiredBedType', 'status', 'notes'];
function updatePatient(patientId, body) {
  const patient = getPatientById(patientId);
  if (!patient) return null;
  if (!body || typeof body !== 'object') return patient;
  const allowed = ['name', 'mrn', 'priorityLevel', 'requiredBedType', 'status', 'notes'];
  allowed.forEach(k => {
    if (body[k] !== undefined) patient[k] = body[k];
  });
  return patient;
}

module.exports = {
  getPatients,
  getPatientById,
  createPatient,
  updatePatient
};
