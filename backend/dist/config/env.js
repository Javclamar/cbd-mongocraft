"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const requiredEnvVars = [
    'MONGO_URI',
    'MONGO_SANDBOX_URI',
    'JWT_SECRET',
    'PORT',
];
requiredEnvVars.forEach((envVar) => {
    if (!process.env[envVar]) {
        console.warn(`Missing env var: ${envVar}`);
    }
});
exports.config = {
    port: parseInt(process.env.PORT || '3001', 10),
    mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/mongocraft',
    mongoSandboxUri: process.env.MONGO_SANDBOX_URI || 'mongodb://localhost:27017',
    jwtSecret: process.env.JWT_SECRET || 'dev_secret_change_in_production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    nodeEnv: process.env.NODE_ENV || 'development',
    rateLimit: {
        windowMs: 60 * 1000,
        max: 10,
    },
    queryTimeout: 5000,
};
//# sourceMappingURL=env.js.map