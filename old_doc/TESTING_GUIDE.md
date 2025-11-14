# Testing Google Sign-In Feature

## 🚀 Quick Start - Test Authentication Now

The app is **fully functional and ready to test** with mock authentication data.

### Option 1: Test on Web Browser
```bash
# Terminal is already running at:
# http://localhost:8081
```

1. Open browser → `http://localhost:8081`
2. See splash screen (5 seconds)
3. Login screen appears
4. Click "Sign in with Google" button
5. Mock user data is stored
6. App navigates to Home screen
7. Go to Settings tab to see your profile
8. Click Sign Out to test logout

### Option 2: Test on Mobile (Expo Go)

**Requirements:**
- Expo Go app on Android/iOS
- Same WiFi network as computer

**Steps:**
1. Find QR code in terminal output (shows in Metro Bundler)
2. Android: Open Expo Go → Scan QR code
3. iOS: Open Camera app → Tap notification when it appears
4. Same flow as web (splash → login → home)

### What to Test

#### ✅ Login Flow
- [ ] Splash screen shows for 5 seconds
- [ ] Auto-navigates to login screen
- [ ] Login screen displays all content
- [ ] App name and logo visible
- [ ] Feature preview cards show correctly
- [ ] Sign in button is visible and clickable

#### ✅ Authentication
- [ ] Click "Sign in with Google" 
- [ ] Loading indicator appears briefly
- [ ] User data gets saved
- [ ] Navigation to home screen works
- [ ] Home screen displays normally

#### ✅ Profile Display
- [ ] Go to Settings tab
- [ ] Profile card shows user name
- [ ] Profile card shows email
- [ ] User initial in avatar circle
- [ ] Settings menu items visible

#### ✅ Logout
- [ ] Click "Sign Out" button
- [ ] Confirmation dialog appears
- [ ] Click "Sign Out" in dialog
- [ ] Returns to login screen
- [ ] Profile data cleared

#### ✅ Theme Support
- [ ] Test light mode (colors correct)
- [ ] Test dark mode (colors correct)
- [ ] Toggle in device settings
- [ ] Theme updates automatically
- [ ] All text readable in both modes

#### ✅ Responsive Design
- [ ] Test on phone (portrait)
- [ ] Test on tablet (landscape)
- [ ] Test on web browser
- [ ] Content properly sized
- [ ] No overlapping text
- [ ] Buttons easily tappable

## 🧪 Testing Checklist

### Visual Elements
```
Login Screen:
□ Logo (🎵) displays
□ App name "EchoCipher" visible
□ Tagline "Convert, Encrypt, Transform" shows
□ Welcome message displays
□ 3 feature cards visible:
  □ Audio to Image (with description)
  □ Image to Audio (with description)
  □ Encrypt & Decrypt (with description)
□ Google Sign In button visible
□ Terms text at bottom

Settings Screen:
□ Profile card shows
□ Avatar/initial displays
□ User name visible
□ User email visible
□ Settings menu shows 3 items
□ Sign Out button red and visible
```

### Interactive Elements
```
□ All buttons tappable
□ No unresponsive areas
□ Loading spinner works
□ Confirmation dialogs appear
□ Navigation smooth
□ No lag or delays
```

### Data Persistence
```
□ After sign in, user data saved
□ Close and reopen app
□ User still logged in
□ Profile shows correct data
□ After sign out, user removed
□ Have to log in again
```

### Theme Changes
```
Light Mode:
□ Background white
□ Text dark/readable
□ Buttons correct color
□ Borders visible

Dark Mode:
□ Background dark
□ Text light/readable
□ Buttons correct color
□ Borders visible
```

## 📱 Device-Specific Testing

### Web Browser Testing
```bash
# Opens at: http://localhost:8081
Press 'w' in terminal to open web view
```
- Works in Chrome, Firefox, Safari, Edge
- Responsive design tested
- Can test theme switching

### Android (Expo Go)
```bash
Press 'a' in terminal to open Android
# or scan QR code manually
```
- Tests mobile dimensions
- Tests mobile performance
- Larger touch targets
- Portrait/landscape

### iOS (Expo Go)
```bash
Press 'i' in terminal to open iOS simulator
# or scan QR code with Camera app
```
- Tests iOS-specific features
- Checks safe area handling
- Tests gesture support
- Notch/island compatibility

## 🐛 Troubleshooting

### Black Screen
**Solution:** Press 'r' in terminal to reload

### Not Loading
**Solution:** 
1. Check terminal shows "Metro waiting on"
2. Ensure same WiFi network
3. Check firewall not blocking 8081

### Button Not Working
**Solution:**
1. Check network connection
2. Reload app (press 'r')
3. Clear browser cache

### Profile Picture Missing
**Solution:**
- Currently shows user initial
- Real Google pictures work after OAuth setup
- This is expected with mock data

### Wrong Colors
**Solution:**
- Check if dark/light mode is correct
- Device theme settings affect app
- Try toggling theme in device settings

## 📊 Expected User Data

When you click "Sign in with Google", mock data stored:
```json
{
  "id": "123456789",
  "email": "user@example.com",
  "name": "Test User",
  "profilePicture": "https://via.placeholder.com/200"
}
```

This appears in Settings screen.

## 🔄 Testing Complete Authentication Cycle

1. **Cold Start**
   ```
   1. Kill app completely
   2. Reopen app
   3. Should show login screen (no saved user)
   ```

2. **After Login**
   ```
   1. Sign in with Google
   2. Navigate to home
   3. Kill and reopen app
   4. Should be on home (user still logged in)
   ```

3. **After Logout**
   ```
   1. Go to Settings
   2. Click Sign Out
   3. Confirm
   4. Should show login screen
   5. Kill and reopen app
   6. Should still be on login (data cleared)
   ```

## 📝 Testing Notes

Record your findings:
```
Date Tested: _______________
Device: _______________
OS Version: _______________
App Version: 1.0.0

Issues Found:
□ None - all working!
□ Issue: ________________
  Step to reproduce: ________________
  Expected: ________________
  Actual: ________________

Theme tested:
□ Light mode
□ Dark mode

Device size tested:
□ Mobile (small)
□ Tablet (medium)
□ Web (large)
```

## ✅ Acceptance Criteria

Your authentication system is working correctly if:
- ✅ Users can sign in
- ✅ Profile shows saved data
- ✅ Users can sign out
- ✅ Data persists across sessions
- ✅ Beautiful, responsive UI
- ✅ Dark/light theme works
- ✅ No errors in console
- ✅ Smooth animations
- ✅ Proper loading states
- ✅ Clear navigation flow

## 🎉 Ready for Next Phase?

Once testing is complete:
1. Proceed with Google OAuth setup (see AUTH_SETUP_GUIDE.md)
2. Or continue with feature development
3. Or add backend integration

---

**Current Status:** ✅ Ready to test
**All files:** No errors found
**Server:** Running and serving app
**Mock auth:** Fully functional

**Need Help?** Check AUTH_SETUP_GUIDE.md or GOOGLE_SIGNIN_SUMMARY.md
