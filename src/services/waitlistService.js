const { store, id } = require('../store');

function getWaitlist(withPatient = false) {
  if (!withPatient) return store.waitlist;
  return store.waitlist.map(w => {
    const patient = store.patients.find(p => p.id === w.patientId);
    return { ...w, patient: patient || null };
  });
}

function addToWaitlist(patientId) {
  const patientExists = store.patients.some(p => p.id === patientId);
  if (!patientExists) return null;
  const alreadyOnList = store.waitlist.some(w => w.patientId === patientId);
  if (alreadyOnList) return null;
  const entry = {
    id: id(),
    patientId,
    arrivalTime: new Date().toISOString(),
    addedAt: new Date().toISOString(),
  };
  store.waitlist.push(entry);
  return entry;
}

function removeFromWaitlist(patientId) {
  const idx = store.waitlist.findIndex(w => w.patientId === patientId);
  if (idx === -1) return null;
  const removed = store.waitlist.splice(idx, 1)[0];
  return removed;
}

module.exports = {
  getWaitlist,
  addToWaitlist,
  removeFromWaitlist
};
