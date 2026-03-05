const { store } = require('../store');
const config = require('../config');

function getAvailableBeds(bedType = null) {
  const beds = store.beds.filter(bed => bed.status === 'AVAILABLE');
  if (bedType) {
    return beds.filter(bed => bed.type === bedType);
  }
  return beds;
}

function getBedById(bedId) {
  return store.beds.find(bed => bed.id === bedId)
}

function assignPatientToBed(bedId, patientId) {
  const bed = getBedById(bedId);
  if (!bed || bed.status !== 'AVAILABLE') return null;
  bed.status = 'OCCUPIED';
  bed.patientId = patientId;
  bed.occupiedAt = new Date().toISOString();
  return bed;
}

function releaseBed(bedId) {
  const bed = getBedById(bedId);
  if (!bed) return null;
  bed.status = 'AVAILABLE';
  bed.patientId = null;
  bed.occupiedAt = null;
  return bed;
}

function suggestBedForPatient(patient) {
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
