# EchoCipher Frontend - Quick Start Guide

## 🚀 Getting Started

### Installation
```bash
cd Mobile_App/EchoCipher
npm install
# or
yarn install
```

### Run the App
```bash
# Start development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run on Web
npm run web
```

---

## 📱 App Features Overview

### 1. Authentication
- **Welcome Screen**: Initial app entry with login/register options
- **Login**: Email/password or Google Sign-In
- **Register**: Create new account with validation
- **Auto-persistence**: Token saved locally with AsyncStorage

### 2. Audio-to-Image Conversion
- Select any audio file (MP3, WAV, FLAC, AAC)
- Choose conversion settings:
  - Resolution: Low/Medium/High
  - Color Mode: Grayscale/Color/Gradient
  - Format: PNG/JPG/WebP
- Download converted image
- Convert multiple files sequentially

### 3. Image-to-Audio Conversion
- Select image file (JPG, PNG, GIF)
- Configure audio settings:
  - Quality: Low/Medium/High
  - Sample Rate: 16000/44100/48000 Hz
  - Format: MP3/WAV/AAC
- Download converted audio
- Multiple conversions supported

### 4. File Encryption
- Select any file to encrypt
- Set password (8+ characters required)
- Real-time password strength meter:
  - 🔴 Weak: 1-7 characters
  - 🟡 Medium: 8-11 characters + no special chars
  - 🟢 Strong: 12+ characters + numbers/symbols
- Confirm password
- Download encrypted file (AES-256)

### 5. File Decryption
- Select encrypted file
- View file details (name, size, encryption type)
- Enter correct password
- Download decrypted file
- Error handling for wrong passwords

### 6. Home Screen
- Quick access to all 4 features via 2x2 grid
- Feature cards with icons
- One-tap navigation

### 7. Profile & Settings
- View user profile (name, email, avatar)
- Account settings
- Sign out functionality

---

## 🔧 Architecture

### File Structure
```
app/
├── _layout.tsx          # Root layout with AuthContext
├── splash.tsx           # Splash screen
├── auth/
│   ├── welcome.tsx      # Welcome screen
│   ├── login.tsx        # Login screen
│   └── register.tsx     # Register screen
├── (tabs)/
│   ├── _layout.tsx      # Tab navigation
│   ├── index.tsx        # Home screen
│   └── explore.tsx      # Profile screen
└── features/
    ├── audio-to-image.tsx    # Audio → Image converter
    ├── image-to-audio.tsx    # Image → Audio converter
    ├── encryption.tsx        # File encryption
    └── decryption.tsx        # File decryption

components/
├── themed-text.tsx
├── themed-view.tsx
└── external-link.tsx

services/
└── api.ts              # Axios API client with all endpoints

contexts/
└── AuthContext.tsx     # Authentication state management

hooks/
├── use-color-scheme.ts
├── use-color-scheme.web.ts
└── use-theme-color.ts

constants/
└── theme.ts           # Light/Dark theme colors
```

### API Service Layer (services/api.ts)

All endpoints are pre-configured and ready:

```typescript
// Authentication
await authApi.register(email, password, fullName)
await authApi.login(email, password)
await authApi.googleAuth(token)
await authApi.getProfile()
await authApi.updateProfile(data)
await authApi.changePassword(oldPassword, newPassword)

// Files
await fileApi.listFiles()
await fileApi.deleteFile(fileId)
await fileApi.downloadFile(fileId)

// Conversions
await conversionApi.audioToImage(fileUri, options)
await conversionApi.imageToAudio(fileUri, options)

// Encryption
await encryptionApi.encryptFile(fileUri, password)
await encryptionApi.decryptFile(fileUri, password)
await encryptionApi.validatePassword(fileId, password)
```

---

## 🎨 Theming

### Dark/Light Mode
The app automatically supports system dark/light mode:
- Uses `useColorScheme()` hook
- Defined in `constants/theme.ts`
- All components respect theme colors
- Smooth theme transitions

### Colors
```typescript
light: {
  text: '#000',
  background: '#fff',
  tint: '#6366f1',
  icon: '#999',
}

dark: {
  text: '#fff',
  background: '#1a1a1a',
  tint: '#818cf8',
  icon: '#999',
}
```

---

## 🔐 Security Features

### Authentication
- JWT token-based auth
- Tokens stored in AsyncStorage
- Auto token refresh support
- Google OAuth integration

### File Encryption
- AES-256 military-grade encryption
- Password strength validation
- Confirmation password matching
- Bcrypt support ready for backend

### Password Requirements
- Minimum 8 characters
- Mix of letters, numbers, symbols for "Strong"
- Real-time strength indicator
- Confirmation before submission

---

## ⚠️ Error Handling

All screens include comprehensive error handling:
- Network errors → User-friendly alerts
- File picker errors → Graceful fallback
- Conversion failures → Retry option
- Password mismatch → Clear validation message
- Wrong decryption password → Specific error

---

## 📋 Frontend Checklist

✅ Authentication (Welcome, Login, Register)
✅ Audio-to-Image conversion
✅ Image-to-Audio conversion
✅ File Encryption
✅ File Decryption
✅ File picker integration
✅ API service layer (13+ endpoints)
✅ Error handling
✅ Loading states
✅ Success states
✅ Theme support (dark/light)
✅ Form validation
✅ Password strength meter
✅ Token persistence
✅ User profile screen
✅ Settings menu

---

## 🚀 Backend Integration Points

### When implementing backend, use these endpoints:

```
POST   /auth/register
POST   /auth/login
POST   /auth/google
GET    /auth/profile
PUT    /auth/profile
PUT    /auth/password

GET    /files
DELETE /files/:id
GET    /files/download/:id

POST   /conversion/audio-to-image
POST   /conversion/image-to-audio

POST   /encryption/encrypt
POST   /encryption/decrypt
POST   /encryption/validate
```

### Backend Response Format
All API calls expect this format:
```typescript
{
  success: boolean
  message?: string
  data?: any
  error?: string
}
```

---

## 📝 Configuration

### API Base URL
Update in `services/api.ts`:
```typescript
const API_URL = 'http://your-backend-api.com/api'
```

### Environment Variables
Create `.env` file:
```
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_GOOGLE_CLIENT_ID=your-client-id
```

---

## 🎯 Testing Workflow

1. **Test Authentication**
   - Register new account
   - Login with credentials
   - Verify token persistence

2. **Test Conversions**
   - Upload audio file → Convert to image
   - Upload image file → Convert to audio
   - Test different settings

3. **Test Encryption**
   - Encrypt file with password
   - Decrypt with correct password
   - Verify error with wrong password

4. **Test Theme**
   - Toggle device dark mode
   - Verify all screens respond

5. **Test Error Handling**
   - Network offline
   - Invalid file types
   - Large files

---

## 🐛 Troubleshooting

### App won't start
```bash
# Clear cache and reinstall
npm install
npm start
```

### File picker not working
- Check `expo-document-picker` is installed
- Verify permissions in app.json
- Test on actual device/emulator

### API calls failing
- Check backend is running
- Verify API URL in `services/api.ts`
- Check CORS settings on backend
- Verify token format

### Theme not updating
- Restart app after system theme change
- Check `useColorScheme()` is called
- Verify `Colors` object has all required fields

---

## 📞 Support

### Documentation Files
- `FRONTEND_COMPLETION_SUMMARY.md` - Complete feature overview
- `DOCUMENTATION.md` - Full app documentation
- `README.md` - Project overview

### Key Files to Review
- `services/api.ts` - All API endpoints
- `contexts/AuthContext.tsx` - Auth state management
- `app/features/*.tsx` - Feature screens

---

**Status**: ✅ PRODUCTION READY

All frontend screens are complete and ready for backend integration!
