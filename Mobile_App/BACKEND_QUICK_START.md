# 🛠️ EchoCipher Backend - Setup & Quick Start

Complete guide to set up and start building the backend server.

---

## 📋 Prerequisites

Before starting, ensure you have installed:
- ✅ **Node.js** v16+ ([download](https://nodejs.org))
- ✅ **npm** (comes with Node.js)
- ✅ **Git** (for version control)
- ✅ **FFmpeg** (for audio/image processing)

### Verify Installation

```bash
node --version    # Should be v16+
npm --version     # Should be v8+
ffmpeg -version   # Should show version info
```

---

## 🚀 Step 1: Initialize Backend Project

```bash
cd Mobile_App/Backend

# Initialize npm project
npm init -y
```

This creates `package.json` with default settings.

---

## 📦 Step 2: Install Core Dependencies

### Express.js & TypeScript

```bash
npm install express typescript ts-node dotenv cors uuid
npm install -D @types/express @types/node @types/cors nodemon
```

### File Processing & Storage

```bash
npm install multer sharp fluent-ffmpeg
npm install -D @types/multer
```

### Database (Choose One)

**Option A: MongoDB (Recommended)**
```bash
npm install mongoose
```

**Option B: PostgreSQL**
```bash
npm install pg
npm install -D @types/pg
```

---

## ⚙️ Step 3: Create TypeScript Config

Create `tsconfig.json`:

```bash
cat > tsconfig.json << 'EOF'
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
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF
```

---

## 📝 Step 4: Create Project Structure

```bash
# Create directory structure
mkdir -p src/{config,controllers,routes,services,middleware,utils,models}
mkdir -p uploads
mkdir -p dist
```

---

## 🔧 Step 5: Update package.json Scripts

Open `package.json` and update the scripts section:

```json
{
  "name": "echocipher-backend",
  "version": "1.0.0",
  "description": "Backend server for EchoCipher mobile app",
  "main": "dist/index.js",
  "scripts": {
    "dev": "ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "watch": "tsc --watch",
    "test": "jest"
  },
  "keywords": ["echocipher", "backend", "api"],
  "author": "",
  "license": "MIT"
}
```

---

## 🌍 Step 6: Create Environment File

Create `.env` file:

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DATABASE_URL=mongodb://localhost:27017/echocipher
# For PostgreSQL: DATABASE_URL=postgres://user:password@localhost:5432/echocipher

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=104857600

# JWT Authentication
JWT_SECRET=your_secret_key_here_change_in_production
JWT_EXPIRE=7d

# CORS
ALLOWED_ORIGINS=http://localhost:8081,http://localhost:3000

# FFmpeg Path
FFMPEG_PATH=ffmpeg
```

Also create `.env.example` (for git):

```bash
PORT=3000
NODE_ENV=development
DATABASE_URL=mongodb://localhost:27017/echocipher
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=104857600
JWT_SECRET=your_secret_key_here
JWT_EXPIRE=7d
ALLOWED_ORIGINS=http://localhost:8081,http://localhost:3000
FFMPEG_PATH=ffmpeg
```

---

## 🎯 Step 7: Create Entry Point

Create `src/index.ts`:

```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============ Middleware ============
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(','),
  credentials: true,
}));

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// ============ Routes ============
app.get('/health', (req, res) => {
  res.json({
    status: 'Server running ✅',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ============ Error Handler ============
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
  });
});

// ============ Start Server ============
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════╗
║   🎵 EchoCipher Backend Server    ║
╚═══════════════════════════════════╝

🚀 Server running on port ${PORT}
🌐 Visit http://localhost:${PORT}
🏥 Health check: http://localhost:${PORT}/health

Environment: ${process.env.NODE_ENV}
  `);
});
```

---

## ✅ Step 8: Test the Setup

### Start Development Server

```bash
npm run dev
```

### Expected Output

```
╔═══════════════════════════════════╗
║   🎵 EchoCipher Backend Server    ║
╚═══════════════════════════════════╝

🚀 Server running on port 3000
🌐 Visit http://localhost:3000
🏥 Health check: http://localhost:3000/health

Environment: development
```

### Test Health Endpoint

Open another terminal:

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "Server running ✅",
  "timestamp": "2025-11-14T23:00:00.000Z",
  "uptime": 5.123
}
```

---

## 📁 Current Project Structure

```
Backend/
├── src/
│   ├── index.ts                 ✅ Entry point
│   ├── config/
│   ├── controllers/
│   ├── routes/
│   ├── services/
│   ├── middleware/
│   ├── utils/
│   └── models/
├── uploads/                     (File storage)
├── dist/                        (Compiled JS)
├── package.json                 ✅ Project config
├── tsconfig.json               ✅ TypeScript config
├── .env                        ✅ Environment variables
├── .env.example
└── .gitignore
```

---

## 🔗 Connect Frontend to Backend

In Frontend `services/api.ts`, update:

```typescript
const API_BASE_URL = 'http://localhost:3000/api/v1';
```

---

## 🔗 API Endpoints Reference

All endpoints start with: `http://localhost:3000/api/v1`

### Audio to Image
- **POST** `/audio-to-image` - Convert audio file to image
- **GET** `/audio-to-image/:id` - Get conversion result
- **GET** `/audio-to-image/status/:id` - Get conversion status

### Image to Audio
- **POST** `/image-to-audio` - Convert image file to audio
- **GET** `/image-to-audio/:id` - Get conversion result
- **GET** `/image-to-audio/status/:id` - Get conversion status

---

## 🛠️ Common Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Watch TypeScript changes
npm run watch

# Run tests
npm test
```

---

## 🚨 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000
npx kill-port 3000
```

### Module Not Found
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### FFmpeg Not Found
Install FFmpeg:

**Windows (Chocolatey)**
```bash
choco install ffmpeg
```

**macOS (Homebrew)**
```bash
brew install ffmpeg
```

**Linux (Ubuntu)**
```bash
sudo apt-get install ffmpeg
```

---

## 📚 Next Steps

1. ✅ Initialize backend project
2. ✅ Install dependencies
3. ✅ Create project structure
4. ✅ Start development server
5. ⏭️ **Create audio-to-image endpoint** (See BACKEND_ROADMAP.md)
6. ⏭️ **Create image-to-audio endpoint**
7. ⏭️ **Add authentication**
8. ⏭️ **Deploy to production**

---

## 📖 Documentation Files

- **BACKEND_SETUP_GUIDE.md** - Detailed setup instructions
- **BACKEND_ROADMAP.md** - Implementation roadmap
- **BACKEND_API_SPEC.md** - Complete API specifications

---

**Ready to start coding?** Follow BACKEND_ROADMAP.md for step-by-step implementation! 🎉
