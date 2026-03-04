
const { store } = require('../store');

const config = require('../config');

const triageService = require('./triageService');

const bedService = require('./bedService');


function bedSatisfiesRequirement(bedType, requiredType) {
  const allowed = config.bedCompatibility[requiredType];
  if (!allowed) return bedType === requiredType;
  return allowed.includes(bedType);
}


function getMatchQuality(bedType, requiredType) {
  if (bedType === requiredType) return 'exact';
  const allowed = config.bedCompatibility[requiredType];
  if (allowed && allowed.includes(bedType)) return 'compatible';
  return 'overflow';
}


function getNextBedSuggestions(limit = 5) {

  const ranked = triageService.sortWaitlist(
    store.waitlist.map(w => {
      const p = store.patients.find(x => x.id === w.patientId);
      return p ? { ...w, ...p } : null;
    }).filter(Boolean)
  );

  const availableBeds = [...store.beds.filter(b => b.status === 'AVAILABLE')];

  const usedBedIds = new Set();
  
  const usedPatientIds = new Set();
  const suggestions = [];


  for (const patient of ranked) {
    if (suggestions.length >= limit) break;
    if (usedPatientIds.has(patient.patientId)) continue;

    
    const required = patient.requiredBedType || 'GENERAL';
    let best = null;       
    let bestQuality = null; 

    for (const bed of availableBeds) {
      if (usedBedIds.has(bed.id)) continue;
      const quality = getMatchQuality(bed.type, required);
      
      const allowed = quality === 'exact' || quality === 'compatible' || (quality === 'overflow' && config.allowOverflowAssignment);
      if (!allowed) continue;
      
      const score = quality === 'exact' ? 2 : quality === 'compatible' ? 1 : 0;
      const bestScore = bestQuality === 'exact' ? 2 : bestQuality === 'compatible' ? 1 : 0;
      if (!best || score > bestScore) {
        best = bed;
        bestQuality = quality;
      }
    }
    if (!best) continue; 

    usedBedIds.add(best.id);
    usedPatientIds.add(patient.patientId);
    const priorityScore = triageService.computePriority(patient);
    suggestions.push({
      patient: {
        id: patient.id,
        patientId: patient.patientId,
        name: patient.name,
        mrn: patient.mrn,
        priorityLevel: patient.priorityLevel,
        requiredBedType: patient.requiredBedType,
        arrivalTime: patient.arrivalTime
      },
      bed: { id: best.id, label: best.label, type: best.type },
      matchQuality: bestQuality,
      priorityScore: Math.round(priorityScore * 100) / 100
    });
  }

  return suggestions;
}


function getNextBedSuggestion() {
  const list = getNextBedSuggestions(1);
  return list[0] || null;
}

module.exports = {
  bedSatisfiesRequirement,
  getMatchQuality,
  getNextBedSuggestions,
  getNextBedSuggestion
};
