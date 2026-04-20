import app from './app';
import { connectDB } from './config/db';
import { config } from './config/env';

const startServer = async (): Promise<void> => {
  try {
    await connectDB();

    app.listen(config.port, () => {
      console.log(`Server listening on port ${config.port}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

void startServer();
