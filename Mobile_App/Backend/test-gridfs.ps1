# GridFS Quick Test Script
# Run this after starting the backend server

Write-Host "🧪 Testing GridFS Implementation" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3000"
$userId = "test_user_$(Get-Date -Format 'yyyyMMddHHmmss')"

# Test 1: Check server health
Write-Host "1️⃣ Checking server health..." -ForegroundColor Yellow
try {
    $null = Invoke-RestMethod -Uri "$baseUrl/health" -ErrorAction Stop
    Write-Host "✅ Server is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Server is not running. Please start with 'npm run dev'" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test 2: Find a test audio file
Write-Host "2️⃣ Looking for test audio file..." -ForegroundColor Yellow
$testAudioPath = "e:\Projects\minnor Project\Mobile_App\Backend\uploads\temp\test.mp3"

if (-not (Test-Path $testAudioPath)) {
    Write-Host "⚠️ No test audio file found at: $testAudioPath" -ForegroundColor Yellow
    Write-Host "Please place a test MP3 file there, or update the path in this script." -ForegroundColor Yellow
    
    # Try to find any audio file in uploads
    $audioFiles = Get-ChildItem -Path "e:\Projects\minnor Project\Mobile_App\Backend\uploads" -Recurse -Include *.mp3,*.wav -ErrorAction SilentlyContinue
    
    if ($audioFiles.Count -gt 0) {
        $testAudioPath = $audioFiles[0].FullName
        Write-Host "📁 Using: $testAudioPath" -ForegroundColor Cyan
    } else {
        Write-Host "❌ No audio files found in uploads directory" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ Found test audio: $testAudioPath" -ForegroundColor Green
}

Write-Host ""

# Test 3: Audio to Image (GridFS)
Write-Host "3️⃣ Testing Audio → Image conversion..." -ForegroundColor Yellow
try {
    $form = @{
        audio = Get-Item $testAudioPath
        userId = $userId
        compress = "true"
    }
    
    $response = Invoke-RestMethod -Method Post `
        -Uri "$baseUrl/api/v2/audio-to-image" `
        -Form $form `
        -ErrorAction Stop
    
    Write-Host "✅ Conversion successful!" -ForegroundColor Green
    Write-Host "   Conversion ID: $($response.conversionId)" -ForegroundColor Cyan
    Write-Host "   Number of images: $($response.numImages)" -ForegroundColor Cyan
    Write-Host "   Total size: $($response.totalSize) bytes" -ForegroundColor Cyan
    
    $conversionId = $response.conversionId
} catch {
    Write-Host "❌ Conversion failed: $_" -ForegroundColor Red
    Write-Host $_.Exception.Response
    exit 1
}

Write-Host ""

# Test 4: Get User Conversions
Write-Host "4️⃣ Testing Get User Conversions..." -ForegroundColor Yellow
try {
    $conversions = Invoke-RestMethod -Method Get `
        -Uri "$baseUrl/api/v2/user/$userId/conversions" `
        -ErrorAction Stop
    
    Write-Host "✅ Found $($conversions.totalConversions) conversion(s)" -ForegroundColor Green
    
    foreach ($conv in $conversions.conversions) {
        Write-Host "   📄 $($conv.originalFileName)" -ForegroundColor Cyan
        Write-Host "      ID: $($conv.conversionId)" -ForegroundColor Gray
        Write-Host "      Images: $($conv.numImages)" -ForegroundColor Gray
        Write-Host "      Created: $($conv.createdAgo)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Failed to get conversions: $_" -ForegroundColor Red
}

Write-Host ""

# Test 5: Image to Audio (GridFS)
Write-Host "5️⃣ Testing Image → Audio decoding..." -ForegroundColor Yellow
try {
    $outputPath = "e:\Projects\minnor Project\Mobile_App\Backend\uploads\temp\decoded_test.wav"
    
    $body = @{
        userId = $userId
        conversionId = $conversionId
    } | ConvertTo-Json
    
    Invoke-RestMethod -Method Post `
        -Uri "$baseUrl/api/v2/image-to-audio" `
        -ContentType "application/json" `
        -Body $body `
        -OutFile $outputPath `
        -ErrorAction Stop
    
    Write-Host "✅ Decoding successful!" -ForegroundColor Green
    Write-Host "   Output saved to: $outputPath" -ForegroundColor Cyan
    
    $fileInfo = Get-Item $outputPath
    Write-Host "   File size: $($fileInfo.Length) bytes" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Decoding failed: $_" -ForegroundColor Red
}

Write-Host ""

# Test 6: Delete Conversion (optional)
Write-Host "6️⃣ Testing Delete Conversion..." -ForegroundColor Yellow
$deleteChoice = Read-Host "Do you want to delete the test conversion? (y/N)"

if ($deleteChoice -eq "y" -or $deleteChoice -eq "Y") {
    try {
        $null = Invoke-RestMethod -Method Delete `
            -Uri "$baseUrl/api/v2/conversions/$userId/$conversionId" `
            -ErrorAction Stop
        
        Write-Host "✅ Conversion deleted successfully" -ForegroundColor Green
    } catch {
        Write-Host "❌ Deletion failed: $_" -ForegroundColor Red
    }
} else {
    Write-Host "⏭️ Skipping deletion" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Testing complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "   User ID: $userId" -ForegroundColor Gray
Write-Host "   Conversion ID: $conversionId" -ForegroundColor Gray
Write-Host ""
Write-Host "💡 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Check MongoDB Atlas for conversion documents" -ForegroundColor Gray
Write-Host "   2. Verify GridFS files in uploads.files collection" -ForegroundColor Gray
Write-Host "   3. Update mobile app to use /api/v2/* endpoints" -ForegroundColor Gray
