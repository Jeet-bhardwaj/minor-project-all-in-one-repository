"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const uuid_1 = require("uuid");
const conversionRoutes_1 = __importDefault(require("./routes/conversionRoutes"));
const database_1 = require("./config/database");
const logger_1 = __importDefault(require("./utils/logger"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Initialize database connection
(async () => {
    try {
        await (0, database_1.connectDB)();
    }
    catch (error) {
        logger_1.default.error('STARTUP', 'Failed to connect to MongoDB');
        process.exit(1);
    }
})();
// Middleware
app.use((0, cors_1.default)({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: process.env.CORS_CREDENTIALS === 'true',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ limit: '50mb', extended: true }));
// Conversion API routes
app.use('/api', conversionRoutes_1.default);
// Request logging middleware
app.use((req, _res, next) => {
    const requestId = (0, uuid_1.v4)();
    logger_1.default.debug('API', `${req.method} ${req.path}`, { requestId });
    next();
});
// Health check endpoint
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        database: (0, database_1.isDBConnected)() ? 'connected' : 'disconnected'
    });
});
// API Routes placeholder
app.get('/api/status', (_req, res) => {
    res.json({
        message: 'EchoCipher Backend API',
        version: '1.0.0',
        database: (0, database_1.isDBConnected)() ? 'connected' : 'disconnected',
        endpoints: {
            'POST /api/audio-to-image': 'Convert audio to image',
            'POST /api/image-to-audio': 'Convert image to audio',
            'GET /api/conversions': 'List all conversions',
            'GET /api/conversions/:id': 'Get conversion details',
            'DELETE /api/conversions/:id': 'Delete a conversion',
            'GET /health': 'Server health check'
        }
    });
});
// 404 handler
app.use((_req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${_req.method} ${_req.path} not found`,
        timestamp: new Date().toISOString()
    });
});
// Error handler
app.use((err, _req, res, _next) => {
    logger_1.default.error('API', `Request error: ${err.message}`);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
        timestamp: new Date().toISOString()
    });
});
// Start server
app.listen(PORT, () => {
    logger_1.default.info('STARTUP', `🚀 EchoCipher Backend running on port ${PORT}`);
    logger_1.default.info('STARTUP', `📝 Health check: http://localhost:${PORT}/health`);
    logger_1.default.info('STARTUP', `🔧 API Status: http://localhost:${PORT}/api/status`);
    logger_1.default.info('STARTUP', `🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger_1.default.info('STARTUP', `🗄️  Database: ${(0, database_1.isDBConnected)() ? 'Connected' : 'Connecting...'}`);
});
exports.default = app;
//# sourceMappingURL=index.js.map