# 📁 File Browsing Guide - EchoCipher

## Overview
All feature screens now have enhanced file browsing with proper device storage integration.

---

## Features Updated

### 🎵 Audio-to-Image
**File Type**: Audio files (MP3, WAV, FLAC, AAC)
**How to Use**:
1. Click the blue upload box with 🎵 icon
2. Device file browser opens automatically
3. Navigate to Audio folder in device storage
4. Select an audio file
5. File appears selected with checkmark
6. Adjust conversion settings (resolution, color mode, format)
7. Click "Convert to Audio" button

### 🖼️ Image-to-Audio
**File Type**: Image files (JPG, PNG, GIF)
**How to Use**:
1. Click the blue upload box with 🖼️ icon
2. Device file browser opens automatically
3. Navigate to Pictures/Gallery folder
4. Select an image file
5. File appears selected with checkmark
6. Adjust audio settings (quality, sample rate, format)
7. Click "Convert to Audio" button

### 🔒 File Encryption
**File Type**: Any file (*/*) - unlimited options
**How to Use**:
1. Click the blue upload box with 📂 icon
2. Device file browser opens automatically
3. Navigate anywhere in device storage
4. Select any file you want to encrypt
5. File appears selected with checkmark
6. Enter strong password (8+ characters)
7. Confirm password matches
8. See real-time password strength meter
9. Click "Encrypt File" button

### 🔓 File Decryption
**File Type**: Encrypted files (.encrypted or any encrypted format)
**How to Use**:
1. Click the blue upload box with 🔐 icon
2. Device file browser opens automatically
3. Navigate to location of encrypted file
4. Select the encrypted file
5. File details displayed (name, size)
6. Enter the password you used to encrypt
7. Click "Decrypt File" button
8. If password is correct, file decrypts
9. If wrong password, specific error message

---

## Key Features

✅ **One-Click File Picker** - Click upload box to browse
✅ **Full Device Storage Access** - Browse anywhere on device
✅ **File Type Filtering**:
   - Audio screens filter for audio files only
   - Image screens filter for image files only
   - Encryption/Decryption show all file types
   
✅ **File Validation**:
   - Maximum file size: 100MB
   - File size checked before selection
   - Error alert if file too large

✅ **Better Error Handling**:
   - Distinguishes between user cancellation and errors
   - Helpful error messages
   - Console logs for debugging

✅ **Copy to Cache** - Files automatically copied to app cache for processing

---

## Supported File Formats

### Audio-to-Image
- MP3 (MPEG Audio)
- WAV (Waveform Audio)
- FLAC (Free Lossless Audio)
- AAC (Advanced Audio)
- M4A (MPEG-4 Audio)

### Image-to-Audio
- JPG (Joint Photographic Group)
- PNG (Portable Network Graphics)
- GIF (Graphics Interchange Format)
- TIFF (Tagged Image File Format)
- BMP (Bitmap)
- WebP

### Encryption/Decryption
- **Any file format** supported
- Audio, images, documents, archives, etc.
- Maximum 100MB per file

---

## Device Storage Access

### Android
- Requires permissions:
  - `READ_EXTERNAL_STORAGE` - Browse files
  - `WRITE_EXTERNAL_STORAGE` - Save encrypted/converted files
- Permissions automatically handled by Expo
- First use may prompt for permission approval

### iOS
- Requires permissions:
  - Access to Documents Folder
  - Access to Media Library
- Permissions automatically handled by Expo
- First use may prompt for permission approval

---

## Process Flow

### For Audio-to-Image
```
1. Open Screen
2. Click Upload Box
   ↓
3. File Browser Opens
   ↓
4. Select Audio File
   ↓
5. File Selected (Show Checkmark ✓)
   ↓
6. Settings Modal Available (⚙️ button)
   ↓
7. Click "Convert to Image"
   ↓
8. Loading Spinner Shows
   ↓
9. Success ✅ with Download Option
```

### For Image-to-Audio
```
1. Open Screen
2. Click Upload Box
   ↓
3. File Browser Opens
   ↓
4. Select Image File
   ↓
5. File Selected (Show Checkmark ✓)
   ↓
6. Settings Modal Available (⚙️ button)
   ↓
7. Click "Convert to Audio"
   ↓
8. Loading Spinner Shows
   ↓
9. Success ✅ with Download Option
```

### For Encryption
```
1. Open Screen
2. Click Upload Box
   ↓
3. File Browser Opens
   ↓
4. Select Any File
   ↓
5. File Selected (Show Checkmark ✓)
   ↓
6. Enter Password
   ↓
7. Confirm Password
   ↓
8. See Strength Meter (🔴 🟡 🟢)
   ↓
9. Click "Encrypt File"
   ↓
10. Loading Spinner Shows
    ↓
11. Success ✅ with Download Option
```

### For Decryption
```
1. Open Screen
2. Click Upload Box
   ↓
3. File Browser Opens
   ↓
4. Select Encrypted File
   ↓
5. File Details Shown (Name, Size, Type)
   ↓
6. Enter Decryption Password
   ↓
7. Click "Decrypt File"
   ↓
8. Loading Spinner Shows
   ↓
9. Success ✅ or Error ❌
```

---

## Error Handling

### Common Errors & Solutions

**"File picker failed"**
- Try again
- Restart the app
- Check file permissions

**"File too large"**
- File exceeds 100MB limit
- Choose a smaller file
- Compress file if possible

**"Wrong password" (Decryption)**
- Password is incorrect
- Try the correct password
- Check for CAPS LOCK

**"Permissions denied"**
- Grant storage permissions when prompted
- Check device settings for app permissions

**"Cancelled operation"**
- User cancelled file picker (normal)
- Try selecting file again

---

## Permissions Breakdown

### app.json Configuration
```json
{
  "ios": {
    "infoPlist": {
      "NSDocumentsFolderUsageDescription": "This app needs access to your documents to convert and encrypt files",
      "NSMediaLibraryUsageDescription": "This app needs access to your media library"
    }
  },
  "android": {
    "permissions": [
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE"
    ]
  }
}
```

---

## Best Practices

✅ **Do**
- Keep files under 100MB
- Use strong passwords for encryption
- Remember your encryption passwords
- Close apps to free memory before large conversions

❌ **Don't**
- Use weak passwords (< 8 characters)
- Try to encrypt already encrypted files
- Lose your encryption passwords
- Use special Unicode characters in passwords

---

## Technical Details

### File Picker Implementation
```typescript
const result = await DocumentPicker.getDocumentAsync({
  type: 'audio/*',  // or 'image/*' or '*/*'
  copyToCacheDirectory: true,  // Auto-cache files
});
```

### Supported Platforms
- ✅ Android
- ✅ iOS
- ✅ Web (file input)

### File Size Limits
- Maximum: 100MB per file
- Recommended: Under 50MB for faster processing
- Minimum: No minimum

---

## Troubleshooting

### File Picker Doesn't Open
1. Restart the app
2. Clear app cache
3. Check storage permissions in settings
4. Reinstall app if needed

### File Selection Not Working
1. Ensure file has correct extension
2. Try a different file
3. Check file isn't corrupted
4. Verify device has free storage space

### Conversion/Encryption Fails
1. Check file size (max 100MB)
2. Ensure sufficient device storage
3. Try smaller file
4. Restart app and try again

---

## Performance Tips

⚡ **Faster Processing**
- Use files under 50MB
- Ensure device has at least 500MB free storage
- Close other apps before large conversions
- Use high-end device for better performance

📊 **File Size Impact**
- Small files (< 10MB): ~1-2 seconds
- Medium files (10-50MB): ~2-5 seconds
- Large files (50-100MB): ~5-15 seconds

---

## File Locations by Device

### Android Common Paths
- Downloads: `/storage/emulated/0/Download/`
- Music: `/storage/emulated/0/Music/`
- Pictures: `/storage/emulated/0/Pictures/`
- Documents: `/storage/emulated/0/Documents/`

### iOS Common Paths
- Documents: `Documents/` (via Files app)
- Downloads: `Downloads/` (via Files app)
- iCloud Drive: `iCloud Drive/` (if enabled)

---

## FAQ

**Q: Can I pick files from cloud storage?**
A: Yes! If cloud storage (Google Drive, OneDrive) is synced locally, you can access those files.

**Q: Can I pick files from downloads folder?**
A: Yes! Navigate to Downloads folder in the file browser.

**Q: Will my files be deleted?**
A: No. Encrypted/converted files are saved separately. Original files remain unchanged.

**Q: Can I convert again?**
A: Yes! Click "Convert Another" or "Encrypt Another" button to restart.

**Q: What if I lose my encryption password?**
A: Encrypted files cannot be recovered without the password. Store passwords securely!

---

**Status**: ✅ File Browsing Ready
**Version**: 1.0
**Last Updated**: January 2025
