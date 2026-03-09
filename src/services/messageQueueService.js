const EventEmitter = require('events');

const messageQueue = new EventEmitter();

messageQueue.on('BED_ASSIGNED', (payload) => {
  const { bedId, patientId, timestamp } = payload;
  
  console.log(`\n[Message Queue] Event received: BED_ASSIGNED for Bed: ${bedId}, Patient: ${patientId}`);
  
  setTimeout(() => {
    console.log(`[Async Task 1] SMS sent to family of patient ${patientId}: "A bed has been assigned."`);
  }, 1500); // 1.5 seconds delay

  setTimeout(() => {
    console.log(`[Async Task 2] Notification sent to Nurse Station: "Prepare bed ${bedId} for patient ${patientId}."`);
  }, 3000); // 3 seconds delay
});

messageQueue.on('BED_RELEASED', (payload) => {
  const { bedId, timestamp } = payload;
  
  console.log(`\n[Message Queue] Event received: BED_RELEASED for Bed: ${bedId}`);
  
  setTimeout(() => {
    console.log(`[Async Task] Notification sent to Cleaning Staff: "Bed ${bedId} needs to be sanitized."`);
  }, 2000); // 2 seconds delay
});

function publishEvent(eventType, payload) {
  messageQueue.emit(eventType, { ...payload, timestamp: new Date().toISOString() });
}

module.exports = {
  publishEvent
};