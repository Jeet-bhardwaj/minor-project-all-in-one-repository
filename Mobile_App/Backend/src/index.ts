import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import conversionRoutes from './routes/conversionRoutes';
import { connectDB, isDBConnected } from './config/database';
import Logger from './utils/logger';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Initialize database connection
(async () => {
  try {
    await connectDB();
  } catch (error) {
    Logger.error('STARTUP', 'Failed to connect to MongoDB');
    process.exit(1);
  }
})();

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: process.env.CORS_CREDENTIALS === 'true',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Conversion API routes
app.use('/api', conversionRoutes);

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  const requestId = uuidv4();
  Logger.debug('API', `${req.method} ${req.path}`, { requestId });
  next();
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: isDBConnected() ? 'connected' : 'disconnected'
  });
});

// API Routes placeholder
app.get('/api/status', (_req: Request, res: Response) => {
  res.json({
    message: 'EchoCipher Backend API',
    version: '1.0.0',
    database: isDBConnected() ? 'connected' : 'disconnected',
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
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${_req.method} ${_req.path} not found`,
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  Logger.error('API', `Request error: ${err.message}`);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  Logger.info('STARTUP', `🚀 EchoCipher Backend running on port ${PORT}`);
  Logger.info('STARTUP', `📝 Health check: http://localhost:${PORT}/health`);
  Logger.info('STARTUP', `🔧 API Status: http://localhost:${PORT}/api/status`);
  Logger.info('STARTUP', `🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  Logger.info('STARTUP', `🗄️  Database: ${isDBConnected() ? 'Connected' : 'Connecting...'}`);
});

export default app;
