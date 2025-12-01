# Test AudioImageCarrier API on Vercel

$API_URL = "https://minor-project-all-in-one-repository.vercel.app"
$API_KEY = "x7kX9jb8LyzVmJ5Dvy06n9yl0lSxB4Ut9ZidUWAZ0dk"
$USER_ID = "testuser"
$MASTER_KEY = "a7f3e9d2c1b4568790fedcba0123456789abcdef0123456789abcdef01234567"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  AudioImageCarrier API Test Suite" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Test 1: Health Check
Write-Host "[1] Testing Health Endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$API_URL/health" -Method Get
    Write-Host "✅ Health Check PASSED" -ForegroundColor Green
    Write-Host "   Status: $($response.status)" -ForegroundColor Gray
    Write-Host "   Version: $($response.version)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "❌ Health Check FAILED: $_" -ForegroundColor Red
    exit 1
}

# Test 2: Root Endpoint
Write-Host "[2] Testing Root Endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$API_URL/" -Method Get
    Write-Host "✅ Root Endpoint PASSED" -ForegroundColor Green
    Write-Host "   App: $($response.app)" -ForegroundColor Gray
    Write-Host "   Encode: $($response.endpoints.encode)" -ForegroundColor Gray
    Write-Host "   Decode: $($response.endpoints.decode)" -ForegroundColor Gray
    Write-Host "   Docs: $API_URL/docs" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "❌ Root Endpoint FAILED: $_" -ForegroundColor Red
    exit 1
}

# Test 3: Check if audio file exists for encode test
Write-Host "[3] Testing Encode Endpoint..." -ForegroundColor Yellow
$audioFiles = Get-ChildItem -Path . -Filter "*.mp3", "*.wav", "*.m4a" -ErrorAction SilentlyContinue | Select-Object -First 1

if ($audioFiles) {
    $audioFile = $audioFiles[0]
    Write-Host "   Using file: $($audioFile.Name) ($([math]::Round($audioFile.Length/1KB, 2)) KB)" -ForegroundColor Gray
    
    try {
        # Prepare multipart form data
        $boundary = [System.Guid]::NewGuid().ToString()
        $headers = @{
            "X-API-Key" = $API_KEY
        }
        
        # Create form data
        $bodyLines = @(
            "--$boundary",
            "Content-Disposition: form-data; name=`"audio_file`"; filename=`"$($audioFile.Name)`"",
            "Content-Type: application/octet-stream",
            "",
            [System.IO.File]::ReadAllText($audioFile.FullName),
            "--$boundary",
            "Content-Disposition: form-data; name=`"user_id`"",
            "",
            $USER_ID,
            "--$boundary",
            "Content-Disposition: form-data; name=`"master_key`"",
            "",
            $MASTER_KEY,
            "--$boundary",
            "Content-Disposition: form-data; name=`"compress`"",
            "",
            "true",
            "--$boundary--"
        )
        
        Write-Host "   ⏳ Encoding (this may take a few seconds)..." -ForegroundColor Gray
        
        # For actual testing, use curl which is easier for multipart/form-data
        $curlCmd = "curl -X POST `"$API_URL/api/v1/encode`" -H `"X-API-Key: $API_KEY`" -F `"audio_file=@$($audioFile.FullName)`" -F `"user_id=$USER_ID`" -F `"master_key=$MASTER_KEY`" -F `"compress=true`" -o encrypted_test.zip -w `"%{http_code}`""
        
        $httpCode = Invoke-Expression $curlCmd
        
        if ($httpCode -eq "200" -and (Test-Path encrypted_test.zip)) {
            $zipSize = (Get-Item encrypted_test.zip).Length
            Write-Host "✅ Encode Test PASSED" -ForegroundColor Green
            Write-Host "   Output: encrypted_test.zip ($([math]::Round($zipSize/1KB, 2)) KB)" -ForegroundColor Gray
            Write-Host ""
            
            # Test 4: Decode
            Write-Host "[4] Testing Decode Endpoint..." -ForegroundColor Yellow
            Write-Host "   ⏳ Decoding..." -ForegroundColor Gray
            
            $curlCmd = "curl -X POST `"$API_URL/api/v1/decode`" -H `"X-API-Key: $API_KEY`" -F `"encrypted_zip=@encrypted_test.zip`" -F `"user_id=$USER_ID`" -F `"master_key=$MASTER_KEY`" -o recovered_test.mp3 -w `"%{http_code}`""
            
            $httpCode = Invoke-Expression $curlCmd
            
            if ($httpCode -eq "200" -and (Test-Path recovered_test.mp3)) {
                $recoveredSize = (Get-Item recovered_test.mp3).Length
                Write-Host "✅ Decode Test PASSED" -ForegroundColor Green
                Write-Host "   Output: recovered_test.mp3 ($([math]::Round($recoveredSize/1KB, 2)) KB)" -ForegroundColor Gray
                Write-Host ""
                
                # Compare file sizes
                if ($audioFile.Length -eq $recoveredSize) {
                    Write-Host "✅ File sizes match perfectly!" -ForegroundColor Green
                } else {
                    Write-Host "⚠️  File sizes differ (Original: $($audioFile.Length) bytes, Recovered: $recoveredSize bytes)" -ForegroundColor Yellow
                }
            } else {
                Write-Host "❌ Decode Test FAILED (HTTP: $httpCode)" -ForegroundColor Red
            }
        } else {
            Write-Host "❌ Encode Test FAILED (HTTP: $httpCode)" -ForegroundColor Red
        }
        
    } catch {
        Write-Host "❌ Encode Test FAILED: $_" -ForegroundColor Red
    }
} else {
    Write-Host "⚠️  No audio files found in current directory" -ForegroundColor Yellow
    Write-Host "   Skipping encode/decode tests" -ForegroundColor Gray
    Write-Host "   To test: Place an MP3/WAV/M4A file in this directory" -ForegroundColor Gray
    Write-Host ""
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Test Summary" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
Write-Host "API URL: $API_URL" -ForegroundColor Gray
Write-Host "API Docs: $API_URL/docs" -ForegroundColor Gray
Write-Host "Status: API is " -NoNewline -ForegroundColor Gray
Write-Host "LIVE ✅" -ForegroundColor Green
Write-Host ""
Write-Host "To test encode/decode:" -ForegroundColor Yellow
Write-Host "  1. Place an audio file (MP3/WAV/M4A) in this directory" -ForegroundColor Gray
Write-Host "  2. Run this script again: .\test_api_live.ps1" -ForegroundColor Gray
Write-Host ""
