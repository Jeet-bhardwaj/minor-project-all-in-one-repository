#!/usr/bin/env powershell

# Test Backend Mobile Connectivity

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║    Backend Mobile Connectivity Test                      ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$machineIP = "192.168.29.67"
$port = 3000
$healthUrl = "http://$machineIP`:$port/health"
$statusUrl = "http://$machineIP`:$port/api/status"

Write-Host "🔍 Testing Backend Connectivity..." -ForegroundColor Yellow
Write-Host "   Machine IP: $machineIP" -ForegroundColor Gray
Write-Host "   Port: $port`n" -ForegroundColor Gray

# Test 1: Localhost (Laptop)
Write-Host "Test 1: Localhost (Laptop Access)" -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
try {
    $response = Invoke-WebRequest -Uri "http://localhost:$port/health" -TimeoutSec 3 -UseBasicParsing
    Write-Host "✅ PASS: Backend accessible on localhost:$port" -ForegroundColor Green
    Write-Host "   Status: $($response.StatusCode)`n" -ForegroundColor Green
} catch {
    Write-Host "❌ FAIL: Backend not accessible on localhost:$port" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)`n" -ForegroundColor Red
}

# Test 2: Machine IP (Phone Access)
Write-Host "Test 2: Machine IP (Phone Access)" -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
try {
    $response = Invoke-WebRequest -Uri $healthUrl -TimeoutSec 3 -UseBasicParsing
    $json = $response.Content | ConvertFrom-Json
    
    Write-Host "✅ PASS: Backend accessible on $machineIP`:$port" -ForegroundColor Green
    Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "   Database: $($json.database)" -ForegroundColor Green
    Write-Host "   Uptime: $($json.uptime) seconds`n" -ForegroundColor Green
} catch {
    Write-Host "❌ FAIL: Backend not accessible on $machineIP`:$port" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)`n" -ForegroundColor Red
}

# Test 3: API Status
Write-Host "Test 3: API Status Endpoint" -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
try {
    $response = Invoke-WebRequest -Uri $statusUrl -TimeoutSec 3 -UseBasicParsing
    $json = $response.Content | ConvertFrom-Json
    
    Write-Host "✅ PASS: API Status OK" -ForegroundColor Green
    Write-Host "   Endpoints available:" -ForegroundColor Green
    $json.endpoints | Get-Member -MemberType NoteProperty | ForEach-Object {
        Write-Host "   • POST /api/$($_.Name)" -ForegroundColor Gray
    }
    Write-Host ""
} catch {
    Write-Host "❌ FAIL: Cannot reach API status" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)`n" -ForegroundColor Red
}

# Firewall Check
Write-Host "Test 4: Windows Firewall Check" -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
$nodejsFirewallRule = Get-NetFirewallApplicationFilter -Program "*node*" -ErrorAction SilentlyContinue
if ($nodejsFirewallRule) {
    Write-Host "✅ PASS: Node.js firewall rule exists" -ForegroundColor Green
    Write-Host "   Port 3000 should be accessible`n" -ForegroundColor Green
} else {
    Write-Host "⚠️  WARNING: No Node.js firewall rule found" -ForegroundColor Yellow
    Write-Host "   If phone can't connect, add this rule:" -ForegroundColor Yellow
    Write-Host "   netsh advfirewall firewall add rule name='Node.js' dir=in action=allow program='C:\Program Files\nodejs\node.exe'" -ForegroundColor Yellow
    Write-Host ""
}

# Summary
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                     Summary                               ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "📱 To test from your phone:" -ForegroundColor Cyan
Write-Host "   1. Make sure phone is on the same WiFi as this laptop" -ForegroundColor Gray
Write-Host "   2. Open browser on phone and go to:" -ForegroundColor Gray
Write-Host "      http://192.168.29.67:3000/health" -ForegroundColor Yellow
Write-Host ""
Write-Host "✨ If all tests pass, your app should work on the phone!" -ForegroundColor Green
Write-Host ""
