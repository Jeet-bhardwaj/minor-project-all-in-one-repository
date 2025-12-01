import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import conversionRoutes from './routes/conversionRoutes';
import authRoutes from './routes/authRoutes';
import { connectDB, isDBConnected } from './config/database';
import { initGridFS } from './services/gridfsService';
import Logger from './utils/logger';

dotenv.config();

const app: Express = express();
const PORT = Number(process.env.PORT) || 3000;

// Initialize database connection and GridFS
(async () => {
  try {
    await connectDB();
    Logger.info('STARTUP', '✅ MongoDB connected successfully');
    
    // Initialize GridFS
    initGridFS();
    Logger.info('STARTUP', '✅ GridFS initialized successfully');
  } catch (error) {
    Logger.error('STARTUP', 'Failed to connect to MongoDB');
    process.exit(1);
  }
})();

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'localhost',
      '127.0.0.1',
      '192.168.29.67', // Your local machine IP
      /^192\.168\.\d+\.\d+$/, // Allow any 192.168.x.x IP
      /^10\.\d+\.\d+\.\d+$/, // Allow any 10.x.x.x IP
      'http://localhost',
      'http://127.0.0.1',
      process.env.ALLOWED_ORIGINS
    ];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return origin.includes(allowed);
      } else if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return false;
    });
    
    callback(null, isAllowed);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Number'],
  maxAge: 3600
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Authentication routes
app.use('/api', authRoutes);

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

// Start server - listen on all network interfaces (0.0.0.0) to allow phone connections
app.listen(PORT, '0.0.0.0', () => {
  Logger.info('STARTUP', `🚀 EchoCipher Backend running on port ${PORT}`);
  Logger.info('STARTUP', `📝 Health check: http://localhost:${PORT}/health`);
  Logger.info('STARTUP', `📱 Mobile access: http://<your-machine-ip>:${PORT}/health`);
  Logger.info('STARTUP', `🔧 API Status: http://localhost:${PORT}/api/status`);
  Logger.info('STARTUP', `🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  Logger.info('STARTUP', `🗄️  Database: ${isDBConnected() ? 'Connected' : 'Connecting...'}`);
});

export default app;
