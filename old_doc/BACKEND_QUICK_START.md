# 🚀 Backend Quick Start - EchoCipher

## 5-Minute Setup

### Step 1: Create Backend Directory
```bash
cd e:\Projects\minnor Project
mkdir backend
cd backend
npm init -y
```

### Step 2: Install Dependencies
```bash
npm install express cors dotenv jsonwebtoken bcryptjs mongoose multer sharp axios
npm install --save-dev nodemon
```

### Step 3: Create .env File
```
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/echocipher
JWT_SECRET=your-secret-key-here-make-it-long-and-secure
JWT_REFRESH_SECRET=your-refresh-secret-key
FRONTEND_URL=http://localhost:8081
```

### Step 4: Create package.json scripts
```json
{
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js"
  }
}
```

### Step 5: Create src/index.js
```javascript
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// Test route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '✅ Server is running' });
});

// Test POST
app.post('/api/auth/register', (req, res) => {
  res.json({ success: true, message: 'Register endpoint ready' });
});

app.post('/api/conversion/audio-to-image', (req, res) => {
  res.json({ success: true, message: 'Audio-to-Image endpoint ready' });
});

app.post('/api/conversion/image-to-audio', (req, res) => {
  res.json({ success: true, message: 'Image-to-Audio endpoint ready' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
```

### Step 6: Run Server
```bash
npm run dev
```

## ✅ Test the Server
```bash
# Test health check
curl http://localhost:3000/api/health

# Response: {"status":"ok","message":"✅ Server is running"}
```

---

## 📋 Next Tasks

### Phase 1: Core Setup (Today)
- [ ] Basic Express server running
- [ ] Environment variables configured
- [ ] MongoDB connection
- [ ] Basic route structure

### Phase 2: Authentication (Tomorrow)
- [ ] User registration endpoint
- [ ] User login endpoint
- [ ] JWT token generation
- [ ] Password hashing with bcrypt

### Phase 3: Conversion (Next Day)
- [ ] Audio-to-image conversion logic
- [ ] Image-to-audio conversion logic
- [ ] File upload handling
- [ ] Response formatting

### Phase 4: Deployment (Week End)
- [ ] Production environment setup
- [ ] Heroku/AWS deployment
- [ ] Frontend integration
- [ ] End-to-end testing

---

## 🎯 Quick Reference

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server with auto-reload |
| `npm start` | Start production server |
| `npm install [package]` | Install new package |
| `npm list` | Show installed packages |

---

## 🔗 API Endpoints to Build

```
POST   /api/auth/register          → User registration
POST   /api/auth/login             → User login
POST   /api/auth/refresh           → Token refresh
POST   /api/conversion/audio-to-image → Audio file upload & conversion
POST   /api/conversion/image-to-audio → Image file upload & conversion
GET    /api/files                  → List user files
DELETE /api/files/:id              → Delete file
```

---

**Let's build! 🚀**
