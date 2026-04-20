import dotenv from 'dotenv';
dotenv.config();

const requiredEnvVars = [
  'MONGO_URI',
  'MONGO_SANDBOX_URI',
  'JWT_SECRET',
  'PORT',
];

const parsedEvaluationMaxResults = parseInt(
  process.env.EVALUATION_MAX_RESULTS || '100',
  10,
);

const evaluationMaxResults = Number.isNaN(parsedEvaluationMaxResults)
  ? 100
  : Math.min(Math.max(parsedEvaluationMaxResults, 10), 500);

requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    console.warn(`Missing env var: ${envVar}`);
  }
});

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/mongocraft',
  mongoSandboxUri:
    process.env.MONGO_SANDBOX_URI || 'mongodb://localhost:27017/mongocraft_sandbox',
  sandboxDbName: process.env.SANDBOX_DB_NAME || 'mongocraft_sandbox',
  jwtSecret: process.env.JWT_SECRET || 'dev_secret_change_in_production',
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  jwtRefreshSecret:
    process.env.JWT_REFRESH_SECRET ||
    `${process.env.JWT_SECRET || 'dev_secret_change_in_production'}_refresh`,
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  authCookieName: process.env.AUTH_COOKIE_NAME || 'mongocraft_refresh_token',
  authCookieSecure: process.env.AUTH_COOKIE_SECURE === 'true',
  nodeEnv: process.env.NODE_ENV || 'development',
  rateLimit: {
    windowMs: 60 * 1000,
    max: 10,
  },
  queryTimeout: 5000,
  evaluationMaxResults,
};
