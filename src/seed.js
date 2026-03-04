const { store, id } = require('./store');

function seed() {
  
  store.patients = [
    
    { id: id(), name: 'Patient A', mrn: 'MRN001', priorityLevel: 'CRITICAL', requiredBedType: 'ICU', arrivalTime: new Date().toISOString(), status: 'WAITING', notes: '' },
    
    { id: id(), name: 'Patient B', mrn: 'MRN002', priorityLevel: 'URGENT', requiredBedType: 'ICU', arrivalTime: new Date(Date.now() - 3600000).toISOString(), status: 'WAITING', notes: '' },
    
    { id: id(), name: 'Patient C', mrn: 'MRN003', priorityLevel: 'HIGH', requiredBedType: 'GENERAL', arrivalTime: new Date().toISOString(), status: 'WAITING', notes: '' }
  ];
  
  store.beds = [
    { id: id(), label: 'ICU-1', type: 'ICU', status: 'AVAILABLE', patientId: null, occupiedAt: null },
    { id: id(), label: 'ICU-2', type: 'ICU', status: 'AVAILABLE', patientId: null, occupiedAt: null },
    { id: id(), label: 'GEN-1', type: 'GENERAL', status: 'AVAILABLE', patientId: null, occupiedAt: null }
  ];
  
  store.waitlist = store.patients.slice(0, 2).map(p => ({
    id: id(),
    patientId: p.id,
    arrivalTime: p.arrivalTime,
    addedAt: new Date().toISOString()
  }));
  console.log('Seeded:', store.patients.length, 'patients,', store.beds.length, 'beds,', store.waitlist.length, 'waitlist entries');
}


seed();
