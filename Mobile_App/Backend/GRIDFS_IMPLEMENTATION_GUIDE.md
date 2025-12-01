# GridFS Implementation - Complete Guide

## 🎯 Implementation Summary

We've successfully implemented MongoDB GridFS storage for audio-image conversions with encrypted master key management. This allows:

- **Multiple conversions per user**: Each user can have many conversions
- **Unique master keys**: Each conversion has its own encrypted master key
- **Scalable storage**: Binary files stored in GridFS instead of file system
- **Clear organization**: User → Conversions → Images hierarchy

## 📂 Architecture

```
User: prince
├─ Conversion 1 (song.mp3)
│  ├─ Master Key: key_ABC (encrypted in MongoDB)
│  ├─ ZIP File: conv_123.zip (in GridFS)
│  └─ Images: image_0.png, image_1.png, image_2.png (in GridFS)
│
├─ Conversion 2 (podcast.mp3)
│  ├─ Master Key: key_XYZ (encrypted in MongoDB)
│  ├─ ZIP File: conv_456.zip (in GridFS)
│  └─ Image: image_0.png (in GridFS)
│
└─ Conversion 3 (recording.wav)
   ├─ Master Key: key_QWE (encrypted in MongoDB)
   ├─ ZIP File: conv_789.zip (in GridFS)
   └─ Images: image_0.png, image_1.png (in GridFS)
```

## 🗄️ Database Schema

### Collections

1. **users** - User accounts (existing)
2. **conversions** - Conversion metadata with encrypted master keys
3. **uploads.files** - GridFS file metadata
4. **uploads.chunks** - GridFS binary data chunks

### Conversion Document

```typescript
{
  _id: ObjectId,
  userId: "prince_123",
  conversionId: "conv_1234567890_a1b2c3d4",
  originalFileName: "song.mp3",
  originalFileSize: 5242880,
  audioFormat: "mp3",
  masterKey: "iv:authTag:encryptedKey", // AES-256-GCM encrypted
  zipFileId: ObjectId("..."), // Reference to GridFS file
  images: [
    {
      fileId: ObjectId("..."),
      filename: "image_0.png",
      size: 1048576,
      chunkIndex: 0
    },
    {
      fileId: ObjectId("..."),
      filename: "image_1.png",
      size: 1048576,
      chunkIndex: 1
    }
  ],
  metadata: {
    numChunks: 2,
    totalImageSize: 2097152,
    compressed: true
  },
  status: "completed", // processing | completed | failed
  createdAt: Date,
  updatedAt: Date
}
```

## 🔐 Security

### Master Key Encryption

- **Storage**: Master keys encrypted with AES-256-GCM before MongoDB storage
- **Encryption Key**: `DB_ENCRYPTION_KEY` environment variable (64 hex chars)
- **Format**: `iv:authTag:encryptedKey` (all hex strings)
- **Access**: `masterKey` field has `select: false` by default

### Environment Variables

```env
DB_ENCRYPTION_KEY=458a08574fbbb68df558b9c80cb1349879aebb5db2af40bd3c1fad4424cb72a1
```

## 🚀 API Endpoints

### 1. Audio to Image (GridFS)

**Endpoint**: `POST /api/v2/audio-to-image`

**Request**:
```bash
curl -X POST http://localhost:3000/api/v2/audio-to-image \
  -F "audio=@song.mp3" \
  -F "userId=prince_123" \
  -F "compress=true"
```

**Response**:
```json
{
  "success": true,
  "conversionId": "conv_1234567890_a1b2c3d4",
  "userId": "prince_123",
  "originalFileName": "song.mp3",
  "numImages": 3,
  "totalSize": 3145728,
  "message": "Audio successfully encrypted and stored in GridFS"
}
```

**Process**:
1. Validate audio file and userId
2. Generate unique `conversionId` and `masterKey`
3. Create MongoDB record with status: "processing"
4. Call FastAPI `/api/v1/encode` to encrypt audio → images
5. Upload ZIP file to GridFS → get `zipFileId`
6. Extract ZIP and upload each PNG to GridFS
7. Update conversion record with file references
8. Mark status as "completed"
9. Return `conversionId` to client

### 2. Image to Audio (GridFS)

**Endpoint**: `POST /api/v2/image-to-audio`

**Request**:
```bash
curl -X POST http://localhost:3000/api/v2/image-to-audio \
  -H "Content-Type: application/json" \
  -d '{"userId": "prince_123", "conversionId": "conv_1234567890_a1b2c3d4"}' \
  --output song.wav
```

**Response**: Audio file stream (audio/wav)

**Process**:
1. Find conversion by `conversionId` + `userId` (security check)
2. Decrypt master key from MongoDB
3. Download ZIP file from GridFS
4. Save ZIP to temp file
5. Call FastAPI `/api/v1/decode` to decrypt images → audio
6. Stream audio file back to client
7. Clean up temp files

### 3. Get User Conversions

**Endpoint**: `GET /api/v2/user/:userId/conversions`

**Request**:
```bash
curl http://localhost:3000/api/v2/user/prince_123/conversions
```

**Response**:
```json
{
  "success": true,
  "userId": "prince_123",
  "totalConversions": 3,
  "conversions": [
    {
      "conversionId": "conv_1234567890_a1b2c3d4",
      "originalFileName": "song.mp3",
      "fileSize": 5242880,
      "audioFormat": "mp3",
      "numImages": 3,
      "totalImageSize": 3145728,
      "compressed": true,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "createdAgo": "2h ago",
      "fileSizeReadable": "5.0 MB"
    }
  ]
}
```

### 4. Delete Conversion

**Endpoint**: `DELETE /api/v2/conversions/:userId/:conversionId`

**Request**:
```bash
curl -X DELETE http://localhost:3000/api/v2/conversions/prince_123/conv_1234567890_a1b2c3d4
```

**Response**:
```json
{
  "success": true,
  "message": "Conversion deleted successfully"
}
```

**Process**:
1. Find conversion by `conversionId` + `userId`
2. Delete ZIP file from GridFS
3. Delete all image files from GridFS
4. Delete conversion document from MongoDB

## 📝 Files Created/Modified

### New Files

1. **`src/models/Conversion.ts`**
   - Mongoose schema for conversion documents
   - Indexes on `userId+createdAt` and `userId+status`
   - Master key field with `select: false`

2. **`src/services/gridfsService.ts`**
   - GridFS wrapper functions
   - `initGridFS()`, `uploadToGridFS()`, `downloadFromGridFS()`
   - `deleteFromGridFS()`, `streamFromGridFS()`, `getFileInfo()`

3. **`src/services/encryptionService.ts`**
   - AES-256-GCM encryption for master keys
   - `encryptMasterKey()`, `decryptMasterKey()`
   - `generateMasterKey()`, `validateMasterKeyFormat()`

4. **`src/controllers/gridfsConversionController.ts`**
   - New controllers for GridFS-based conversions
   - `audioToImageGridFS`, `imageToAudioGridFS`
   - `getUserConversions`, `deleteConversion`

### Modified Files

1. **`src/routes/conversionRoutes.ts`**
   - Added v2 endpoints: `/api/v2/audio-to-image`, `/api/v2/image-to-audio`
   - Added user endpoints: `/api/v2/user/:userId/conversions`
   - Added delete endpoint: `/api/v2/conversions/:userId/:conversionId`

2. **`src/index.ts`**
   - Added `initGridFS()` call after MongoDB connection

3. **`.env`**
   - Added `DB_ENCRYPTION_KEY` for master key encryption

## 🧪 Testing

### 1. Start Backend Server

```powershell
cd "e:\Projects\minnor Project\Mobile_App\Backend"
npm run dev
```

Expected output:
```
✅ MongoDB connected successfully
✅ GridFS initialized successfully
🚀 Server running on port 3000
```

### 2. Test Audio to Image

```powershell
# Prepare test audio file
$audioPath = "e:\Projects\minnor Project\Mobile_App\Backend\uploads\temp\test.mp3"

# Upload to GridFS endpoint
Invoke-RestMethod -Method Post `
  -Uri "http://localhost:3000/api/v2/audio-to-image" `
  -Form @{
    audio = Get-Item $audioPath
    userId = "test_user_123"
    compress = "true"
  }
```

Expected response:
```json
{
  "success": true,
  "conversionId": "conv_...",
  "numImages": 3
}
```

### 3. Test Get Conversions

```powershell
Invoke-RestMethod -Method Get `
  -Uri "http://localhost:3000/api/v2/user/test_user_123/conversions"
```

### 4. Test Image to Audio

```powershell
$conversionId = "conv_1234567890_a1b2c3d4"

Invoke-RestMethod -Method Post `
  -Uri "http://localhost:3000/api/v2/image-to-audio" `
  -ContentType "application/json" `
  -Body (@{userId="test_user_123"; conversionId=$conversionId} | ConvertTo-Json) `
  -OutFile "decoded_audio.wav"
```

### 5. Verify MongoDB

```bash
# Connect to MongoDB Atlas
mongosh "mongodb+srv://bhardwajjeet408_db_user:CxN6NTT4c4Xh2Ifc@echociphercluster.aljn5or.mongodb.net/?appName=EchoCipherCluster"

# Check conversions
use echocipher
db.conversions.find().pretty()

# Check GridFS files
db.uploads.files.find().pretty()
db.uploads.chunks.count()
```

## 🔧 Troubleshooting

### Error: "GridFS bucket not initialized"

**Solution**: Ensure `initGridFS()` is called after MongoDB connection in `index.ts`

### Error: "DB_ENCRYPTION_KEY is not set"

**Solution**: Add to `.env`:
```env
DB_ENCRYPTION_KEY=458a08574fbbb68df558b9c80cb1349879aebb5db2af40bd3c1fad4424cb72a1
```

### Error: "Conversion not found"

**Solution**: Check that `userId` and `conversionId` match in the request

### GridFS files not being deleted

**Solution**: Verify `deleteFromGridFS()` is being called with correct ObjectId

## 📱 Mobile App Integration

### Update Audio to Image Screen

```typescript
// Call v2 endpoint
const response = await fetch('http://192.168.29.67:3000/api/v2/audio-to-image', {
  method: 'POST',
  body: formData,
});

const data = await response.json();
console.log('Conversion ID:', data.conversionId);

// Save conversionId to AsyncStorage or state
await AsyncStorage.setItem('lastConversionId', data.conversionId);
```

### Update Image to Audio Screen

```typescript
// Get conversions list
const conversions = await fetch(
  `http://192.168.29.67:3000/api/v2/user/${userId}/conversions`
).then(r => r.json());

// Decode specific conversion
const response = await fetch('http://192.168.29.67:3000/api/v2/image-to-audio', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: userId,
    conversionId: selectedConversionId,
  }),
});

const audioBlob = await response.blob();
// Play audio or save to file
```

## 🎉 Benefits

1. **Scalability**: GridFS handles large files efficiently
2. **Organization**: Clear user → conversion → images hierarchy
3. **Security**: Master keys encrypted at rest
4. **Traceability**: Each conversion has unique ID
5. **Cleanup**: Easy deletion of conversions and files
6. **Multi-user**: Support for unlimited users and conversions

## 📊 Performance Considerations

- **Chunk Size**: GridFS uses 255KB chunks by default
- **Indexes**: Compound indexes on `userId+createdAt` for fast queries
- **Streaming**: Use `streamFromGridFS()` for large file downloads
- **Cleanup**: Implement periodic cleanup of failed conversions

## 🔮 Future Enhancements

1. Add conversion progress tracking (0-100%)
2. Implement WebSocket for real-time updates
3. Add batch conversion support
4. Implement conversion sharing between users
5. Add encryption key rotation
6. Implement automatic cleanup of old conversions

---

**Implementation Status**: ✅ Complete and ready for testing

**Next Steps**: 
1. Start backend server
2. Test all 4 endpoints
3. Update mobile app to use v2 endpoints
4. Monitor MongoDB Atlas for conversions and GridFS files
