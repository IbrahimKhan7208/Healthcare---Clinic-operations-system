const pipelineHandler = require('./pipelineHandler');
const notificationHandler = require('./notificationHandler');

function registerAllHandlers() {
  pipelineHandler.register();
  notificationHandler.register();
  console.log('[eventBus] handlers registered');
}

module.exports = { registerAllHandlers };