require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/db');
const { registerAllHandlers } = require('./events/handlers');

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();
  registerAllHandlers();
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});