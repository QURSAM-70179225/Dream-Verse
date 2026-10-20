import mongoose from 'mongoose';
import { env } from './env.js';

mongoose.set('strictQuery', true);
// If the database is down, fail requests after 2s with a clear error instead of hanging for 10s.
mongoose.set('bufferTimeoutMS', 2000);

export async function connectDB({ quiet = false } = {}) {
  try {
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log('MongoDB connected');
    return true;
  } catch (err) {
    if (!quiet) {
      console.error(
        `MongoDB connection failed: ${err.message}\n` +
          'The API will keep retrying every 5 seconds. Start MongoDB or fix MONGODB_URI in server/.env.'
      );
    }
    return false;
  }
}

// 0 disconnected, 1 connected, 2 connecting, 3 disconnecting
export function dbStatus() {
  return mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
}
