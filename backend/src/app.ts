import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import { getDbStatus } from './config/db';
import { config } from './config/env';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import challengeRoutes from './routes/challenges';
import submissionRoutes from './routes/submissions';
import userRoutes from './routes/users';

const app = express();
/*
const apiLimiter = rateLimit({
	windowMs: config.rateLimit.windowMs,
	max: config.rateLimit.max,
	standardHeaders: true,
	legacyHeaders: false,
});
*/
app.use(helmet());
app.use(
	cors({
		origin: config.corsOrigin,
		credentials: true,
	}),
);
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());
//app.use('/api', apiLimiter);

app.get('/api/health', (_req, res) => {
	const dbStatus = getDbStatus();

	res.json({
		status: 'ok',
		db: dbStatus,
		timestamp: new Date().toISOString(),
	});
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/users', userRoutes);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
	console.error('Unhandled error:', err);
	res.status(500).json({ message: 'Internal server error' });
});

export default app;