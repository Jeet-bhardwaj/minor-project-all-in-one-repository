# 🛠️ Backend Setup Guide - EchoCipher

Complete step-by-step guide to set up the EchoCipher backend server.

## 📋 Prerequisites

Before starting, ensure you have:
- **Node.js** (v16+)
- **npm** or **yarn**
- **TypeScript** (will be installed)
- **FFmpeg** (for audio/image processing)
- **Git** (for version control)

## 🚀 Setup Steps

### Step 1: Initialize Backend Project

```bash
cd Mobile_App/EchoCipher_App_Backend

# Initialize npm project
npm init -y
```

### Step 2: Install Core Dependencies

```bash
# Express and TypeScript
npm install express typescript ts-node dotenv cors uuid

# Development dependencies
npm install -D @types/express @types/node @types/cors nodemon

# File processing
npm install multer sharp fluent-ffmpeg

# Database (choose one)
npm install mongoose  # for MongoDB
# OR
npm install pg        # for PostgreSQL
```

### Step 3: Create TypeScript Configuration

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
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Step 4: Update package.json Scripts

```json
{
  "scripts": {
    "dev": "ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "watch": "tsc --watch",
    "test": "jest"
  }
}
```

### Step 5: Create Environment File

Create `.env`:

```
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=mongodb://localhost:27017/echocipher
# OR
DATABASE_URL=postgres://user:password@localhost:5432/echocipher

# File Storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=104857600  # 100MB in bytes

# JWT
JWT_SECRET=your_super_secret_key_change_in_production
JWT_EXPIRE=7d

# Cors
ALLOWED_ORIGINS=http://localhost:8081,http://localhost:3000

# FFmpeg
FFMPEG_PATH=/usr/bin/ffmpeg  # Adjust for your OS
```

### Step 6: Create Project Structure

```bash
mkdir -p src/{config,controllers,routes,services,middleware,utils}
```

### Step 7: Create Entry Point

Create `src/index.ts`:

```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(','),
}));
app.use(express.json());
app.use(express.urlencoded({ limit: '100mb' }));

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'Server running ✅' });
});

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Visit http://localhost:${PORT}`);
});
```

### Step 8: Test Setup

```bash
npm run dev
```

You should see:
```
🚀 Server running on port 3000
🌐 Visit http://localhost:3000
```

Visit `http://localhost:3000/health` - you should get:
```json
{
  "status": "Server running ✅"
}
```

## 🔧 FFmpeg Installation

### Windows
```bash
# Using Chocolatey
choco install ffmpeg

# Or download from: https://ffmpeg.org/download.html
```

### macOS
```bash
# Using Homebrew
brew install ffmpeg
```

### Linux (Ubuntu/Debian)
```bash
sudo apt-get install ffmpeg
```

Verify installation:
```bash
ffmpeg -version
```

## 📦 Install Database

### MongoDB (Recommended for rapid development)

```bash
# Windows - Download from mongodb.com
# Or use Docker
docker run -d -p 27017:27017 --name mongodb mongo

# macOS
brew install mongodb-community

# Linux
sudo apt-get install mongodb
```

### PostgreSQL

```bash
# Windows - Download installer
# macOS
brew install postgresql

# Linux
sudo apt-get install postgresql
```

## 🗂️ Create Basic File Structure

### 1. Create `src/config/database.ts`

```typescript
import mongoose from 'mongoose';

export async function connectDB() {
  try {
    await mongoose.connect(process.env.DATABASE_URL!);
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ DB connection failed:', error);
    process.exit(1);
  }
}
```

### 2. Create `src/middleware/error.ts`

```typescript
export const errorHandler = (err: any, req: any, res: any, next: any) => {
  console.error('Error:', err);
  
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(status).json({
    success: false,
    status,
    message,
    error: process.env.NODE_ENV === 'development' ? err : undefined,
  });
};
```

### 3. Create `src/utils/validators.ts`

```typescript
export function validateFile(file: any) {
  const MAX_SIZE = 100 * 1024 * 1024; // 100MB
  
  if (!file) {
    throw new Error('No file provided');
  }
  
  if (file.size > MAX_SIZE) {
    throw new Error('File too large. Maximum size is 100MB');
  }
  
  return true;
}
```

## 🚀 Start Development

### Development Mode with Hot Reload

```bash
npm run watch  # In one terminal
npm run dev    # In another terminal
```

### Build for Production

```bash
npm run build
npm start
```

## 📝 API Testing

### Using cURL

```bash
# Test health endpoint
curl http://localhost:3000/health

# Upload file (example)
curl -X POST http://localhost:3000/api/v1/audio-to-image \
  -F "file=@audio.mp3" \
  -H "Authorization: Bearer your_token"
```

### Using Postman

1. Import the API collection (to be created)
2. Set environment variables
3. Test each endpoint

## 🔗 Connect Frontend to Backend

In Frontend `services/api.ts`, update API base URL:

```typescript
const API_BASE_URL = 'http://localhost:3000/api/v1';
```

## ✅ Verification Checklist

- [ ] Node.js installed and working
- [ ] npm packages installed successfully
- [ ] `.env` file created with all variables
- [ ] `src/index.ts` created and tested
- [ ] Health endpoint returns 200 OK
- [ ] FFmpeg installed and working
- [ ] Database connection configured
- [ ] Nodemon/watch mode working
- [ ] CORS configured for frontend
- [ ] File upload configured

## 🐛 Common Issues

### Port Already in Use
```bash
# Kill process on port 3000
npx kill-port 3000
# Or change PORT in .env
```

### FFmpeg Not Found
```bash
# Add to .env
FFMPEG_PATH=/custom/path/to/ffmpeg
```

### Database Connection Failed
```bash
# Check .env DATABASE_URL
# Ensure database server is running
# Test connection: mongoose.connect() or pg.connect()
```

### Module Not Found
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## 📚 Next Steps

1. ✅ Set up basic server
2. Create audio-to-image conversion endpoint
3. Create image-to-audio conversion endpoint
4. Add authentication
5. Add file storage
6. Set up error handling
7. Add API documentation
8. Deploy to production

---

**Ready to code?** Check `BACKEND_ROADMAP.md` for detailed implementation steps! 🚀
