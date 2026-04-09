import mongoose from 'mongoose';
import { config } from './env';

export const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(config.mongoUri);
  } catch (err) {
    process.exit(1);
  }
};
