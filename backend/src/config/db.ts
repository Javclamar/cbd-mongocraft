import mongoose from 'mongoose';
import { Db, MongoClient } from 'mongodb';
import { config } from './env';

let sandboxClient: MongoClient | null = null;
let sandboxDb: Db | null = null;

export const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(config.mongoUri);

    if (!sandboxClient) {
      sandboxClient = new MongoClient(config.mongoSandboxUri, {
        maxPoolSize: 10,
      });
    }

    if (!sandboxDb) {
      await sandboxClient.connect();
      sandboxDb = sandboxClient.db(config.sandboxDbName);
    }
  } catch (err) {
    console.error('Error connecting to databases:', err);
    process.exit(1);
  }
};

export const getSandboxDb = (): Db => {
  if (!sandboxDb) {
    throw new Error('Sandbox DB is not connected');
  }

  return sandboxDb;
};

export const getDbStatus = (): { platform: string; sandbox: string } => {
  return {
    platform: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    sandbox: sandboxDb ? 'connected' : 'disconnected',
  };
};

export const disconnectDB = async (): Promise<void> => {
  await mongoose.disconnect();

  if (sandboxClient) {
    await sandboxClient.close();
    sandboxClient = null;
    sandboxDb = null;
  }
};
