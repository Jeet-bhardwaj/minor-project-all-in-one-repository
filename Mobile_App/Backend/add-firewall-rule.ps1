# Add Windows Firewall Rule for Node.js Backend
# Run this script as Administrator

Write-Host "Adding firewall rule for Node.js on port 3000..." -ForegroundColor Cyan

# Remove existing rule if it exists
netsh advfirewall firewall delete rule name="Node.js Server Port 3000" 2>$null

# Add new rule
netsh advfirewall firewall add rule name="Node.js Server Port 3000" dir=in action=allow protocol=TCP localport=3000

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Firewall rule added successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your backend is now accessible at:" -ForegroundColor Yellow
    Write-Host "  http://172.20.10.4:3000" -ForegroundColor White
    Write-Host ""
    Write-Host "Test it by opening this URL on your phone:" -ForegroundColor Yellow
    Write-Host "  http://172.20.10.4:3000/health" -ForegroundColor White
} else {
    Write-Host "❌ Failed to add firewall rule" -ForegroundColor Red
    Write-Host "Please run this script as Administrator (Right-click -> Run as Administrator)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
