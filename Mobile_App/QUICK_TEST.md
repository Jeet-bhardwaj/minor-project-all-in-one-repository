# Quick Start - Backend & Frontend Testing

## ✅ Status Summary

**Backend:** ✅ **WORKING** - Running on port 3000  
**Frontend:** ✅ **READY** - All dependencies installed and configured

---

## 🚀 Quick Testing Commands

### Test Backend in New Terminal
```powershell
# Terminal 1: Start Backend
cd "e:\Projects\minnor Project\Mobile_App\Backend"
npm run dev

# You should see:
# 🚀 EchoCipher Backend running on port 3000
```

### Test Health Endpoint
```powershell
# Terminal 2: Quick test
curl http://localhost:3000/health

# Response:
# {"status":"ok","timestamp":"2025-11-15T18:36:06.622Z","uptime":234.33,"environment":"development"}
```

### Test API Status
```powershell
curl http://localhost:3000/api/status

# Response shows all 6 endpoints available
```

### Start Frontend in New Terminal
```powershell
# Terminal 3: Start Frontend
cd "e:\Projects\minnor Project\Mobile_App\Frontend"
npm start

# You should see QR code for Expo Go
```

---

## 📱 Three Ways to Test Frontend

### Option 1: Android Emulator
```powershell
npm run android
# Automatically launches Android emulator with app
```

### Option 2: iOS Simulator (macOS only)
```powershell
npm run ios
```

### Option 3: Web Browser
```powershell
npm run web
# Opens app in browser at http://localhost:19006
```

---

## 🔍 What to Check

### ✅ Backend Checklist
- [ ] Terminal shows: `🚀 EchoCipher Backend running on port 3000`
- [ ] `curl http://localhost:3000/health` returns `"status":"ok"`
- [ ] `curl http://localhost:3000/api/status` returns list of 6 endpoints
- [ ] Server auto-reloads when files change (nodemon running)
- [ ] No error messages in terminal

### ✅ Frontend Checklist
- [ ] Metro bundler shows: `exp://192.168.x.x:19000`
- [ ] App loads with splash screen (5 seconds)
- [ ] 3 tabs visible: **Audio→Image** | **Image→Audio** | **Settings**
- [ ] File picker works on both conversion tabs
- [ ] Settings tab accessible and functional
- [ ] Dark/Light theme toggle works

### ✅ Integration Checklist
- [ ] Backend and Frontend running simultaneously
- [ ] Frontend can reach backend (check network settings)
- [ ] File upload mechanism works on device
- [ ] API responses show in browser console (F12 DevTools)
- [ ] No CORS errors in console

---

## 🧪 Automated Testing

Run the complete test suite:
```powershell
cd "e:\Projects\minnor Project\Mobile_App\Backend"
powershell -ExecutionPolicy Bypass -File test.ps1
```

Expected output:
- [PASS] Backend Health Check
- [PASS] API Status Endpoint
- [PASS] 404 Error Handler
- [OK] All Frontend dependencies
- [OK] All Frontend files present

---

## 📋 File Locations

**Backend Folder:**
```
Mobile_App/Backend/
├── src/
│   ├── index.ts          <- Main entry point
│   ├── config/
│   ├── controllers/
│   ├── routes/
│   ├── services/
│   ├── middleware/
│   └── utils/
├── .env                  <- Configuration
├── tsconfig.json         <- TypeScript config
├── package.json
└── node_modules/         <- 157 packages installed
```

**Frontend Folder:**
```
Mobile_App/Frontend/
├── app/
│   ├── _layout.tsx       <- Root navigation
│   └── (tabs)/
│       ├── _layout.tsx   <- 3-tab navigation
│       ├── audio-to-image-tab.tsx
│       ├── image-to-audio-tab.tsx
│       └── explore.tsx   <- Settings
├── services/
│   └── api.ts            <- API client (13+ endpoints)
├── constants/
│   └── theme.ts
├── contexts/
│   └── AuthContext.tsx
├── package.json
└── node_modules/         <- 300+ packages installed
```

---

## 🔧 Troubleshooting

### Backend Won't Start
```powershell
# Check if port 3000 is in use
netstat -ano | findstr :3000

# If occupied, kill the process or use different port
# Edit Backend/.env and change PORT=3001
```

### Metro Bundler Error
```powershell
# Clear cache and restart
npx expo start -c
```

### Can't Connect Frontend to Backend
```powershell
# For Android emulator, use different URL
# Change in Frontend/services/api.ts
# const API_URL = 'http://10.0.2.2:3000'  // For Android emulator

# For web browser
# const API_URL = 'http://localhost:3000'  // Works automatically

# For physical device on same network
# const API_URL = 'http://192.168.1.100:3000'  # Replace with your IP
```

### File Picker Not Working
```powershell
# Check permissions on device
# Android: Settings > Apps > EchoCipher > Permissions > Files
# iOS: Settings > EchoCipher > Files and Folders

# Reinstall if needed
cd Frontend
npm install expo-document-picker
```

---

## 📊 Key Metrics

| Component | Status | Port | URL |
|-----------|--------|------|-----|
| Backend | ✅ Running | 3000 | `http://localhost:3000` |
| Frontend Metro | ✅ Ready | 19000 | `exp://192.168.x.x:19000` |
| Frontend Web | ✅ Ready | 19006 | `http://localhost:19006` |

---

## 📚 Full Documentation

For comprehensive testing guide, see: **TESTING_GUIDE.md**

---

**Last Updated:** November 15, 2025  
**Backend Version:** 1.0.0  
**Frontend Version:** 1.0.0  
**Status:** ✅ ALL SYSTEMS OPERATIONAL
