# 🗺️ Backend Implementation Roadmap

Step-by-step guide to build the EchoCipher backend from scratch.

---

## 📊 Implementation Phases

```
Phase 1: Setup ✅
├─ Initialize project
├─ Install dependencies
└─ Create basic server

Phase 2: Core Features 🔄 (You are here)
├─ Audio to Image endpoint
├─ Image to Audio endpoint
└─ File handling

Phase 3: Enhancement
├─ Authentication & Authorization
├─ Database integration
└─ Error handling & validation

Phase 4: Production
├─ Testing
├─ Deployment
└─ Monitoring
```

---

## 🔄 Phase 2: Core Features Implementation

### Feature 1: Audio to Image Conversion

#### 1.1 Create Controller

Create `src/controllers/audio-to-image.ts`:

```typescript
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

export class AudioToImageController {
  async convert(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No audio file uploaded' });
      }

      const conversionId = uuidv4();
      const inputFile = req.file.path;
      const outputDir = path.join(process.env.UPLOAD_DIR!, conversionId);
      const outputFile = path.join(outputDir, 'output.png');

      // Create output directory
      await fs.mkdir(outputDir, { recursive: true });

      // TODO: Implement audio-to-image conversion logic
      // For now, return success response

      return res.status(200).json({
        success: true,
        conversionId,
        status: 'completed',
        outputFile: `/uploads/${conversionId}/output.png`,
        message: 'Audio converted to image successfully',
      });

    } catch (error: any) {
      console.error('Conversion error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Conversion failed',
      });
    }
  }

  async getStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // TODO: Implement status check logic

      return res.json({
        conversionId: id,
        status: 'completed',
        progress: 100,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getResult(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const outputFile = path.join(process.env.UPLOAD_DIR!, id, 'output.png');

      // Check if file exists
      await fs.access(outputFile);

      return res.download(outputFile);
    } catch (error: any) {
      res.status(404).json({
        success: false,
        error: 'Result file not found',
      });
    }
  }
}
```

#### 1.2 Create Service

Create `src/services/audio-to-image.ts`:

```typescript
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs/promises';

export class AudioToImageService {
  async convert(
    inputFile: string,
    outputDir: string,
    options: {
      width?: number;
      height?: number;
      format?: string;
    } = {}
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const outputFile = path.join(outputDir, 'output.png');
      const width = options.width || 800;
      const height = options.height || 600;

      ffmpeg(inputFile)
        .output(outputFile)
        .on('end', () => {
          resolve(outputFile);
        })
        .on('error', (err) => {
          reject(err);
        })
        .run();
    });
  }

  async validateAudio(filePath: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) return reject(err);

        // Check if file has audio stream
        const hasAudio = metadata.streams.some(
          (s: any) => s.codec_type === 'audio'
        );

        resolve(hasAudio);
      });
    });
  }
}
```

#### 1.3 Create Route

Create `src/routes/audio-to-image.ts`:

```typescript
import express, { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { AudioToImageController } from '../controllers/audio-to-image';

const router = Router();

// Configure multer for file uploads
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
    // Only accept audio files
    const audioTypes = [
      'audio/mpeg',
      'audio/wav',
      'audio/flac',
      'audio/aac',
      'audio/mp4',
    ];
    
    if (audioTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files are allowed.'));
    }
  },
});

const controller = new AudioToImageController();

// Routes
router.post('/convert', upload.single('file'), (req, res) =>
  controller.convert(req, res)
);

router.get('/status/:id', (req, res) => controller.getStatus(req, res));

router.get('/result/:id', (req, res) => controller.getResult(req, res));

export default router;
```

---

### Feature 2: Image to Audio Conversion

#### 2.1 Create Controller

Create `src/controllers/image-to-audio.ts`:

```typescript
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

export class ImageToAudioController {
  async convert(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image file uploaded' });
      }

      const conversionId = uuidv4();
      const inputFile = req.file.path;
      const outputDir = path.join(process.env.UPLOAD_DIR!, conversionId);
      const outputFile = path.join(outputDir, 'output.mp3');

      // Create output directory
      await fs.mkdir(outputDir, { recursive: true });

      // TODO: Implement image-to-audio conversion logic

      return res.status(200).json({
        success: true,
        conversionId,
        status: 'completed',
        outputFile: `/uploads/${conversionId}/output.mp3`,
        message: 'Image converted to audio successfully',
      });

    } catch (error: any) {
      console.error('Conversion error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Conversion failed',
      });
    }
  }

  async getStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;

      return res.json({
        conversionId: id,
        status: 'completed',
        progress: 100,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getResult(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const outputFile = path.join(process.env.UPLOAD_DIR!, id, 'output.mp3');

      await fs.access(outputFile);
      return res.download(outputFile);
    } catch (error: any) {
      res.status(404).json({
        success: false,
        error: 'Result file not found',
      });
    }
  }
}
```

#### 2.2 Create Route

Create `src/routes/image-to-audio.ts`:

```typescript
import express, { Router } from 'express';
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
    // Only accept image files
    const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp'];
    
    if (imageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only image files are allowed.'));
    }
  },
});

const controller = new ImageToAudioController();

router.post('/convert', upload.single('file'), (req, res) =>
  controller.convert(req, res)
);

router.get('/status/:id', (req, res) => controller.getStatus(req, res));

router.get('/result/:id', (req, res) => controller.getResult(req, res));

export default router;
```

---

### Step 3: Mount Routes in Main Server

Update `src/index.ts`:

```typescript
import audioToImageRoutes from './routes/audio-to-image';
import imageToAudioRoutes from './routes/image-to-audio';

// Mount API routes
app.use('/api/v1/audio-to-image', audioToImageRoutes);
app.use('/api/v1/image-to-audio', imageToAudioRoutes);
```

---

## 🧪 Testing Endpoints

### Test Audio to Image

```bash
curl -X POST http://localhost:3000/api/v1/audio-to-image/convert \
  -F "file=@audio.mp3"
```

### Test Image to Audio

```bash
curl -X POST http://localhost:3000/api/v1/image-to-audio/convert \
  -F "file=@image.png"
```

### Check Status

```bash
curl http://localhost:3000/api/v1/audio-to-image/status/{conversionId}
```

---

## 📋 Checklist

- [ ] Audio to Image controller created
- [ ] Audio to Image service created
- [ ] Audio to Image routes created
- [ ] Image to Audio controller created
- [ ] Image to Audio routes created
- [ ] Routes mounted in main server
- [ ] Test endpoints working
- [ ] Error handling working
- [ ] File uploads working

---

## ⏭️ Next Steps

1. Implement actual conversion logic (FFmpeg integration)
2. Add progress tracking for long operations
3. Add database to store conversion history
4. Add authentication & authorization
5. Add rate limiting
6. Add request validation
7. Add comprehensive error handling
8. Add unit tests

---

## 🎯 Key Files Created

```
src/
├── controllers/
│   ├── audio-to-image.ts       ✅
│   └── image-to-audio.ts       ✅
├── services/
│   └── audio-to-image.ts       ✅
├── routes/
│   ├── audio-to-image.ts       ✅
│   └── image-to-audio.ts       ✅
└── index.ts                     (Updated)
```

---

**Continue to Phase 3: Enhancement!** 🚀
