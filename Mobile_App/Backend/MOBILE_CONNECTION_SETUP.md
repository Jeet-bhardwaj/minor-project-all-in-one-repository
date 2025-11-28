# 🔧 Mobile Backend Connection Guide

## Problem
Backend works on laptop (localhost:3000) but not on phone connected via WiFi.

## Root Cause
The backend was listening only on `localhost` (127.0.0.1), which is not accessible from other devices on the network.

## Solution

### ✅ What I Fixed

1. **Backend Listening Address**
   - Changed from: `app.listen(PORT, callback)`
   - Changed to: `app.listen(PORT, '0.0.0.0', callback)`
   - This makes backend accessible from all network interfaces

2. **Enhanced CORS Configuration**
   - Now allows connections from any 192.168.x.x and 10.x.x.x IP ranges
   - Accepts requests with no origin (mobile apps)
   - Supports all necessary HTTP methods

3. **Frontend Already Configured**
   - Your `.env` already has: `EXPO_PUBLIC_API_URL=http://192.168.29.67:3000/api`
   - This is correct and matches your machine IP

### 🚀 How to Test

#### Step 1: Restart Backend
```bash
cd "e:\Projects\minnor Project\Mobile_App\Backend"
npm run dev  # or npm start
```

You should see:
```
🚀 EchoCipher Backend running on port 3000
📱 Mobile access: http://<your-machine-ip>:3000/health
```

#### Step 2: Test from Phone Browser
Open this URL on your phone (on the same WiFi):
```
http://192.168.29.67:3000/health
```

You should see:
```json
{
  "status": "ok",
  "timestamp": "...",
  "uptime": ...,
  "environment": "development",
  "database": "connected"
}
```

#### Step 3: Restart Frontend
```bash
cd "e:\Projects\minnor Project\Mobile_App\Frontend"
npm start
```

Open the app on your phone and try the conversion.

### 📋 Checklist

- [ ] Backend is running on `0.0.0.0:3000`
- [ ] Phone is on the same WiFi as laptop
- [ ] Phone can access `http://192.168.29.67:3000/health` in browser
- [ ] Frontend `.env` has `EXPO_PUBLIC_API_URL=http://192.168.29.67:3000/api`
- [ ] App makes successful API calls

### 🔍 Troubleshooting

#### Phone still can't connect?

**Issue: "Connection refused" or "Cannot reach server"**
- Check Windows Firewall allows Node.js
- Run in PowerShell as Admin:
  ```powershell
  netsh advfirewall firewall add rule name="Node.js Backend" dir=in action=allow program="C:\Program Files\nodejs\node.exe"
  ```

**Issue: "Network error" in app**
- Verify both devices on same WiFi network
- Check phone's IP range matches (should be 192.168.x.x)
- Check backend console for CORS errors

**Issue: Phone can reach /health but not /api endpoints**
- Check that conversion routes are properly registered
- Verify `X-API-Key` header is being sent (if required)
- Check backend logs for detailed error messages

#### Quick Network Diagnostic

From your phone, open browser and try these URLs:
```
http://192.168.29.67:3000/health          # Basic health check
http://192.168.29.67:3000/api/status      # API status info
```

If both work, your network connection is fine. If not, it's a network/firewall issue.

### 📝 Environment Variables

**Frontend (.env)**
```
EXPO_PUBLIC_API_URL=http://192.168.29.67:3000/api
EXPO_PUBLIC_LOCAL_URL=http://localhost:3000/api
```

The app automatically chooses:
- `EXPO_PUBLIC_LOCAL_URL` for web (localhost)
- `EXPO_PUBLIC_API_URL` for mobile (your machine IP)

### 🎯 Expected Behavior After Fix

1. **On Laptop** → Works as before (uses localhost)
2. **On Phone** → Now connects to your machine via WiFi
3. **File Transfer** → Images download to phone after conversion
4. **Real-time Status** → Progress updates visible on phone

---

**Need more help?** Check the backend logs for error messages while testing from phone.
