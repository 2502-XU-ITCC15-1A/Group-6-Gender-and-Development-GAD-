import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

export const connectDB = async () => {
  // Default to the GIMS database name unless explicitly overridden
  const configuredUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/gims';
  const useMemory = String(process.env.USE_IN_MEMORY_DB || '').toLowerCase() === 'true';

  try {
    if (useMemory) {
      try {
        const mongod = await MongoMemoryServer.create({
          instance: { port: 0 },
        });
        const memUri = mongod.getUri('gims');
        await mongoose.connect(memUri, { serverSelectionTimeoutMS: 5000 });
        console.log('Connected to in-memory MongoDB (gims)');
        return;
      } catch (memErr) {
        console.warn(
          'In-memory MongoDB failed to start; falling back to configured MongoDB URI.',
          memErr?.message || memErr
        );
      }
    }

    await mongoose.connect(configuredUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('Connected to MongoDB (gims)');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    throw err;
  }
};

