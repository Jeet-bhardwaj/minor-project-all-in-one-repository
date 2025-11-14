# EchoCipher - Backend API Specification

## Overview
This document specifies all API endpoints that the frontend expects. The backend should implement exactly these endpoints with the specified response formats.

---

## Base URL
```
http://localhost:3000/api
```

(Configurable in `services/api.ts`)

---

## Response Format

All endpoints should return JSON in this format:

```typescript
{
  success: boolean,
  message?: string,
  data?: any,
  error?: string,
  timestamp?: number
}
```

### Success Response
```json
{
  "success": true,
  "data": { /* response data */ }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "message": "User-friendly message"
}
```

---

## Authentication

### JWT Token
- Header: `Authorization: Bearer {token}`
- Tokens are automatically injected by Axios interceptor
- Token stored in AsyncStorage under key `authToken`

### Refresh Token Flow
- Implement refresh endpoint if token expires
- Frontend ready to handle 401 responses

---

## Endpoints

### 1. AUTHENTICATION

#### 1.1 Register
```
POST /auth/register
Content-Type: application/json

Request:
{
  "email": "user@example.com",
  "password": "securePassword123!",
  "fullName": "John Doe"
}

Response (200 OK):
{
  "success": true,
  "data": {
    "user": {
      "id": "user-123",
      "email": "user@example.com",
      "fullName": "John Doe",
      "createdAt": "2025-01-15T10:30:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}

Response (400 Bad Request):
{
  "success": false,
  "error": "Email already exists",
  "message": "This email is already registered"
}
```

#### 1.2 Login
```
POST /auth/login
Content-Type: application/json

Request:
{
  "email": "user@example.com",
  "password": "securePassword123!"
}

Response (200 OK):
{
  "success": true,
  "data": {
    "user": {
      "id": "user-123",
      "email": "user@example.com",
      "fullName": "John Doe",
      "avatar": "https://...",
      "createdAt": "2025-01-15T10:30:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}

Response (401 Unauthorized):
{
  "success": false,
  "error": "Invalid credentials",
  "message": "Email or password is incorrect"
}
```

#### 1.3 Google OAuth
```
POST /auth/google
Content-Type: application/json

Request:
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEi..."
}

Response (200 OK):
{
  "success": true,
  "data": {
    "user": {
      "id": "google-user-123",
      "email": "user@gmail.com",
      "fullName": "John Doe",
      "avatar": "https://lh3.googleusercontent.com/...",
      "provider": "google"
    },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### 1.4 Get Profile
```
GET /auth/profile
Headers:
  Authorization: Bearer {token}

Response (200 OK):
{
  "success": true,
  "data": {
    "id": "user-123",
    "email": "user@example.com",
    "fullName": "John Doe",
    "avatar": "https://...",
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-16T15:45:00Z"
  }
}

Response (401 Unauthorized):
{
  "success": false,
  "error": "Unauthorized",
  "message": "Please login again"
}
```

#### 1.5 Update Profile
```
PUT /auth/profile
Headers:
  Authorization: Bearer {token}
Content-Type: application/json

Request:
{
  "fullName": "Jane Doe",
  "avatar": "data:image/jpeg;base64,..."
}

Response (200 OK):
{
  "success": true,
  "data": {
    "id": "user-123",
    "email": "user@example.com",
    "fullName": "Jane Doe",
    "avatar": "https://...",
    "updatedAt": "2025-01-16T15:45:00Z"
  }
}
```

#### 1.6 Change Password
```
PUT /auth/password
Headers:
  Authorization: Bearer {token}
Content-Type: application/json

Request:
{
  "oldPassword": "oldPassword123!",
  "newPassword": "newPassword456!"
}

Response (200 OK):
{
  "success": true,
  "message": "Password changed successfully"
}

Response (400 Bad Request):
{
  "success": false,
  "error": "Invalid password",
  "message": "Old password is incorrect"
}
```

---

### 2. FILE MANAGEMENT

#### 2.1 List Files
```
GET /files?type=all&limit=20&offset=0
Headers:
  Authorization: Bearer {token}

Query Parameters:
  type: "all" | "audio" | "image" | "encrypted"
  limit: number (default 20)
  offset: number (default 0)

Response (200 OK):
{
  "success": true,
  "data": {
    "files": [
      {
        "id": "file-123",
        "userId": "user-123",
        "filename": "audio.mp3",
        "fileType": "audio",
        "mimeType": "audio/mpeg",
        "size": 5242880,
        "url": "https://storage.example.com/files/...",
        "format": "mp3",
        "sourceType": "original",
        "metadata": {
          "duration": 120,
          "sampleRate": 44100
        },
        "uploadedAt": "2025-01-15T10:30:00Z",
        "expiresAt": "2025-02-15T10:30:00Z"
      }
    ],
    "total": 45,
    "hasMore": true
  }
}
```

#### 2.2 Delete File
```
DELETE /files/{fileId}
Headers:
  Authorization: Bearer {token}

Response (200 OK):
{
  "success": true,
  "message": "File deleted successfully"
}

Response (404 Not Found):
{
  "success": false,
  "error": "File not found"
}
```

#### 2.3 Download File
```
GET /files/download/{fileId}
Headers:
  Authorization: Bearer {token}

Response (200 OK):
  [Binary file content]
  
Response Headers:
  Content-Type: [appropriate mime type]
  Content-Disposition: attachment; filename="filename.ext"
  Content-Length: [size]

Response (404 Not Found):
{
  "success": false,
  "error": "File not found"
}
```

---

### 3. CONVERSIONS

#### 3.1 Audio to Image
```
POST /conversion/audio-to-image
Headers:
  Authorization: Bearer {token}
  Content-Type: multipart/form-data

Form Data:
  file: [binary audio file]
  resolution: "high" | "medium" | "low"
  colorMode: "grayscale" | "color" | "gradient"
  format: "png" | "jpg" | "webp"

Response (200 OK):
{
  "success": true,
  "data": {
    "outputFile": {
      "id": "output-123",
      "filename": "audio_converted.png",
      "size": 2097152,
      "url": "https://storage.example.com/converted/...",
      "format": "png",
      "sourceFileId": "file-123",
      "sourceFilename": "audio.mp3",
      "conversionType": "audio-to-image",
      "metadata": {
        "resolution": "high",
        "colorMode": "gradient",
        "dimensions": [1920, 1080]
      },
      "createdAt": "2025-01-15T10:35:00Z"
    },
    "processingTime": 2500
  }
}

Response (400 Bad Request):
{
  "success": false,
  "error": "Invalid file format",
  "message": "Please upload a valid audio file (MP3, WAV, FLAC, AAC)"
}

Response (413 Payload Too Large):
{
  "success": false,
  "error": "File too large",
  "message": "Maximum file size is 100MB"
}
```

#### 3.2 Image to Audio
```
POST /conversion/image-to-audio
Headers:
  Authorization: Bearer {token}
  Content-Type: multipart/form-data

Form Data:
  file: [binary image file]
  quality: "high" | "medium" | "low"
  sampleRate: "16000" | "44100" | "48000"
  format: "mp3" | "wav" | "aac"

Response (200 OK):
{
  "success": true,
  "data": {
    "outputFile": {
      "id": "output-124",
      "filename": "image_converted.mp3",
      "size": 5242880,
      "url": "https://storage.example.com/converted/...",
      "format": "mp3",
      "sourceFileId": "file-124",
      "sourceFilename": "image.png",
      "conversionType": "image-to-audio",
      "metadata": {
        "quality": "high",
        "sampleRate": 44100,
        "duration": 60
      },
      "createdAt": "2025-01-15T10:40:00Z"
    },
    "processingTime": 3500
  }
}

Response (400 Bad Request):
{
  "success": false,
  "error": "Invalid file format",
  "message": "Please upload a valid image file (JPG, PNG, GIF)"
}
```

---

### 4. ENCRYPTION

#### 4.1 Encrypt File
```
POST /encryption/encrypt
Headers:
  Authorization: Bearer {token}
  Content-Type: multipart/form-data

Form Data:
  file: [binary file to encrypt]
  password: "userPassword123!"

Response (200 OK):
{
  "success": true,
  "data": {
    "encryptedFile": {
      "id": "encrypted-123",
      "filename": "file.encrypted",
      "size": 5242920,
      "url": "https://storage.example.com/encrypted/...",
      "encryption": {
        "algorithm": "AES-256-GCM",
        "keyDerivation": "PBKDF2",
        "iterations": 100000,
        "salt": "base64-encoded-salt",
        "iv": "base64-encoded-iv",
        "authTag": "base64-encoded-tag"
      },
      "sourceFilename": "original.mp3",
      "sourceFileType": "audio",
      "createdAt": "2025-01-15T10:45:00Z"
    },
    "processingTime": 1500
  }
}

Response (400 Bad Request):
{
  "success": false,
  "error": "Weak password",
  "message": "Password must be at least 8 characters"
}
```

#### 4.2 Decrypt File
```
POST /encryption/decrypt
Headers:
  Authorization: Bearer {token}
  Content-Type: multipart/form-data

Form Data:
  file: [binary encrypted file]
  password: "userPassword123!"

Response (200 OK):
{
  "success": true,
  "data": {
    "decryptedFile": {
      "id": "decrypted-123",
      "filename": "original.mp3",
      "size": 5242880,
      "url": "https://storage.example.com/decrypted/...",
      "fileType": "audio",
      "format": "mp3",
      "createdAt": "2025-01-15T10:50:00Z"
    },
    "processingTime": 1200
  }
}

Response (401 Unauthorized):
{
  "success": false,
  "error": "Invalid password",
  "message": "The password you entered is incorrect"
}

Response (400 Bad Request):
{
  "success": false,
  "error": "Corrupted file",
  "message": "File appears to be corrupted or not properly encrypted"
}
```

#### 4.3 Validate Password (Optional)
```
POST /encryption/validate
Headers:
  Authorization: Bearer {token}
  Content-Type: application/json

Request:
{
  "fileId": "encrypted-123",
  "password": "userPassword123!"
}

Response (200 OK):
{
  "success": true,
  "data": {
    "valid": true,
    "message": "Password is correct"
  }
}

Response (200 OK - Invalid):
{
  "success": true,
  "data": {
    "valid": false,
    "message": "Password is incorrect"
  }
}
```

---

## Error Codes

### HTTP Status Codes
- `200` - OK
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid token)
- `403` - Forbidden (permission denied)
- `404` - Not Found
- `413` - Payload Too Large
- `500` - Internal Server Error

### Error Types
```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "User-friendly message"
}
```

Common error codes:
- `INVALID_CREDENTIALS` - Wrong email/password
- `EMAIL_EXISTS` - Email already registered
- `WEAK_PASSWORD` - Password doesn't meet requirements
- `FILE_NOT_FOUND` - File doesn't exist
- `FILE_TOO_LARGE` - Exceeds size limit
- `INVALID_FILE_FORMAT` - Wrong file type
- `UNAUTHORIZED` - Missing/invalid token
- `PERMISSION_DENIED` - User can't access resource
- `INVALID_PASSWORD` - Wrong decryption password
- `CORRUPTED_FILE` - File is damaged

---

## File Limits

- **Maximum file size**: 100MB
- **Supported audio formats**: MP3, WAV, FLAC, AAC
- **Supported image formats**: JPG, PNG, GIF, TIFF, BMP
- **File retention**: 30 days (configurable)
- **Concurrent uploads**: 3 per user

---

## Rate Limiting

Recommended rate limits:
- Authentication: 5 requests/minute per IP
- Uploads: 10 requests/minute per user
- Downloads: 20 requests/minute per user
- Conversions: 5 concurrent per user

---

## Security Requirements

✅ **HTTPS Only** - All endpoints must use HTTPS
✅ **CORS** - Configure CORS for frontend domain
✅ **JWT Tokens** - Use HS256 or RS256 algorithm
✅ **Password Hashing** - Use bcrypt with min 10 rounds
✅ **File Validation** - Validate file type and size
✅ **Input Sanitization** - Sanitize all inputs
✅ **SQL Injection Prevention** - Use parameterized queries
✅ **CSRF Protection** - Implement CSRF tokens if needed

---

## Response Time Targets

- Authentication endpoints: < 500ms
- File list: < 1s
- File upload: < 5s
- Audio-to-image conversion: 2-5s (depends on size)
- Image-to-audio conversion: 3-10s (depends on size)
- Encryption: 1-3s
- Decryption: 1-3s

---

## Implementation Checklist

- [ ] Setup Express server
- [ ] Setup MongoDB database
- [ ] Implement authentication (JWT)
- [ ] Implement user registration/login
- [ ] Setup file upload handler
- [ ] Implement audio-to-image conversion
- [ ] Implement image-to-audio conversion
- [ ] Implement file encryption
- [ ] Implement file decryption
- [ ] Setup error handling
- [ ] Implement logging
- [ ] Add request validation
- [ ] Setup CORS
- [ ] Implement rate limiting
- [ ] Add tests (unit + integration)
- [ ] Deploy to staging
- [ ] Performance testing
- [ ] Security audit
- [ ] Deploy to production

---

## Testing

### Test Cases
1. Register with valid/invalid data
2. Login with correct/incorrect credentials
3. Token refresh flow
4. File upload (valid/invalid formats)
5. Conversion success/failure scenarios
6. Encryption with various passwords
7. Decryption with correct/incorrect password
8. Rate limiting
9. Large file handling
10. Concurrent requests

### Sample Test Data
```json
{
  "validUser": {
    "email": "test@example.com",
    "password": "Test123!@#",
    "fullName": "Test User"
  },
  "invalidUser": {
    "email": "invalid-email",
    "password": "123"
  }
}
```

---

## Documentation

This specification should be shared with:
- Backend developers
- Frontend developers (reference in api.ts)
- QA/Testing team
- DevOps/Infrastructure team

---

**Created**: January 2025
**Version**: 1.0
**Status**: Ready for Implementation
