# 🛠️ Backend Implementation Guide

Complete step-by-step guide to implement the EchoCipher backend.

---

## 📋 Table of Contents

1. [Initial Setup](#initial-setup)
2. [Project Structure](#project-structure)
3. [Core Implementation](#core-implementation)
4. [Database Integration](#database-integration)
5. [Testing](#testing)
6. [Deployment](#deployment)

---

## 🚀 Initial Setup

### Step 1: Initialize Project

```bash
cd Mobile_App/Backend
npm init -y
```

### Step 2: Install Dependencies

```bash
# Core dependencies
npm install express typescript ts-node dotenv cors uuid

# Development
npm install -D @types/express @types/node @types/cors nodemon

# File processing
npm install multer sharp fluent-ffmpeg
npm install -D @types/multer

# Database
npm install mongoose
# OR: npm install pg
```

### Step 3: Create TypeScript Config

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

### Step 4: Update package.json

```json
{
  "name": "echocipher-backend",
  "version": "1.0.0",
  "main": "dist/index.js",
  "scripts": {
    "dev": "ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "watch": "tsc --watch"
  }
}
```

### Step 5: Create .env

```bash
PORT=3000
NODE_ENV=development
DATABASE_URL=mongodb://localhost:27017/echocipher
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=104857600
JWT_SECRET=your_secret_key
ALLOWED_ORIGINS=http://localhost:8081,http://localhost:3000
FFMPEG_PATH=ffmpeg
```

---

## 📁 Project Structure

```
Backend/
├── src/
│   ├── index.ts                 # Entry point
│   ├── config/
│   │   ├── database.ts         # DB config
│   │   └── ffmpeg.ts           # FFmpeg config
│   ├── controllers/
│   │   ├── audio-to-image.ts   # Audio→Image logic
│   │   └── image-to-audio.ts   # Image→Audio logic
│   ├── services/
│   │   ├── audio-to-image.ts   # Conversion service
│   │   └── image-to-audio.ts
│   ├── routes/
│   │   ├── audio-to-image.ts   # Route handlers
│   │   └── image-to-audio.ts
│   ├── models/
│   │   ├── Conversion.ts       # DB schema
│   │   └── User.ts             # User schema
│   ├── middleware/
│   │   ├── auth.ts             # Authentication
│   │   ├── error.ts            # Error handling
│   │   └── validation.ts       # Input validation
│   └── utils/
│       ├── logger.ts           # Logging
│       └── helpers.ts          # Utilities
├── uploads/                    # File storage
├── dist/                       # Compiled JS
├── package.json
├── tsconfig.json
├── .env
└── .gitignore
```

---

## 🔨 Core Implementation

### Step 1: Create Entry Point

Create `src/index.ts`:

```typescript
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;

// ============ Middleware ============
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(','),
  credentials: true,
}));

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Ensure uploads directory exists
(async () => {
  try {
    await fs.mkdir(process.env.UPLOAD_DIR!, { recursive: true });
  } catch (err) {
    console.error('Failed to create uploads directory:', err);
  }
})();

// ============ Routes ============
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'Server running ✅',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
  });
});

// Import and mount routes (will create these)
// app.use('/api/v1/audio-to-image', audioToImageRoutes);
// app.use('/api/v1/image-to-audio', imageToAudioRoutes);

// ============ Error Handler ============
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' 
      ? err.message 
      : 'Internal server error',
    code: err.code || 'SERVER_ERROR',
    timestamp: new Date().toISOString(),
  });
});

// ============ 404 Handler ============
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
  });
});

// ============ Start Server ============
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   🎵 EchoCipher Backend Server         ║
╚════════════════════════════════════════╝

🚀 Server running on port ${PORT}
🌐 Visit http://localhost:${PORT}
🏥 Health: http://localhost:${PORT}/health

Environment: ${process.env.NODE_ENV}
Uploads: ${process.env.UPLOAD_DIR}
  `);
});
```

### Step 2: Create Audio to Image Controller

Create `src/controllers/audio-to-image.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

export class AudioToImageController {
  async convert(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No audio file uploaded',
          code: 'FILE_REQUIRED',
        });
      }

      const conversionId = uuidv4();
      const inputFile = req.file.path;
      const outputDir = path.join(process.env.UPLOAD_DIR!, conversionId);
      const outputFile = path.join(outputDir, 'output.png');

      // Create output directory
      await fs.mkdir(outputDir, { recursive: true });

      // TODO: Implement FFmpeg audio-to-image conversion
      // For now, simulate with success response

      // Clean up input file
      await fs.unlink(inputFile).catch(() => {});

      return res.status(200).json({
        success: true,
        conversionId,
        status: 'completed',
        outputFile: `/uploads/${conversionId}/output.png`,
        duration: 2.5,
        fileSize: req.file.size,
        message: 'Audio converted to image successfully',
      });

    } catch (error) {
      next(error);
    }
  }

  async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // TODO: Fetch from database or cache
      // For now, return mock status

      res.json({
        conversionId: id,
        status: 'completed',
        progress: 100,
        elapsedTime: 2.5,
      });

    } catch (error) {
      next(error);
    }
  }

  async getResult(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const outputFile = path.join(process.env.UPLOAD_DIR!, id, 'output.png');

      // Check if file exists
      try {
        await fs.access(outputFile);
      } catch {
        return res.status(404).json({
          success: false,
          error: 'Result file not found',
          code: 'FILE_NOT_FOUND',
        });
      }

      res.download(outputFile);

    } catch (error) {
      next(error);
    }
  }
}
```

### Step 3: Create Audio to Image Route

Create `src/routes/audio-to-image.ts`:

```typescript
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { AudioToImageController } from '../controllers/audio-to-image';

const router = Router();

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR!);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE!),
  },
  fileFilter: (req, file, cb) => {
    const audioTypes = [
      'audio/mpeg',      // MP3
      'audio/wav',       // WAV
      'audio/flac',      // FLAC
      'audio/aac',       // AAC
      'audio/mp4',       // M4A
    ];

    if (audioTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}`));
    }
  },
});

const controller = new AudioToImageController();

// Routes
router.post('/convert', upload.single('file'), (req, res, next) =>
  controller.convert(req, res, next)
);

router.get('/status/:id', (req, res, next) =>
  controller.getStatus(req, res, next)
);

router.get('/result/:id', (req, res, next) =>
  controller.getResult(req, res, next)
);

export default router;
```

### Step 4: Create Image to Audio Controller & Route

Create `src/controllers/image-to-audio.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

export class ImageToAudioController {
  async convert(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No image file uploaded',
          code: 'FILE_REQUIRED',
        });
      }

      const conversionId = uuidv4();
      const inputFile = req.file.path;
      const outputDir = path.join(process.env.UPLOAD_DIR!, conversionId);
      const outputFile = path.join(outputDir, 'output.mp3');

      // Create output directory
      await fs.mkdir(outputDir, { recursive: true });

      // TODO: Implement FFmpeg image-to-audio conversion

      // Clean up input file
      await fs.unlink(inputFile).catch(() => {});

      res.status(200).json({
        success: true,
        conversionId,
        status: 'completed',
        outputFile: `/uploads/${conversionId}/output.mp3`,
        duration: 3.2,
        fileSize: req.file.size,
        message: 'Image converted to audio successfully',
      });

    } catch (error) {
      next(error);
    }
  }

  async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      res.json({
        conversionId: id,
        status: 'completed',
        progress: 100,
        elapsedTime: 3.2,
      });

    } catch (error) {
      next(error);
    }
  }

  async getResult(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const outputFile = path.join(process.env.UPLOAD_DIR!, id, 'output.mp3');

      try {
        await fs.access(outputFile);
      } catch {
        return res.status(404).json({
          success: false,
          error: 'Result file not found',
          code: 'FILE_NOT_FOUND',
        });
      }

      res.download(outputFile);

    } catch (error) {
      next(error);
    }
  }
}
```

Create `src/routes/image-to-audio.ts`:

```typescript
import { Router } from 'express';
import multer from 'multer';
import { ImageToAudioController } from '../controllers/image-to-audio';

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR!);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE!),
  },
  fileFilter: (req, file, cb) => {
    const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp'];

    if (imageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}`));
    }
  },
});

const controller = new ImageToAudioController();

router.post('/convert', upload.single('file'), (req, res, next) =>
  controller.convert(req, res, next)
);

router.get('/status/:id', (req, res, next) =>
  controller.getStatus(req, res, next)
);

router.get('/result/:id', (req, res, next) =>
  controller.getResult(req, res, next)
);

export default router;
```

### Step 5: Mount Routes in Main Server

Update `src/index.ts` to include:

```typescript
import audioToImageRoutes from './routes/audio-to-image';
import imageToAudioRoutes from './routes/image-to-audio';

// ... after other middleware ...

// Mount API routes
app.use('/api/v1/audio-to-image', audioToImageRoutes);
app.use('/api/v1/image-to-audio', imageToAudioRoutes);

// ... rest of error handling ...
```

---

## 🧪 Testing

### Start Development Server

```bash
npm run dev
```

### Test Health Endpoint

```bash
curl http://localhost:3000/health
```

### Test Audio to Image

```bash
curl -X POST http://localhost:3000/api/v1/audio-to-image/convert \
  -F "file=@sample.mp3"
```

### Test Image to Audio

```bash
curl -X POST http://localhost:3000/api/v1/image-to-audio/convert \
  -F "file=@sample.png"
```

---

## 🚀 Running the Backend

### Development Mode

```bash
npm run dev
```

### Build for Production

```bash
npm run build
npm start
```

---

**Next**: Add database integration and authentication! 🎉
