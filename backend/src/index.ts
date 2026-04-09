import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import mongoose from 'mongoose';
import morgan from 'morgan';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongo:27017/mongocraft';

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(morgan('dev'));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

mongoose
  .connect(MONGO_URI)
  .then(() => {
    app.listen(PORT, () => {
    });
  })
  .catch((err) => {
    process.exit(1);
  });
