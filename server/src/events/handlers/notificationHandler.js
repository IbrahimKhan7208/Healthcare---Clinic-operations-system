const { bus } = require('../eventBus');
const { EVENTS } = require('../eventTypes');

function register() {
  bus.on(EVENTS.APPOINTMENT_CREATED, (payload) => {
    console.log(
      `[notification][STUB] Would WhatsApp patient ${payload.patientId}: "Your appointment is confirmed for ${payload.datetime}."`
    );
  });

  bus.on(EVENTS.APPOINTMENT_RESCHEDULED, (payload) => {
    console.log(
      `[notification][STUB] Would WhatsApp patient ${payload.patientId}: "Your appointment has been moved to ${payload.newDatetime}."`
    );
  });

  bus.on(EVENTS.APPOINTMENT_CANCELLED, (payload) => {
    console.log(
      `[notification][STUB] Would WhatsApp patient ${payload.patientId}: "Your appointment scheduled for ${payload.datetime} has been cancelled."`
    );
  });
}

module.exports = { register };
