# 🚀 Quick Start Guide - Testing EchoCipher

## ✅ Current Status

- ✅ **Backend**: Running on `http://localhost:3000`
- ✅ **Database**: MongoDB Atlas connected (`echocipher`)
- ✅ **Frontend**: Running on `http://localhost:8081`
- ✅ **Python Script**: Working with all dependencies installed
- ✅ **Conversion API**: Fully functional and tested

---

## 🧪 Test Audio-to-Image Conversion

### Option 1: Using Batch Script (Easiest)

```bash
cd "e:\Projects\minnor Project\Mobile_App\Backend"
cmd /c test-audio-to-image.bat
```

**Expected Output**:
```
✅ [OK] Audio file found: test-audio.wav
✅ [OK] File size: 176444 bytes
✅ Status: 200 OK
✅ Response: 
{
  "success": true,
  "message": "Audio converted to image successfully",
  "conversionId": "...",
  "imageCount": 1,
  "images": ["part0001_of_0001.png"]
}
```

### Option 2: Using cURL

```bash
cd "e:\Projects\minnor Project\Mobile_App\Backend"

curl -X POST \
  -F "audioFile=@test-audio.wav;type=audio/wav" \
  -F "userId=test-user" \
  -F "compress=true" \
  http://localhost:3000/api/convert/audio-to-image
```

### Option 3: Using PowerShell

```powershell
$audioFile = "e:\Projects\minnor Project\Mobile_App\Backend\test-audio.wav"
$uri = "http://localhost:3000/api/convert/audio-to-image"

$body = @{
    audioFile = Get-Item -Path $audioFile
    userId = "test-user"
    compress = "true"
}

$response = Invoke-WebRequest -Uri $uri -Method POST -Form $body
$response.Content | ConvertFrom-Json | Format-List
```

---

## 📊 Check Backend Health

```bash
# Health check
curl http://localhost:3000/health

# API status
curl http://localhost:3000/api/status
```

**Expected Response**:
```json
{
  "status": "ok",
  "database": "connected",
  "environment": "development",
  "uptime": 28.98
}
```

---

## 🎵 Frontend Testing

### 1. Open Frontend
```
http://localhost:8081
```

### 2. Expected Screens
- **Splash Screen**: 5-second welcome screen
- **Auth Screen**: Login/Register options
- **Main Tabs**:
  - Audio→Image Tab
  - Image→Audio Tab
  - Settings Tab

### 3. Test Audio-to-Image Conversion
1. Navigate to "Audio→Image" tab
2. Click "Select Audio File"
3. Choose an audio file (.wav, .mp3, .flac, .m4a)
4. Click "Convert to Image"
5. Wait for conversion (typically 0.5-2 seconds)
6. See generated images

---

## 🗄️ MongoDB Data

### Check Stored Data

#### Connect to MongoDB Atlas
```
URL: mongodb+srv://bhardwajjeet408_db_user:CxN6NTT4c4Xh2Ifc@echociphercluster.aljn5or.mongodb.net
Database: echocipher
```

#### Collections to Explore
- `conversiontasks` - All conversions
- `system_logs` - All events
- `encryptionkeys` - All encryption keys
- `usersessions` - Active sessions
- `userprofiles` - User info

### Query Examples

**MongoDB Atlas Studio / Compass:**

```javascript
// Find all completed conversions
db.conversiontasks.find({ status: "completed" })

// Find all conversions for a user
db.conversiontasks.find({ userId: "test-user" })

// Find all conversion logs
db.system_logs.find({ category: "CONVERSION" })

// Get conversion statistics
db.conversiontasks.aggregate([
  { $group: { 
      _id: "$status", 
      count: { $sum: 1 }
    }
  }
])
```

---

## 📝 Log Files

### View Recent Logs

**In MongoDB Atlas:**
```javascript
db.system_logs.find().sort({ timestamp: -1 }).limit(20)
```

**Example Log Entry**:
```json
{
  "_id": ObjectId("..."),
  "level": "info",
  "category": "CONVERSION",
  "message": "Audio-to-image conversion completed",
  "userId": "test-user",
  "conversionId": "085346d7-0567-496b-a995-98011f88db07",
  "metadata": {
    "imageCount": 1,
    "duration": 302
  },
  "timestamp": "2025-11-15T04:42:55.867Z"
}
```

---

## 🔄 Full Workflow Test

### Step 1: Check Backend
```bash
curl http://localhost:3000/health
```
Expected: `"database": "connected"`

### Step 2: Create Test Audio
```bash
# Already created at:
e:\Projects\minnor Project\Mobile_App\Backend\test-audio.wav
```

### Step 3: Run Conversion
```bash
cd "e:\Projects\minnor Project\Mobile_App\Backend"
cmd /c test-audio-to-image.bat
```
Expected: Conversion completes in ~300ms, returns PNG image

### Step 4: Check Database
```javascript
// MongoDB Atlas console
db.conversiontasks.findOne({ userId: "test-user" })
```
Expected: Task with status "completed"

### Step 5: Check Logs
```javascript
db.system_logs.find({ category: "CONVERSION" }).sort({ timestamp: -1 })
```
Expected: Multiple log entries for conversion process

### Step 6: View Generated Image
```bash
# Located at:
e:\Projects\minnor Project\Mobile_App\Backend\uploads\conversions\
```

---

## 🐛 Troubleshooting

### Backend Not Running
```bash
cd "e:\Projects\minnor Project\Mobile_App\Backend"
npm start
```

### MongoDB Not Connected
- Check connection string in `.env`
- Verify internet connection
- Check MongoDB Atlas IP whitelist (should allow all for testing)

### Conversion Failed
- Check Python dependencies: `pip list`
- Verify audio file format
- Check logs: `db.system_logs.find({ level: "error" })`

### Frontend Showing Unmatched Route
- Clear browser cache
- Restart frontend: `npm start`
- Check if `index.tsx` exists in `app/` folder

---

## 📊 Test Results Checklist

- [ ] Backend health check returns `ok`
- [ ] MongoDB shows `connected`
- [ ] Can upload audio file
- [ ] Conversion completes successfully
- [ ] Conversion task appears in database
- [ ] Logs appear in system_logs collection
- [ ] PNG image is generated
- [ ] Frontend app loads without errors
- [ ] Can select audio from file picker
- [ ] Conversion appears in browser console

---

## 🎯 Success Criteria

✅ **All Criteria Met!**

- ✅ Backend running
- ✅ MongoDB connected
- ✅ Conversion working
- ✅ Data persisted
- ✅ Logs recorded
- ✅ Frontend accessible
- ✅ Python script executing

---

## 📱 Next: Frontend Integration

Once ready, the frontend can:

1. **Store user ID** in localStorage
2. **Display conversion history** from `/api/conversions`
3. **Show conversion status** in real-time
4. **Display statistics** from `/api/stats`
5. **Handle errors gracefully**

---

## 🚀 Commands Quick Reference

```bash
# Start backend
cd "e:\Projects\minnor Project\Mobile_App\Backend"
npm start

# Build backend
npm run build

# Test conversion
cmd /c test-audio-to-image.bat

# Start frontend
cd "e:\Projects\minnor Project\Mobile_App\Frontend"
npm start

# Check backend health
curl http://localhost:3000/health

# Check API status
curl http://localhost:3000/api/status
```

---

**Everything is ready for testing! 🎉**

Choose your testing method above and verify the system is working correctly.

For issues, check logs in MongoDB Atlas or backend console output.
