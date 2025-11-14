# 📡 EchoCipher API Specification

Complete API documentation for the EchoCipher backend server.

---

## 🌐 Base URL

```
http://localhost:3000/api/v1
```

## 🔑 Authentication

All endpoints require Bearer token (to be implemented):

```
Authorization: Bearer <token>
```

---

## 📡 API Endpoints

### 1. Audio to Image Conversion

#### 1.1 POST /audio-to-image/convert

Convert audio file to image format.

**Request:**
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`
- **Parameters**:
  - `file` (required) - Audio file (max 100MB)
    - Supported formats: MP3, WAV, FLAC, AAC, M4A
  - `width` (optional) - Image width in pixels (default: 800)
  - `height` (optional) - Image height in pixels (default: 600)
  - `format` (optional) - Output format: `png` or `jpg` (default: `png`)

**Example cURL:**
```bash
curl -X POST http://localhost:3000/api/v1/audio-to-image/convert \
  -F "file=@song.mp3" \
  -F "width=1024" \
  -F "height=768" \
  -F "format=png"
```

**Success Response (200):**
```json
{
  "success": true,
  "conversionId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "outputFile": "/uploads/550e8400-e29b-41d4-a716-446655440000/output.png",
  "duration": 2.5,
  "fileSize": 2048576,
  "message": "Audio converted to image successfully"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "No audio file uploaded",
  "code": "FILE_REQUIRED"
}
```

**Error Response (413):**
```json
{
  "success": false,
  "error": "File size exceeds maximum limit of 100MB",
  "code": "FILE_TOO_LARGE"
}
```

---

#### 1.2 GET /audio-to-image/status/:conversionId

Get conversion status and progress.

**Request:**
- **Method**: `GET`
- **Parameters**: 
  - `conversionId` (path parameter) - Conversion ID from convert response

**Example cURL:**
```bash
curl http://localhost:3000/api/v1/audio-to-image/status/550e8400-e29b-41d4-a716-446655440000
```

**Response (200):**
```json
{
  "conversionId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "in_progress",
  "progress": 45,
  "elapsedTime": 1.2,
  "estimatedTime": 2.7
}
```

**Response (404):**
```json
{
  "success": false,
  "error": "Conversion not found",
  "code": "NOT_FOUND"
}
```

---

#### 1.3 GET /audio-to-image/result/:conversionId

Download converted image file.

**Request:**
- **Method**: `GET`
- **Parameters**:
  - `conversionId` (path parameter) - Conversion ID

**Example cURL:**
```bash
curl http://localhost:3000/api/v1/audio-to-image/result/550e8400-e29b-41d4-a716-446655440000 \
  -o output.png
```

**Response (200):**
- File binary data with headers:
  - `Content-Type: image/png`
  - `Content-Disposition: attachment; filename=output.png`

**Response (404):**
```json
{
  "success": false,
  "error": "Result file not found",
  "code": "FILE_NOT_FOUND"
}
```

---

### 2. Image to Audio Conversion

#### 2.1 POST /image-to-audio/convert

Convert image file to audio format.

**Request:**
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`
- **Parameters**:
  - `file` (required) - Image file (max 100MB)
    - Supported formats: JPG, PNG, GIF, BMP, TIFF, WebP
  - `format` (optional) - Audio format: `mp3`, `wav`, `aac` (default: `mp3`)
  - `bitrate` (optional) - Bitrate in kbps: `128`, `192`, `256`, `320` (default: `192`)
  - `sampleRate` (optional) - Sample rate in Hz: `44100`, `48000` (default: `44100`)

**Example cURL:**
```bash
curl -X POST http://localhost:3000/api/v1/image-to-audio/convert \
  -F "file=@image.png" \
  -F "format=mp3" \
  -F "bitrate=256" \
  -F "sampleRate=48000"
```

**Success Response (200):**
```json
{
  "success": true,
  "conversionId": "550e8400-e29b-41d4-a716-446655440001",
  "status": "completed",
  "outputFile": "/uploads/550e8400-e29b-41d4-a716-446655440001/output.mp3",
  "duration": 3.2,
  "fileSize": 614400,
  "format": "mp3",
  "bitrate": "256kbps",
  "message": "Image converted to audio successfully"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Invalid image file type",
  "code": "INVALID_FILE_TYPE"
}
```

---

#### 2.2 GET /image-to-audio/status/:conversionId

Get image-to-audio conversion status.

**Request:**
- **Method**: `GET`
- **Parameters**: 
  - `conversionId` (path parameter) - Conversion ID from convert response

**Response (200):**
```json
{
  "conversionId": "550e8400-e29b-41d4-a716-446655440001",
  "status": "completed",
  "progress": 100,
  "elapsedTime": 3.2,
  "audioLength": "00:02:45"
}
```

---

#### 2.3 GET /image-to-audio/result/:conversionId

Download converted audio file.

**Request:**
- **Method**: `GET`
- **Parameters**:
  - `conversionId` (path parameter) - Conversion ID

**Response (200):**
- File binary data with headers:
  - `Content-Type: audio/mpeg`
  - `Content-Disposition: attachment; filename=output.mp3`

---

### 3. Health Check

#### 3.1 GET /health

Check if server is running.

**Request:**
- **Method**: `GET`

**Response (200):**
```json
{
  "status": "Server running ✅",
  "timestamp": "2025-11-14T23:00:00.000Z",
  "uptime": 3600.5,
  "version": "1.0.0"
}
```

---

## 📊 Response Format

### Success Response

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Operation successful"
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error description",
  "code": "ERROR_CODE",
  "timestamp": "2025-11-14T23:00:00.000Z"
}
```

---

## 🔴 Error Codes

| Code | HTTP Status | Description |
|------|------------|-------------|
| `FILE_REQUIRED` | 400 | No file uploaded |
| `INVALID_FILE_TYPE` | 400 | File type not supported |
| `FILE_TOO_LARGE` | 413 | File size exceeds limit |
| `CONVERSION_FAILED` | 500 | Conversion process failed |
| `FILE_NOT_FOUND` | 404 | Output file not found |
| `NOT_FOUND` | 404 | Conversion record not found |
| `INVALID_REQUEST` | 400 | Invalid request parameters |
| `SERVER_ERROR` | 500 | Internal server error |

---

## 📝 Request/Response Examples

### Complete Example: Audio to Image

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/audio-to-image/convert \
  -H "Authorization: Bearer token_here" \
  -F "file=@music.mp3"
```

**Response:**
```json
{
  "success": true,
  "conversionId": "abc123",
  "status": "in_progress",
  "outputFile": "/uploads/abc123/output.png"
}
```

**Check Progress:**
```bash
curl http://localhost:3000/api/v1/audio-to-image/status/abc123
```

**Download Result:**
```bash
curl http://localhost:3000/api/v1/audio-to-image/result/abc123 \
  -o my_image.png
```

---

## 🔐 Security Notes

- All file uploads are scanned for viruses (to be implemented)
- Maximum file size is 100MB
- Old files are automatically cleaned up after 24 hours (to be implemented)
- Rate limiting: 10 requests per minute per IP (to be implemented)
- All requests are logged for audit purposes (to be implemented)

---

## 📈 Performance Metrics

| Operation | Typical Time |
|-----------|-------------|
| Audio to Image (50MB) | 3-5 seconds |
| Image to Audio (20MB) | 2-4 seconds |
| File Upload | Varies with size |
| Server Response | < 100ms |

---

## 🚀 Deployment

### Environment Variables

```env
PORT=3000
NODE_ENV=production
DATABASE_URL=your_prod_database_url
UPLOAD_DIR=/var/uploads
JWT_SECRET=strong_secret_key
ALLOWED_ORIGINS=https://yourdomain.com
```

### Health Check for Load Balancer

```
GET /health
Expected Status: 200
```

---

## 📖 Integration with Frontend

Frontend uses `services/api.ts` configured with:

```typescript
const API_BASE_URL = 'http://localhost:3000/api/v1';

// Example usage:
const response = await axios.post(
  `${API_BASE_URL}/audio-to-image/convert`,
  formData,
  {
    headers: {
      'Content-Type': 'multipart/form-data',
      'Authorization': `Bearer ${token}`
    }
  }
);
```

---

## 🔄 Webhook Events (Future)

Webhooks will notify frontend of conversion completion:

```
POST https://your-frontend/webhooks/conversion-complete
{
  "conversionId": "abc123",
  "status": "completed",
  "downloadUrl": "http://api.example.com/results/abc123"
}
```

---

**Last Updated**: November 14, 2025  
**API Version**: 1.0.0  
**Status**: 🔨 In Development
