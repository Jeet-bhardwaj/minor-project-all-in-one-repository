# Quick Testing Guide - Downloads & Gallery Save

## ⚡ Quick Start

### 1. Restart the App (IMPORTANT!)
```powershell
# The app MUST be completely closed and reopened
# Hot reload won't pick up these changes
```

**On Android:**
- Swipe up → Force close EchoCipher
- Reopen from app drawer

**On iOS:**
- Double-click home → Swipe up on EchoCipher
- Reopen from home screen

### 2. Navigate to Downloads Tab
- Open app → Bottom navigation → Tap "📥 Downloads" tab

### 3. Test Workflow

#### A. Extract ZIP (2 minutes)
1. Tap "Select & Extract ZIP" button
2. Choose a ZIP file containing images
3. Watch progress: "Reading ZIP file..." → "Extracting file 1/10..."
4. See success: "✅ Extraction Complete"

#### B. Save to Gallery (1 minute)
1. Scroll down to "🖼️ Save to Gallery" section
2. Verify file count shown
3. Tap "💾 Save to Gallery" button
4. Grant permission when prompted
5. Watch progress: "Saving 3/10 files..."
6. See success: "✅ All 10 files saved to Pictures/EchoCipher album!"

#### C. Verify in Gallery (30 seconds)
1. Open device Photos/Gallery app
2. Go to Albums
3. Find "EchoCipher" album
4. Verify all images are there

## 🎯 Expected Behavior

### Progress Indicators
- ✅ Shows "Reading ZIP file..." during load
- ✅ Shows "Extracting file X/Y..." for each file
- ✅ Shows "Saving X/Y files..." during gallery save
- ✅ Progress card appears/disappears automatically

### Error Handling
- ❌ If permission denied → Shows clear message with instructions
- ❌ If ZIP corrupt → Shows error with suggestion to check file
- ❌ If some files fail → Shows "Saved 8/10, Failed 2/10"

### Gallery Save Button
- Before save: Blue gradient "💾 Save to Gallery"
- During save: Shows progress with count
- After save: Green gradient "✅ Saved to Gallery" (disabled)

## 🐛 Troubleshooting

### "Download Failed" Error
**Cause:** Network or backend issue  
**Fix:** Verify backend is running at 192.168.29.67:3000

### Permission Denied
**Cause:** Gallery permission not granted  
**Fix:** Settings → Apps → EchoCipher → Permissions → Enable Photos/Media

### TypeScript Errors in VSCode
**Cause:** Language server cache  
**Fix:** Ctrl+Shift+P → "TypeScript: Restart TS Server" OR restart VSCode

### Changes Not Appearing
**Cause:** App not fully restarted  
**Fix:** Force close app completely, then reopen (not just minimize)

## 📱 Test Scenarios

### Scenario 1: Happy Path ✅
1. Extract ZIP → Success
2. Save to gallery → Success
3. Open gallery → Files visible
4. Return to app → Button shows "Saved" (green)

### Scenario 2: Permission Flow ⚠️
1. Extract ZIP → Success
2. Save to gallery → Permission prompt
3. Deny → Error message with instructions
4. Try again → Grant → Success

### Scenario 3: Partial Save 🔶
1. Extract mixed ZIP (images + text files)
2. Save to gallery → Some fail
3. See "Saved 8/10, Failed 2" message
4. Gallery shows 8 images

### Scenario 4: Multiple Extractions 🔄
1. Extract ZIP #1 → Save to gallery
2. Extract ZIP #2 → Button reappears
3. Save to gallery → Both sets in album
4. Each save is independent

## ⏱️ Expected Timing

| Operation | Duration | Notes |
|-----------|----------|-------|
| Extract 10 files | 2-5 seconds | Depends on file sizes |
| Save to gallery | 3-8 seconds | ~1 sec per file |
| Permission request | User action | First time only |
| Clear downloads | < 1 second | Instant |

## 🎬 Demo Script

**For showing to user:**

```
1. "Let me show you the new Downloads feature"
   → Navigate to Downloads tab

2. "First, we extract a ZIP file"
   → Tap "Select & Extract ZIP"
   → Choose file
   → Point out progress indicators

3. "Now we can save to your device gallery"
   → Scroll to Save to Gallery section
   → Tap button
   → Grant permission
   → Point out progress counter

4. "Let's verify in your gallery app"
   → Open Photos/Gallery
   → Go to Albums → EchoCipher
   → Show saved images

5. "And the button remembers it's saved"
   → Return to app
   → Show green "Saved to Gallery" button
```

## 📊 Validation Checklist

- [ ] Progress text appears during operations
- [ ] File counts are accurate
- [ ] Error messages are clear and helpful
- [ ] Permission request appears (first time)
- [ ] Gallery album is created
- [ ] All files appear in gallery
- [ ] Button state changes correctly
- [ ] Multiple extractions work
- [ ] Clear downloads removes app files only
- [ ] Gallery files persist after clear

## 🚨 Critical Tests

**Must pass before deployment:**

1. **Gallery Save Works:** Files actually appear in device gallery
2. **Permission Handling:** Denial doesn't crash app
3. **Progress Accuracy:** Counts match actual files
4. **Error Recovery:** App recovers from all error scenarios
5. **State Persistence:** Button remembers save status

---

**Testing Time:** ~10 minutes for full workflow  
**Min Devices:** Test on 1 Android device  
**Recommended:** Also test on iOS if available  

**Ready?** Close the app completely → Reopen → Start testing! 🚀
