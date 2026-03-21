const EventEmitter = require('events');

const EXCHANGE = 'icu.events';
const QUEUE = 'icu.bed.notifications';

/** @type {import('amqplib').Connection | null} */
let rabbitConnection = null;
/** @type {import('amqplib').Channel | null} */
let rabbitChannel = null;

const memoryBus = new EventEmitter();

function handleBedAssigned(payload) {
  const { bedId, patientId, timestamp } = payload;
  console.log(`\n[Message Queue] Event received: BED_ASSIGNED for Bed: ${bedId}, Patient: ${patientId}`);

  setTimeout(() => {
    console.log(`[Async Task 1] SMS sent to family of patient ${patientId}: "A bed has been assigned."`);
  }, 1500);

  setTimeout(() => {
    console.log(`[Async Task 2] Notification sent to Nurse Station: "Prepare bed ${bedId} for patient ${patientId}."`);
  }, 3000);
}

function handleBedReleased(payload) {
  const { bedId, timestamp } = payload;
  console.log(`\n[Message Queue] Event received: BED_RELEASED for Bed: ${bedId}`);

  setTimeout(() => {
    console.log(`[Async Task] Notification sent to Cleaning Staff: "Bed ${bedId} needs to be sanitized."`);
  }, 2000);
}

function dispatchEvent(eventType, payload) {
  if (eventType === 'BED_ASSIGNED') handleBedAssigned(payload);
  else if (eventType === 'BED_RELEASED') handleBedReleased(payload);
}

function eventTypeToRoutingKey(eventType) {
  if (eventType === 'BED_ASSIGNED') return 'bed.assigned';
  if (eventType === 'BED_RELEASED') return 'bed.released';
  return eventType.toLowerCase().replace(/_/g, '.');
}

function wireMemoryListeners() {
  memoryBus.removeAllListeners();
  memoryBus.on('BED_ASSIGNED', handleBedAssigned);
  memoryBus.on('BED_RELEASED', handleBedReleased);
}

function publishMemory(eventType, payload) {
  memoryBus.emit(eventType, payload);
}

function publishRabbit(eventType, payload) {
  if (!rabbitChannel) throw new Error('RabbitMQ channel not ready');
  const routingKey = eventTypeToRoutingKey(eventType);
  const body = Buffer.from(JSON.stringify({ eventType, ...payload }));
  const ok = rabbitChannel.publish(EXCHANGE, routingKey, body, { persistent: true });
  if (!ok) console.warn('[RabbitMQ] publish buffer full; message may be dropped');
}

/**
 * @param {import('amqplib').ConsumeMessage | null} msg
 */
function onRabbitMessage(msg) {
  if (!msg || !rabbitChannel) return;
  try {
    const data = JSON.parse(msg.content.toString());
    const { eventType, ...rest } = data;
    dispatchEvent(eventType, rest);
  } catch (e) {
    console.error('[RabbitMQ] Invalid message:', e.message);
  } finally {
    rabbitChannel.ack(msg);
  }
}

async function setupRabbitConsumer(url) {
  const amqp = require('amqplib');
  rabbitConnection = await amqp.connect(url);
  rabbitChannel = await rabbitConnection.createChannel();

  await rabbitChannel.assertExchange(EXCHANGE, 'topic', { durable: true });
  await rabbitChannel.assertQueue(QUEUE, { durable: true });
  await rabbitChannel.bindQueue(QUEUE, EXCHANGE, 'bed.*');

  await rabbitChannel.prefetch(1);
  await rabbitChannel.consume(QUEUE, onRabbitMessage, { noAck: false });

  rabbitConnection.on('error', (err) => {
    console.error('[RabbitMQ] connection error:', err.message);
  });
  rabbitConnection.on('close', () => {
    rabbitChannel = null;
    rabbitConnection = null;
  });
}

let useRabbit = false;

/**
 * Call once before accepting HTTP traffic. Uses RabbitMQ when RABBITMQ_URL is set.
 */
async function init() {
  const url = process.env.RABBITMQ_URL;
  if (!url) {
    wireMemoryListeners();
    useRabbit = false;
    console.log('[Message Queue] Using in-memory EventEmitter (set RABBITMQ_URL to use RabbitMQ)');
    return;
  }

  await setupRabbitConsumer(url);
  useRabbit = true;
  console.log(`[Message Queue] RabbitMQ connected (${EXCHANGE} / ${QUEUE})`);
}

async function close() {
  if (rabbitChannel) {
    try {
      await rabbitChannel.close();
    } catch (_) {}
    rabbitChannel = null;
  }
  if (rabbitConnection) {
    try {
      await rabbitConnection.close();
    } catch (_) {}
    rabbitConnection = null;
  }
}

function publishEvent(eventType, payload) {
  const enriched = { ...payload, timestamp: new Date().toISOString() };
  if (useRabbit) {
    try {
      publishRabbit(eventType, enriched);
    } catch (err) {
      console.error('[RabbitMQ] publish failed:', err.message);
    }
    return;
  }
  publishMemory(eventType, enriched);
}

module.exports = {
  init,
  close,
  publishEvent,
};
