# AudioImageCarrier API - Complete Usage Guide

## 🌐 Base URL
```
https://minor-project-all-in-one-repository.vercel.app
```

## 🔐 Authentication

All API endpoints (except `/` and `/health`) require an API key in the request header:

```
X-API-Key: x7kX9jb8LyzVmJ5Dvy06n9yl0lSxB4Ut9ZidUWAZ0dk
```

### Example Header
```javascript
headers: {
  'X-API-Key': 'x7kX9jb8LyzVmJ5Dvy06n9yl0lSxB4Ut9ZidUWAZ0dk'
}
```

---

## 📡 API Endpoints

### 1. Health Check (No Auth Required)

**GET** `/health`

Check if the API is running.

**Response:**
```json
{
  "status": "healthy",
  "version": "2.0.0",
  "timestamp": "2025-11-26T06:44:33.466592"
}
```

---

### 2. Root Info (No Auth Required)

**GET** `/`

Get API information and available endpoints.

**Response:**
```json
{
  "app": "AudioImageCarrier API",
  "version": "2.0.0",
  "status": "healthy",
  "timestamp": "2025-11-26T06:43:24.475274",
  "docs": "/docs",
  "endpoints": {
    "encode": "/api/v1/encode",
    "decode": "/api/v1/decode"
  }
}
```

---

## 🎵 Main Endpoints

### 3. Encode Audio to Image

**POST** `/api/v1/encode`

Convert an audio file into encrypted PNG images.

#### Request

**Content-Type:** `multipart/form-data`

**Headers:**
```
X-API-Key: x7kX9jb8LyzVmJ5Dvy06n9yl0lSxB4Ut9ZidUWAZ0dk
```

**Form Data Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `audio_file` | File | ✅ Yes | Audio file to encode (MP3, WAV, M4A, FLAC, OGG, AAC) |
| `user_id` | String | ✅ Yes | User identifier for key derivation (e.g., "alice", "user123") |
| `master_key` | String | ✅ Yes | 64-character hex master key for encryption |
| `compress` | Boolean | ❌ No | Enable zstd compression (default: `true`) |
| `max_chunk_bytes` | Integer | ❌ No | Max chunk size in bytes (default: 52428800 = 50MB) |
| `max_width` | Integer | ❌ No | Max image width in pixels (default: 8192) |

#### Master Key Format

Must be a 64-character hexadecimal string (32 bytes):
```
Example: a7f3e9d2c1b4568790fedcba0123456789abcdef0123456789abcdef01234567
```

To generate a random master key (Python):
```python
import secrets
master_key = secrets.token_hex(32)
print(master_key)
```

#### Example Request (cURL)

```bash
curl -X POST "https://minor-project-all-in-one-repository.vercel.app/api/v1/encode" \
  -H "X-API-Key: x7kX9jb8LyzVmJ5Dvy06n9yl0lSxB4Ut9ZidUWAZ0dk" \
  -F "audio_file=@/path/to/audio.mp3" \
  -F "user_id=alice" \
  -F "master_key=a7f3e9d2c1b4568790fedcba0123456789abcdef0123456789abcdef01234567" \
  -F "compress=true" \
  --output encrypted_images.zip
```

#### Example Request (JavaScript/Fetch)

```javascript
const formData = new FormData();
formData.append('audio_file', audioFile); // File object from input
formData.append('user_id', 'alice');
formData.append('master_key', 'a7f3e9d2c1b4568790fedcba0123456789abcdef0123456789abcdef01234567');
formData.append('compress', 'true');

const response = await fetch('https://minor-project-all-in-one-repository.vercel.app/api/v1/encode', {
  method: 'POST',
  headers: {
    'X-API-Key': 'x7kX9jb8LyzVmJ5Dvy06n9yl0lSxB4Ut9ZidUWAZ0dk'
  },
  body: formData
});

const blob = await response.blob();
// Save blob as encrypted_images.zip
```

#### Example Request (Python/requests)

```python
import requests

url = "https://minor-project-all-in-one-repository.vercel.app/api/v1/encode"

headers = {
    "X-API-Key": "x7kX9jb8LyzVmJ5Dvy06n9yl0lSxB4Ut9ZidUWAZ0dk"
}

files = {
    "audio_file": open("audio.mp3", "rb")
}

data = {
    "user_id": "alice",
    "master_key": "a7f3e9d2c1b4568790fedcba0123456789abcdef0123456789abcdef01234567",
    "compress": "true"
}

response = requests.post(url, headers=headers, files=files, data=data)

with open("encrypted_images.zip", "wb") as f:
    f.write(response.content)
```

#### Success Response

**Status:** `200 OK`

**Content-Type:** `application/zip`

Returns a ZIP file containing:
- `chunk_0.png`, `chunk_1.png`, etc. - Encrypted PNG images
- `metadata.json` - Metadata file with encryption info

**Metadata Structure:**
```json
{
  "num_chunks": 1,
  "original_filename": "audio.mp3",
  "original_size": 862474,
  "compressed": true,
  "timestamp": "2025-11-26T06:43:24.475274",
  "user_id": "alice"
}
```

#### Error Responses

**400 Bad Request** - Invalid parameters
```json
{
  "success": false,
  "error": "ValidationError",
  "message": "Invalid master_key format. Must be 64 hex characters.",
  "timestamp": "2025-11-26T06:43:24.475274"
}
```

**401 Unauthorized** - Missing or invalid API key
```json
{
  "detail": "Invalid or missing API key"
}
```

**413 Payload Too Large** - File exceeds size limit
```json
{
  "success": false,
  "error": "FileTooLarge",
  "message": "File size exceeds maximum allowed size of 500 MB",
  "timestamp": "2025-11-26T06:43:24.475274"
}
```

**415 Unsupported Media Type** - Invalid file type
```json
{
  "success": false,
  "error": "UnsupportedFileType",
  "message": "Unsupported audio format. Allowed: mp3, wav, m4a, flac, ogg, aac",
  "timestamp": "2025-11-26T06:43:24.475274"
}
```

---

### 4. Decode Image to Audio

**POST** `/api/v1/decode`

Convert encrypted PNG images back to the original audio file.

#### Request

**Content-Type:** `multipart/form-data`

**Headers:**
```
X-API-Key: x7kX9jb8LyzVmJ5Dvy06n9yl0lSxB4Ut9ZidUWAZ0dk
```

**Form Data Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `encrypted_zip` | File | ✅ Yes | ZIP file containing encrypted PNG images from encode |
| `user_id` | String | ✅ Yes | Same user ID used during encoding |
| `master_key` | String | ✅ Yes | Same 64-character hex master key used during encoding |
| `output_filename` | String | ❌ No | Custom output filename (default: uses original name from metadata) |

#### Important Notes

- **`user_id` and `master_key` MUST match** the values used during encoding
- The ZIP file must contain PNG images and `metadata.json`
- Different credentials will result in decryption failure

#### Example Request (cURL)

```bash
curl -X POST "https://minor-project-all-in-one-repository.vercel.app/api/v1/decode" \
  -H "X-API-Key: x7kX9jb8LyzVmJ5Dvy06n9yl0lSxB4Ut9ZidUWAZ0dk" \
  -F "encrypted_zip=@encrypted_images.zip" \
  -F "user_id=alice" \
  -F "master_key=a7f3e9d2c1b4568790fedcba0123456789abcdef0123456789abcdef01234567" \
  --output recovered_audio.mp3
```

#### Example Request (JavaScript/Fetch)

```javascript
const formData = new FormData();
formData.append('encrypted_zip', zipFile); // File object
formData.append('user_id', 'alice');
formData.append('master_key', 'a7f3e9d2c1b4568790fedcba0123456789abcdef0123456789abcdef01234567');

const response = await fetch('https://minor-project-all-in-one-repository.vercel.app/api/v1/decode', {
  method: 'POST',
  headers: {
    'X-API-Key': 'x7kX9jb8LyzVmJ5Dvy06n9yl0lSxB4Ut9ZidUWAZ0dk'
  },
  body: formData
});

const blob = await response.blob();
// Save blob as audio file
```

#### Example Request (Python/requests)

```python
import requests

url = "https://minor-project-all-in-one-repository.vercel.app/api/v1/decode"

headers = {
    "X-API-Key": "x7kX9jb8LyzVmJ5Dvy06n9yl0lSxB4Ut9ZidUWAZ0dk"
}

files = {
    "encrypted_zip": open("encrypted_images.zip", "rb")
}

data = {
    "user_id": "alice",
    "master_key": "a7f3e9d2c1b4568790fedcba0123456789abcdef0123456789abcdef01234567"
}

response = requests.post(url, headers=headers, files=files, data=data)

with open("recovered_audio.mp3", "wb") as f:
    f.write(response.content)
```

#### Success Response

**Status:** `200 OK`

**Content-Type:** `audio/*` (varies based on original file)

Returns the decrypted audio file as binary data.

**Response Headers:**
```
Content-Disposition: attachment; filename="recovered_audio.mp3"
Content-Type: audio/mpeg
```

#### Error Responses

**400 Bad Request** - Invalid parameters or decryption failure
```json
{
  "success": false,
  "error": "DecryptionError",
  "message": "Decryption failed. Verify user_id and master_key are correct.",
  "timestamp": "2025-11-26T06:43:24.475274"
}
```

**401 Unauthorized** - Missing or invalid API key
```json
{
  "detail": "Invalid or missing API key"
}
```

**422 Unprocessable Entity** - Missing required fields
```json
{
  "detail": [
    {
      "loc": ["body", "user_id"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

---

## 🔑 Security Best Practices

### 1. Master Key Management

- **Generate unique master keys** for each user
- **Store securely** - Never expose in client-side code
- **Use environment variables** or secure key management systems
- **Rotate keys** periodically for enhanced security

### 2. User ID Usage

- The `user_id` is used for **key derivation**, not authentication
- Different `user_id` values create **different encryption keys**
- Use meaningful identifiers (username, email, UUID)
- **Same user_id + master_key = same encryption key**

### 3. API Key Protection

- **Never expose** the API key in client-side code
- Use a **backend proxy** to add the API key server-side
- Implement **rate limiting** on your backend
- **Rotate the API key** if compromised

### 4. File Upload Security

- **Validate file types** before upload
- **Check file sizes** to prevent large uploads
- **Scan for malware** in production environments
- **Use HTTPS** for all API requests

---

## 📊 File Size Limits

| Component | Limit |
|-----------|-------|
| Max Audio File Size | 500 MB |
| Max Chunk Size | 50 MB (configurable) |
| Max Image Width | 8192 pixels (configurable) |
| Request Timeout | 60 seconds (Vercel) |

---

## 🎯 Common Use Cases

### Use Case 1: Simple Encode/Decode

```javascript
// ENCODE
const encodeFormData = new FormData();
encodeFormData.append('audio_file', audioFile);
encodeFormData.append('user_id', 'user123');
encodeFormData.append('master_key', masterKey);
encodeFormData.append('compress', 'true');

const encodeResponse = await fetch('https://minor-project-all-in-one-repository.vercel.app/api/v1/encode', {
  method: 'POST',
  headers: { 'X-API-Key': API_KEY },
  body: encodeFormData
});

const zipBlob = await encodeResponse.blob();

// DECODE
const decodeFormData = new FormData();
decodeFormData.append('encrypted_zip', zipBlob);
decodeFormData.append('user_id', 'user123');
decodeFormData.append('master_key', masterKey);

const decodeResponse = await fetch('https://minor-project-all-in-one-repository.vercel.app/api/v1/decode', {
  method: 'POST',
  headers: { 'X-API-Key': API_KEY },
  body: decodeFormData
});

const audioBlob = await decodeResponse.blob();
```

### Use Case 2: Backend Proxy (Recommended)

```javascript
// Frontend - calls your backend
const response = await fetch('https://your-backend.com/api/encode-audio', {
  method: 'POST',
  body: formData
});

// Your Backend - adds API key and proxies to AudioImageCarrier API
app.post('/api/encode-audio', async (req, res) => {
  const formData = new FormData();
  // ... populate formData from req.files
  
  const response = await fetch('https://minor-project-all-in-one-repository.vercel.app/api/v1/encode', {
    method: 'POST',
    headers: {
      'X-API-Key': process.env.AUDIO_IMAGE_API_KEY // Secure!
    },
    body: formData
  });
  
  const data = await response.blob();
  res.send(data);
});
```

---

## 🧪 Testing the API

### Test with cURL

```bash
# 1. Check health
curl https://minor-project-all-in-one-repository.vercel.app/health

# 2. Encode an audio file
curl -X POST "https://minor-project-all-in-one-repository.vercel.app/api/v1/encode" \
  -H "X-API-Key: x7kX9jb8LyzVmJ5Dvy06n9yl0lSxB4Ut9ZidUWAZ0dk" \
  -F "audio_file=@test.mp3" \
  -F "user_id=testuser" \
  -F "master_key=a7f3e9d2c1b4568790fedcba0123456789abcdef0123456789abcdef01234567" \
  -F "compress=true" \
  -o encrypted.zip

# 3. Decode the encrypted file
curl -X POST "https://minor-project-all-in-one-repository.vercel.app/api/v1/decode" \
  -H "X-API-Key: x7kX9jb8LyzVmJ5Dvy06n9yl0lSxB4Ut9ZidUWAZ0dk" \
  -F "encrypted_zip=@encrypted.zip" \
  -F "user_id=testuser" \
  -F "master_key=a7f3e9d2c1b4568790fedcba0123456789abcdef0123456789abcdef01234567" \
  -o recovered.mp3
```

### Test with Postman

1. **Create a new request**
2. **Set method to POST**
3. **Enter URL**: `https://minor-project-all-in-one-repository.vercel.app/api/v1/encode`
4. **Headers tab**: Add `X-API-Key` = `x7kX9jb8LyzVmJ5Dvy06n9yl0lSxB4Ut9ZidUWAZ0dk`
5. **Body tab**: Select `form-data`
6. **Add fields**:
   - `audio_file` (File) - Select your audio file
   - `user_id` (Text) = `testuser`
   - `master_key` (Text) = `a7f3e9d2c1b4568790fedcba0123456789abcdef0123456789abcdef01234567`
   - `compress` (Text) = `true`
7. **Click Send**
8. **Save response** as `encrypted.zip`

---

## 📖 Interactive Documentation

Visit the auto-generated interactive API documentation:

- **Swagger UI**: https://minor-project-all-in-one-repository.vercel.app/docs
- **ReDoc**: https://minor-project-all-in-one-repository.vercel.app/redoc

You can test the API directly from the browser!

---

## ⚠️ Important Notes

1. **Credentials Must Match**: The `user_id` and `master_key` used for decoding MUST exactly match those used for encoding.

2. **File Integrity**: The decoded audio file will be bit-for-bit identical to the original (verified via SHA-256).

3. **Compression**: When `compress=true`, zstd compression is applied before encryption, reducing file size by ~30-50%.

4. **Chunking**: Large audio files are automatically split into chunks. All chunks are included in the output ZIP.

5. **Timeout**: Vercel has a 60-second timeout. Very large files (>100MB) might timeout. Consider splitting into smaller files.

6. **Temporary Files**: All uploaded files are stored temporarily and deleted after processing.

---

## 🐛 Troubleshooting

### Error: "Invalid or missing API key"
- Verify the `X-API-Key` header is included
- Check for typos in the API key
- Ensure header name is exactly `X-API-Key` (case-sensitive)

### Error: "Invalid master_key format"
- Master key must be exactly 64 hexadecimal characters
- No spaces or special characters
- Use lowercase or uppercase (both work)

### Error: "Decryption failed"
- Verify `user_id` matches the one used during encoding
- Verify `master_key` matches the one used during encoding
- Ensure the ZIP file contains valid encrypted data

### Error: "Unsupported audio format"
- Check file extension (must be: mp3, wav, m4a, flac, ogg, aac)
- Verify file is not corrupted
- Try re-encoding with a standard audio tool

### Large Files Timeout
- Split audio into smaller segments
- Use lower bitrate audio encoding
- Enable compression (`compress=true`)

---

## 📞 Support

For issues or questions:
- Check the interactive docs: `/docs`
- Review this guide
- Verify all parameters are correct
- Test with small files first

---

## 🎉 Quick Start Summary

1. **Get your credentials ready**:
   - API Key: `x7kX9jb8LyzVmJ5Dvy06n9yl0lSxB4Ut9ZidUWAZ0dk`
   - Generate a master key (64 hex chars)
   - Choose a user_id

2. **Encode an audio file**:
   - POST to `/api/v1/encode`
   - Include API key in header
   - Upload audio file + user_id + master_key
   - Receive ZIP with encrypted images

3. **Decode the audio**:
   - POST to `/api/v1/decode`
   - Include API key in header
   - Upload ZIP + same user_id + same master_key
   - Receive original audio file

That's it! Your audio is now encrypted in PNG images and can be securely stored or transmitted.
