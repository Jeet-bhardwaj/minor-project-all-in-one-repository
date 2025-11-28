# Script to find your machine's local IP address for phone connections

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Mobile Backend Connection Setup" -ForegroundColor Cyan
Write-Host "======================================`n" -ForegroundColor Cyan

# Get all network adapters with IPv4 addresses
$ipAddresses = @()
Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object {
    $_.IPAddress -notlike '127.0.0.1' -and $_.IPAddress -notlike '169.*'
} | ForEach-Object {
    $ipAddresses += $_.IPAddress
}

Write-Host "Available Local IP Addresses:" -ForegroundColor Yellow
if ($ipAddresses.Count -gt 0) {
    $ipAddresses | ForEach-Object { Write-Host "  ✓ $_" -ForegroundColor Green }
} else {
    Write-Host "  No network interfaces found" -ForegroundColor Red
}

Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "Setup Instructions:" -ForegroundColor Cyan
Write-Host "======================================`n" -ForegroundColor Cyan

Write-Host "1. Copy one of the IP addresses above (usually 192.168.x.x)" -ForegroundColor White
Write-Host "2. Update .env in Mobile_App/Frontend:" -ForegroundColor White
Write-Host "   EXPO_PUBLIC_API_URL=http://<YOUR_IP>:3000/api" -ForegroundColor Yellow
Write-Host "`n3. Make sure both devices are on the SAME WIFI network" -ForegroundColor White
Write-Host "4. Restart the backend: npm start (or npm run dev)" -ForegroundColor White
Write-Host "5. Restart the frontend: npm start" -ForegroundColor White
Write-Host "`n6. Test connection from phone by opening:" -ForegroundColor White
Write-Host "   http://<YOUR_IP>:3000/health" -ForegroundColor Yellow

Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "Common Issues:" -ForegroundColor Cyan
Write-Host "======================================`n" -ForegroundColor Cyan

Write-Host "❌ Phone still can't connect?" -ForegroundColor Red
Write-Host "  • Check firewall - allow Node.js through Windows Firewall" -ForegroundColor Gray
Write-Host "  • Verify both devices on same WiFi network" -ForegroundColor Gray
Write-Host "  • Try disabling WiFi and using mobile hotspot" -ForegroundColor Gray
Write-Host "  • Check backend logs for CORS errors" -ForegroundColor Gray

Write-Host "`nℹ️  Firewall fix:" -ForegroundColor Cyan
Write-Host "   netsh advfirewall firewall add rule name='Node.js' dir=in action=allow program='C:\Program Files\nodejs\node.exe'" -ForegroundColor Yellow

Write-Host "`nPress any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
