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
