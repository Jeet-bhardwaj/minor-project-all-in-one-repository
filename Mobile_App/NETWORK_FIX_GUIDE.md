# 🔧 Network Connectivity Fix for Expo Go App

## Problem
- ✅ Web version (localhost:8081) works fine
- ❌ Expo Go app on phone gets "AxiosError: Network Error"

## Root Cause
The Expo Go app on your phone is trying to connect to `localhost:3000`, but:
- **localhost** only refers to the phone itself
- The backend is running on your **computer (192.168.29.67:3000)**

## Solution Applied

### 1. Updated Frontend `.env`
```env
EXPO_PUBLIC_API_URL=http://192.168.29.67:3000/api
EXPO_PUBLIC_LOCAL_URL=http://localhost:3000/api
```

### 2. Updated API Client (`services/api.ts`)
- **Web**: Uses `localhost:3000/api` (runs on same machine)
- **Mobile (Expo Go)**: Uses `192.168.29.67:3000/api` (machine's IP address)

### 3. Updated Backend CORS (`.env`)
```env
ALLOWED_ORIGINS=http://localhost:8081,http://192.168.1.100:8081,http://192.168.29.67:8081,*
CORS_CREDENTIALS=false
```

### 4. Restarted Backend
✅ Backend now running with new CORS settings

## What You Need to Do

### On Your Phone (Expo Go App)

1. **Clear the app cache** (if stuck):
   - Close Expo Go completely
   - Reopen it

2. **Reload the app**:
   - If using tunnel: Click the reload button
   - If using LAN: Make sure you're on the same WiFi network
   - Shake your phone (iOS) or use menu (Android) to access dev menu
   - Select "Reload" or "Restart"

3. **If still not working**:
   - Check your phone is on the **same WiFi network** as your computer
   - Verify your computer firewall allows connections on port 3000
   - Try manually entering the IP address in Expo Go scanner

## Network Requirements

✅ Your Computer IP: `192.168.29.67`  
✅ Backend Port: `3000`  
✅ Full URL: `http://192.168.29.67:3000/api`  

**Both your phone and computer must be on the same WiFi network!**

## Testing

To verify connectivity from your phone:
1. Open a browser on your phone
2. Go to: `http://192.168.29.67:3000/health`
3. You should see: `{"status":"ok","timestamp":"...","database":"connected"}`

If you see this, the network is working correctly.

## Firewall Troubleshooting

If the health endpoint times out, your firewall is blocking port 3000:

### Windows Firewall Fix:
```powershell
# Run as Administrator in PowerShell

# Add inbound rule
New-NetFirewallRule -DisplayName "Allow Backend Port 3000" `
  -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow

# Verify it's added
Get-NetFirewallRule -DisplayName "Allow Backend Port 3000" | Format-List
```

## What Changes Were Made

| Component | Change | Status |
|-----------|--------|--------|
| Frontend `.env` | Added network IP URL | ✅ Done |
| `services/api.ts` | Platform detection (web vs mobile) | ✅ Done |
| Backend `.env` | Updated CORS origins | ✅ Done |
| Backend Server | Restarted with new config | ✅ Done |

## Success Indicators

When it's working, you should see:
- ✅ No "AxiosError: Network Error"
- ✅ File upload works
- ✅ Conversion completes
- ✅ Results display on phone

## Quick Reset

If you want to reset to local development:
1. Change `.env` to: `EXPO_PUBLIC_API_URL=http://localhost:3000/api`
2. Reload the app
3. Use web browser or local emulator

---

**Last Updated**: 2025-11-15  
**IP Address**: 192.168.29.67  
**Backend Status**: ✅ Running and accessible
