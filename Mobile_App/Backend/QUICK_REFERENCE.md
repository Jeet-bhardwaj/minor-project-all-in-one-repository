# 🚀 GridFS Quick Reference

## Start Backend
```powershell
cd "e:\Projects\minnor Project\Mobile_App\Backend"
npm run dev
```

## Test Implementation
```powershell
.\test-gridfs.ps1
```

## API Endpoints (v2 - GridFS)

### 📤 Upload Audio
```bash
POST /api/v2/audio-to-image
Content-Type: multipart/form-data

Fields:
- audio: <audio file>
- userId: "prince_123"
- compress: "true"

Returns: {conversionId, numImages}
```

### 📥 Download Audio
```bash
POST /api/v2/image-to-audio
Content-Type: application/json

Body: {"userId": "prince_123", "conversionId": "conv_..."}

Returns: Audio file stream
```

### 📋 List Conversions
```bash
GET /api/v2/user/{userId}/conversions

Returns: {conversions: [...]}
```

### 🗑️ Delete Conversion
```bash
DELETE /api/v2/conversions/{userId}/{conversionId}

Returns: {success: true}
```

## Database Collections

- **conversions** - Conversion metadata with encrypted master keys
- **uploads.files** - GridFS file metadata
- **uploads.chunks** - GridFS binary chunks

## Environment Variables

```env
DB_ENCRYPTION_KEY=458a08574fbbb68df558b9c80cb1349879aebb5db2af40bd3c1fad4424cb72a1
MONGODB_URI=mongodb+srv://...
FASTAPI_BASE_URL=https://minor-project-all-in-one-repository.vercel.app
```

## Files Created

1. `src/models/Conversion.ts` - MongoDB schema
2. `src/services/gridfsService.ts` - GridFS operations
3. `src/services/encryptionService.ts` - AES-256-GCM encryption
4. `src/controllers/gridfsConversionController.ts` - v2 controllers

## Mobile App Changes Needed

**Audio to Image:**
```typescript
// Change: /api/audio-to-image → /api/v2/audio-to-image
fetch('http://192.168.29.67:3000/api/v2/audio-to-image', {...})
```

**Image to Audio:**
```typescript
// 1. Get conversions list
const conversions = await fetch(
  `http://192.168.29.67:3000/api/v2/user/${userId}/conversions`
).then(r => r.json());

// 2. Decode selected conversion
fetch('http://192.168.29.67:3000/api/v2/image-to-audio', {
  method: 'POST',
  body: JSON.stringify({userId, conversionId}),
})
```

## Verify MongoDB

```bash
mongosh "mongodb+srv://bhardwajjeet408_db_user:CxN6NTT4c4Xh2Ifc@echociphercluster.aljn5or.mongodb.net/?appName=EchoCipherCluster"

use echocipher
db.conversions.find()
db.uploads.files.find()
```

## Troubleshooting

| Error | Solution |
|-------|----------|
| GridFS not initialized | Check `initGridFS()` called in index.ts |
| DB_ENCRYPTION_KEY not set | Add to .env file |
| Conversion not found | Verify userId and conversionId match |
| 400 Bad Request | Check request body format |

---

**Status**: ✅ Ready for Testing

**Docs**: See `GRIDFS_IMPLEMENTATION_GUIDE.md` for full details
