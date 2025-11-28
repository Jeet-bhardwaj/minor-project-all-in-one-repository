# 🚀 Quick Test Guide

## ✅ Features to Test

### 1. **Microphone Recording** 🎤

**Steps:**
1. Open app → Go to **Audio→Image** tab
2. Look for two buttons side-by-side:
   - 📂 Choose File (purple)
   - 🎤 Record (pink)
3. Tap **🎤 Record**
4. Grant microphone permission if prompted
5. Speak into microphone
6. Watch timer count up (e.g., "Recording: 0:15")
7. Tap **⏹️ Stop** (button turns red while recording)
8. See file automatically selected with name like `recording_1732823456789.m4a`
9. Tap **✨ Start Encryption**

**Expected Result:**
- ✅ Recording indicator shows with pulsing red dot
- ✅ Timer updates every second
- ✅ Recording stops cleanly
- ✅ File is automatically selected
- ✅ Encryption works with recorded file

---

### 2. **ZIP Download** 📦

**Steps:**
1. After Step 1 (or select any audio file)
2. Tap **✨ Start Encryption**
3. Wait for "Encryption Complete!" message
4. **Automatically** - Share dialog should open
5. Choose "Save to Files" or "Save to Photos"
6. Save the ZIP file

**Expected Result:**
- ✅ Share dialog opens automatically (no manual download needed)
- ✅ ZIP file named `encrypted_[uuid].zip`
- ✅ File saved to Downloads folder
- ✅ Success message shows: "ZIP file with X encrypted images is ready!"
- ✅ Download count shows "1" in the stats

---

### 3. **Downloads Tab** 📥

**Steps:**
1. Tap the **Downloads** tab (3rd tab, download icon)
2. Read the instructions
3. Tap **📂 Select & Extract ZIP**
4. Choose the ZIP file you just saved
5. Wait for extraction progress
6. See "Extraction Complete" alert
7. Tap OK to share first file

**Expected Result:**
- ✅ ZIP file is read successfully
- ✅ Extraction completes in 2-5 seconds
- ✅ Alert shows number of files extracted
- ✅ Share dialog opens for first extracted image
- ✅ Files saved to `documents/extracted/[zipname]/`

---

### 4. **Clear Downloads** 🗑️

**Steps:**
1. In Downloads tab
2. Tap **🗑️ Clear All Downloads**
3. Confirm deletion
4. Check folders are cleared

**Expected Result:**
- ✅ Confirmation dialog appears
- ✅ All downloads and extracted files removed
- ✅ Success message shown

---

## 🎯 Full Workflow Test

**Complete Audio Encryption & Backup:**

```
1. Open app → Audio→Image tab

2. Tap 🎤 Record → Record 5-10 seconds → Tap ⏹️ Stop

3. Tap ✨ Start Encryption

4. Wait for progress bar to complete

5. Share dialog opens automatically
   → Save ZIP to Files/Downloads

6. Go to Downloads tab

7. Tap 📂 Select & Extract ZIP

8. Choose the saved ZIP file

9. Wait for extraction

10. Share dialog opens with first image
    → Save or share the image

11. SUCCESS! You now have:
    - Original ZIP file (backup)
    - Extracted PNG images (ready to use)
```

---

## 📊 What to Check

### UI Elements:
- [ ] Downloads tab appears (3rd position)
- [ ] Two buttons in Audio→Image tab
- [ ] Recording timer shows correctly
- [ ] Recording dot pulses while recording
- [ ] Share dialog opens automatically after encryption
- [ ] Downloads tab has gradient background
- [ ] All buttons have proper gradients

### Functionality:
- [ ] Recording starts and stops cleanly
- [ ] Recorded audio has proper file name and size
- [ ] Encryption works with recorded audio
- [ ] ZIP download completes successfully
- [ ] ZIP file can be saved to phone
- [ ] Extraction works without errors
- [ ] Extracted files are accessible
- [ ] Clear downloads removes all files

### Error Handling:
- [ ] Microphone permission denial shows alert
- [ ] Recording error shows proper message
- [ ] ZIP download failure shows helpful error
- [ ] Extraction error shows clear message
- [ ] Backend offline shows connection error

---

## 🔍 Console Logs to Monitor

Look for these in the terminal/console:

### Recording:
```
🎤 Starting recording...
✅ Recording started
⏹️ Stopping recording...
✅ Recording saved: recording_[timestamp].m4a
```

### ZIP Download:
```
📥 Downloading ZIP file from: http://192.168.29.67:3000/api/conversions/[id]/download-zip
🌐 Fetching ZIP file...
📊 Response status: 200 OK
📦 ZIP received: [size] bytes
✅ ZIP saved to: [path]
📤 Opening share dialog for ZIP...
```

### Extraction:
```
[Extraction logs in Downloads tab]
```

---

## ⚠️ Common Issues & Fixes

### Issue: Recording button doesn't work
**Fix:** 
- Check microphone permissions in phone settings
- Restart the app
- Ensure no other app is using microphone

### Issue: Share dialog doesn't open
**Fix:**
- Check that Sharing module is available
- Try manual download from Downloads tab
- Check console for errors

### Issue: ZIP extraction fails
**Fix:**
- Ensure ZIP file is not corrupted
- Download ZIP again
- Check storage space on device
- Try with a smaller audio file first

### Issue: Backend connection error
**Fix:**
- Ensure backend is running: `npm run dev`
- Check IP address: http://192.168.29.67:3000
- Check CORS settings
- Both devices on same WiFi network

---

## 📱 Test Scenarios

### Scenario 1: Quick Recording Test
**Duration:** 30 seconds
1. Record 5 seconds of audio
2. Encrypt it
3. Save ZIP
**Expected:** All works smoothly

### Scenario 2: Long Recording Test
**Duration:** 2 minutes
1. Record 1+ minute of audio
2. Encrypt it
3. Download ZIP
4. Extract ZIP
**Expected:** Handles large files well

### Scenario 3: Multiple Files Test
**Duration:** 3 minutes
1. Encrypt 3 different audio files
2. Download all 3 ZIPs
3. Extract all 3 ZIPs
4. Clear downloads
**Expected:** All operations work independently

---

## ✅ Success Criteria

Your implementation is successful if:

1. ✅ Can record audio using microphone
2. ✅ Timer shows recording duration
3. ✅ Recording stops and file is selected
4. ✅ Encryption works with recorded file
5. ✅ Share dialog opens automatically with ZIP
6. ✅ ZIP file can be saved to phone
7. ✅ Downloads tab appears in navigation
8. ✅ Can extract ZIP files
9. ✅ Extracted images are accessible
10. ✅ Can clear all downloads

---

## 📞 Backend Status Check

Before testing, verify backend is running:

```bash
# Check health endpoint
curl http://192.168.29.67:3000/health

# Should return:
{
  "status": "healthy",
  "timestamp": "...",
  "uptime": ...
}
```

---

## 🎉 Ready to Test!

1. **Restart the mobile app** (close completely and reopen)
2. **Go to Audio→Image tab**
3. **Follow the test steps above**
4. **Check all features work**
5. **Report any issues**

Good luck! 🚀
