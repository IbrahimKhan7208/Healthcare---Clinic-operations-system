const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');

  mongoose.set('strictQuery', true);

  await mongoose.connect(uri);
  console.log('MongoDB connected');

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
  });

  return mongoose.connection;
}

module.exports = connectDB;