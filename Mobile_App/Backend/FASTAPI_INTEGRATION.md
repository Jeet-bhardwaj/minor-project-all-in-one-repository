# FastAPI Backend Integration

## Overview

The Mobile App backend has been successfully migrated from directly spawning Python processes to using the **AudioImageCarrier FastAPI** backend for audio-to-image and image-to-audio conversions.

## What Changed

### 1. **New FastAPI Client Service** (`src/services/fastApiClient.ts`)
   - Handles all communication with the FastAPI backend
   - Uses axios for HTTP requests and form-data for multipart file uploads
   - Provides two main methods:
     - `encodeAudioToImage()` - Converts audio files to encrypted images (ZIP)
     - `decodeImageToAudio()` - Converts encrypted images back to audio
   - Singleton pattern with `getFastApiClient()` helper function

### 2. **Updated Conversion Controller** (`src/controllers/conversionController.ts`)
   - Removed direct Python script execution
   - Now uses `fastApiClient` to communicate with the remote FastAPI service
   - Handles ZIP file extraction and temporary file management
   - Improved error handling and validation

### 3. **Environment Configuration** (`.env`)
   - Added `FASTAPI_BASE_URL` - URL of the FastAPI backend (default: Vercel deployment)
   - Added `FASTAPI_API_KEY` - API key for authentication

### 4. **Deprecated Old Service**
   - Renamed `converter.ts` to `converter.deprecated.ts`
   - This file is no longer used but kept for reference

### 5. **New Dependencies**
   - `axios` - HTTP client for API requests
   - `form-data` - Multipart form data handling
   - `adm-zip` - ZIP file creation and extraction
   - Type definitions: `@types/adm-zip`

## Configuration

### Environment Variables

Add the following to your `.env` file:

```env
# FastAPI Backend Configuration
FASTAPI_BASE_URL=https://minor-project-all-in-one-repository.vercel.app
FASTAPI_API_KEY=x7kX9jb8LyzVmJ5Dvy06n9yl0lSxB4Ut9ZidUWAZ0dk
```

### Local Development

If you want to use a local FastAPI instance:

```env
FASTAPI_BASE_URL=http://localhost:8000
FASTAPI_API_KEY=dev-test-key-12345
```

## API Endpoints (No Changes)

The Mobile App backend API endpoints remain the same:

### 1. **Audio to Image Conversion**
```http
POST /api/convert/audio-to-image
Content-Type: multipart/form-data

Fields:
- audioFile: File (audio file to convert)
- userId: String (optional, default: 'default-user')
- masterKeyHex: String (optional, uses MASTER_KEY_HEX from .env)
- compress: Boolean (optional, default: true)
- deleteSource: Boolean (optional, default: false)
- maxChunkBytes: Number (optional)

Response:
{
  "success": true,
  "message": "Audio converted to image successfully",
  "conversionId": "uuid",
  "inputFile": "audio.mp3",
  "outputPath": "/path/to/images",
  "imageCount": 3,
  "images": ["chunk_0.png", "chunk_1.png", "metadata.json"],
  "timestamp": "2025-11-26T..."
}
```

### 2. **Image to Audio Conversion**
```http
POST /api/convert/image-to-audio
Content-Type: application/json

Body:
{
  "conversionId": "uuid-from-audio-to-image",
  "outputFileName": "recovered_audio.mp3",
  "userId": "default-user",
  "masterKeyHex": "64-hex-characters" (optional)
}

Response:
{
  "success": true,
  "message": "Image converted to audio successfully",
  "conversionId": "new-uuid",
  "outputFile": "recovered_audio.mp3",
  "outputPath": "/path/to/audio.mp3",
  "timestamp": "2025-11-26T..."
}
```

### 3. **List Conversions**
```http
GET /api/conversions

Response:
{
  "success": true,
  "count": 5,
  "conversions": [
    "audio-to-image-uuid1",
    "audio-to-image-uuid2",
    "image-to-audio-uuid3"
  ],
  "timestamp": "2025-11-26T..."
}
```

### 4. **Get Conversion Status**
```http
GET /api/conversions/:conversionId

Response:
{
  "success": true,
  "conversionId": "uuid",
  "results": {
    "path": "/path/to/conversion",
    "files": ["chunk_0.png", "chunk_1.png", "metadata.json"]
  },
  "timestamp": "2025-11-26T..."
}
```

### 5. **Download Conversion File**
```http
GET /api/conversions/:conversionId/:fileName

Response: File download
```

## How It Works

### Audio to Image Flow

1. **Client uploads audio file** → Mobile App Backend
2. **Mobile App Backend**:
   - Receives file via multer
   - Validates master key format (64 hex chars)
   - Calls `fastApiClient.encodeAudioToImage()` with:
     - Audio file path
     - User ID
     - Master key
     - Compression settings
3. **FastAPI Backend**:
   - Encrypts audio using AES-256-GCM
   - Converts to PNG images
   - Returns ZIP file with images + metadata
4. **Mobile App Backend**:
   - Receives ZIP file
   - Extracts to `uploads/conversions/audio-to-image-{uuid}/`
   - Returns conversion details to client

### Image to Audio Flow

1. **Client requests decoding** → Mobile App Backend (with conversionId)
2. **Mobile App Backend**:
   - Locates the conversion directory
   - Creates a ZIP from all files in the directory
   - Calls `fastApiClient.decodeImageToAudio()` with:
     - ZIP file path
     - User ID
     - Master key
3. **FastAPI Backend**:
   - Extracts images from ZIP
   - Decrypts using matching user ID + master key
   - Decompresses if needed
   - Returns original audio file
4. **Mobile App Backend**:
   - Receives audio file
   - Saves to `uploads/conversions/image-to-audio-{uuid}/`
   - Returns audio file details to client

## Error Handling

### Common Errors

1. **Invalid Master Key**
   ```json
   {
     "success": false,
     "error": "Invalid master key",
     "message": "Master key must be 64 hexadecimal characters"
   }
   ```

2. **FastAPI Backend Unreachable**
   ```json
   {
     "success": false,
     "error": "ECONNREFUSED" or timeout error
   }
   ```

3. **Authentication Failed**
   ```json
   {
     "success": false,
     "error": "Invalid or missing API key"
   }
   ```

4. **Decryption Failed**
   ```json
   {
     "success": false,
     "error": "Decryption failed. Verify user_id and master_key are correct."
   }
   ```

## Testing

### 1. Health Check
```bash
curl http://localhost:3000/health
```

### 2. Test Audio to Image
```bash
curl -X POST http://localhost:3000/api/convert/audio-to-image \
  -F "audioFile=@test.mp3" \
  -F "userId=testuser" \
  -F "compress=true"
```

### 3. Test Image to Audio
```bash
curl -X POST http://localhost:3000/api/convert/image-to-audio \
  -H "Content-Type: application/json" \
  -d '{
    "conversionId": "uuid-from-step-2",
    "outputFileName": "recovered.mp3",
    "userId": "testuser"
  }'
```

## Benefits of FastAPI Integration

### ✅ Advantages

1. **Separation of Concerns**
   - Mobile backend focuses on business logic, API, and database
   - FastAPI backend handles heavy audio/image processing

2. **Scalability**
   - FastAPI backend can be scaled independently
   - Already deployed on Vercel with serverless infrastructure

3. **Maintainability**
   - No need to manage Python dependencies in Node.js project
   - Easier to update conversion logic independently

4. **Reliability**
   - FastAPI backend is production-tested and documented
   - Better error handling and validation

5. **No Local Python Required**
   - Mobile backend doesn't need Python installation
   - Works on any platform (Windows, Mac, Linux)

### ⚠️ Considerations

1. **Network Dependency**
   - Requires internet connection to reach FastAPI backend
   - Can use local FastAPI instance for offline development

2. **Latency**
   - Small network overhead compared to local Python execution
   - Mitigated by efficient binary transfer and compression

3. **API Key Management**
   - Need to securely store and rotate API keys
   - Currently using environment variables

## Troubleshooting

### FastAPI Backend Not Responding

1. Check if FastAPI backend is healthy:
   ```bash
   curl https://minor-project-all-in-one-repository.vercel.app/health
   ```

2. Verify API key in `.env` file

3. Check network connectivity

### File Upload Fails

1. Ensure file size is under 500MB
2. Verify file format (mp3, wav, flac, m4a, ogg, aac)
3. Check disk space in uploads directory

### Decryption Fails

1. Verify same `userId` and `masterKeyHex` used for encoding
2. Ensure conversion files haven't been modified
3. Check that all PNG files are present

## Migration Checklist

- [x] Install required npm packages (axios, form-data, adm-zip)
- [x] Create FastAPI client service
- [x] Update conversion controller
- [x] Update environment configuration
- [x] Deprecate old converter service
- [ ] Update mobile app frontend to handle new response format
- [ ] Update API documentation
- [ ] Test end-to-end conversion flow
- [ ] Deploy changes to production

## Next Steps

1. **Test the Integration**
   - Run the backend: `npm run dev`
   - Test with sample audio files
   - Verify conversions work correctly

2. **Update Mobile App Frontend**
   - Ensure frontend can handle the response format
   - Update error handling if needed

3. **Production Deployment**
   - Ensure FastAPI backend is accessible
   - Update production `.env` with correct API key
   - Monitor logs for any issues

## Support

For issues with:
- **Mobile Backend**: Check logs in console
- **FastAPI Backend**: See `FASTAPI_BASE_URL/docs` for interactive API docs
- **Integration**: Review this document and check network logs

## Resources

- [FastAPI Backend API Documentation](https://minor-project-all-in-one-repository.vercel.app/docs)
- [API Usage Guide](../../New_backend/AudioImageCarrier-Backend/API_USAGE_GUIDE.md)
- [Mobile Backend README](./README.md)
