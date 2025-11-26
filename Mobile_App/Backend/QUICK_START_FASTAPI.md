# Quick Start - FastAPI Integration

## 🚀 Getting Started

### 1. Install Dependencies
```bash
cd Mobile_App/Backend
npm install
```

### 2. Configure Environment
Ensure these variables are in your `.env` file:
```env
FASTAPI_BASE_URL=https://minor-project-all-in-one-repository.vercel.app
FASTAPI_API_KEY=x7kX9jb8LyzVmJ5Dvy06n9yl0lSxB4Ut9ZidUWAZ0dk
MASTER_KEY_HEX=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

### 3. Test the Integration
```bash
npm run test:integration
```

Expected output:
```
✅ Health check passed
✅ API Info retrieved successfully
✅ All tests completed!
```

### 4. Start the Backend
```bash
npm run dev
```

---

## 📡 API Usage Examples

### Audio to Image Conversion

**Using cURL:**
```bash
curl -X POST http://localhost:3000/api/convert/audio-to-image \
  -F "audioFile=@sample.mp3" \
  -F "userId=alice" \
  -F "compress=true"
```

**Using JavaScript (Fetch):**
```javascript
const formData = new FormData();
formData.append('audioFile', fileInput.files[0]);
formData.append('userId', 'alice');
formData.append('compress', 'true');

const response = await fetch('http://localhost:3000/api/convert/audio-to-image', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log('Conversion ID:', result.conversionId);
console.log('Images:', result.images);
```

**Response:**
```json
{
  "success": true,
  "conversionId": "uuid-here",
  "inputFile": "sample.mp3",
  "outputPath": "/path/to/images",
  "imageCount": 3,
  "images": ["chunk_0.png", "chunk_1.png", "metadata.json"],
  "timestamp": "2025-11-26T..."
}
```

---

### Image to Audio Conversion

**Using cURL:**
```bash
curl -X POST http://localhost:3000/api/convert/image-to-audio \
  -H "Content-Type: application/json" \
  -d '{
    "conversionId": "uuid-from-audio-to-image",
    "outputFileName": "recovered.mp3",
    "userId": "alice"
  }'
```

**Using JavaScript (Fetch):**
```javascript
const response = await fetch('http://localhost:3000/api/convert/image-to-audio', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    conversionId: 'uuid-from-audio-to-image',
    outputFileName: 'recovered.mp3',
    userId: 'alice'
  })
});

const result = await response.json();
console.log('Audio file:', result.outputFile);
```

**Response:**
```json
{
  "success": true,
  "conversionId": "new-uuid",
  "outputFile": "recovered.mp3",
  "outputPath": "/path/to/audio.mp3",
  "timestamp": "2025-11-26T..."
}
```

---

## 🔑 Key Concepts

### Master Key
- **Format**: Exactly 64 hexadecimal characters (0-9, a-f)
- **Purpose**: Encrypts audio data before converting to images
- **Important**: Same key must be used for encoding and decoding

**Generate a master key:**
```javascript
// Node.js
const crypto = require('crypto');
const masterKey = crypto.randomBytes(32).toString('hex');
console.log(masterKey); // 64 hex characters
```

```python
# Python
import secrets
master_key = secrets.token_hex(32)
print(master_key)  # 64 hex characters
```

### User ID
- **Purpose**: Part of key derivation for encryption
- **Important**: Same user ID must be used for encoding and decoding
- **Example**: `"alice"`, `"user123"`, `"john@example.com"`

---

## 🛠️ Development Workflow

### Local Testing Workflow

1. **Start backend server:**
   ```bash
   npm run dev
   ```

2. **Upload an audio file:**
   ```bash
   curl -X POST http://localhost:3000/api/convert/audio-to-image \
     -F "audioFile=@test.mp3" \
     -F "userId=testuser"
   ```

3. **Copy the `conversionId` from the response**

4. **Decode back to audio:**
   ```bash
   curl -X POST http://localhost:3000/api/convert/image-to-audio \
     -H "Content-Type: application/json" \
     -d '{
       "conversionId": "your-conversion-id-here",
       "outputFileName": "recovered.mp3",
       "userId": "testuser"
     }'
   ```

5. **Verify the audio is identical:**
   - Compare file sizes
   - Listen to both files
   - Use checksum if needed

---

## 🐛 Common Issues & Solutions

### Issue: "Health check failed"

**Cause**: Can't reach FastAPI backend

**Solution:**
1. Check internet connection
2. Verify `FASTAPI_BASE_URL` in `.env`
3. Test manually: `curl https://minor-project-all-in-one-repository.vercel.app/health`

---

### Issue: "Invalid master key format"

**Cause**: Master key is not 64 hex characters

**Solution:**
- Ensure exactly 64 characters
- Use only 0-9 and a-f characters
- No spaces or special characters

**Good:**
```
0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

**Bad:**
```
abc123  // Too short
xyz456789...  // Invalid characters (x, y, z)
```

---

### Issue: "Decryption failed"

**Cause**: User ID or master key doesn't match encoding

**Solution:**
- Use the **exact same** `userId` for encoding and decoding
- Use the **exact same** `masterKey` for encoding and decoding
- Check for typos in user ID

---

### Issue: "ECONNREFUSED" or timeout

**Cause**: Can't connect to FastAPI backend

**Solution:**
1. For production: Check if Vercel deployment is up
2. For local dev: Start local FastAPI server:
   ```bash
   cd New_backend/AudioImageCarrier-Backend
   uvicorn app.main:app --reload
   ```
3. Update `.env`:
   ```env
   FASTAPI_BASE_URL=http://localhost:8000
   ```

---

## 📂 Directory Structure

```
Mobile_App/Backend/
├── src/
│   ├── controllers/
│   │   └── conversionController.ts    # Updated to use FastAPI
│   ├── services/
│   │   ├── fastApiClient.ts          # NEW: FastAPI client
│   │   └── converter.deprecated.ts    # OLD: Direct Python execution
│   └── ...
├── uploads/
│   ├── temp/                          # Temporary files
│   └── conversions/                   # Conversion results
│       ├── audio-to-image-{uuid}/     # PNG images + metadata
│       └── image-to-audio-{uuid}/     # Recovered audio files
├── .env                               # Environment configuration
├── FASTAPI_INTEGRATION.md             # Detailed integration docs
├── MIGRATION_SUMMARY.md               # Migration summary
└── test-fastapi-integration.ts        # Integration test
```

---

## 📚 Additional Resources

- **Interactive API Docs**: https://minor-project-all-in-one-repository.vercel.app/docs
- **API Usage Guide**: `../../New_backend/AudioImageCarrier-Backend/API_USAGE_GUIDE.md`
- **Integration Guide**: `FASTAPI_INTEGRATION.md`
- **Migration Summary**: `MIGRATION_SUMMARY.md`

---

## 🎯 Testing Checklist

Before deploying:

- [ ] Run `npm run test:integration` - should pass
- [ ] Test audio-to-image conversion with a real audio file
- [ ] Test image-to-audio conversion with the generated images
- [ ] Verify recovered audio matches original
- [ ] Test error handling (invalid master key, wrong user ID)
- [ ] Test with large files (>50MB)
- [ ] Test with different audio formats (mp3, wav, flac)

---

## 💡 Tips

1. **Always use the same credentials**
   - Same `userId` and `masterKey` for encode/decode
   - Save them securely during the encode phase

2. **Use compression**
   - Set `compress=true` to reduce file size by ~30-50%
   - Especially useful for large audio files

3. **Monitor conversion times**
   - Large files may take a few minutes
   - Check logs for progress

4. **Keep conversion IDs**
   - You need the conversionId from audio-to-image to decode
   - Store it in your database or return to frontend

---

**Ready to go! 🚀**

Run `npm run dev` and start converting!
