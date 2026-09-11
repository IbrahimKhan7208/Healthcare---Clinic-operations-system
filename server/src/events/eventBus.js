const EventEmitter = require('events');

class ClinicEventBus extends EventEmitter {}

const bus = new ClinicEventBus();
bus.setMaxListeners(50);

function emitEvent(eventName, payload) {
  console.log(`[event] ${eventName}`, JSON.stringify(payload));
  bus.emit(eventName, payload);
}

module.exports = { bus, emitEvent };