# Test Audio to Image Conversion API

Write-Host "Testing Audio to Image Conversion API"
Write-Host "======================================"
Write-Host ""

$BaseUrl = "http://localhost:3000/api"
$audioFile = "test-audio.wav"

# Create a simple test audio file if it doesn't exist
if (-not (Test-Path $audioFile)) {
    Write-Host "Creating sample audio file: $audioFile" -ForegroundColor Yellow
    
    # Create a minimal WAV file (440 Hz sine wave, 2 seconds)
    # This is a valid WAV header followed by PCM audio data
    $wavHeader = @(
        0x52, 0x49, 0x46, 0x46,  # "RIFF"
        0x24, 0xF0, 0x00, 0x00,  # File size (61476 bytes)
        0x57, 0x41, 0x56, 0x45,  # "WAVE"
        0x66, 0x6D, 0x74, 0x20,  # "fmt "
        0x10, 0x00, 0x00, 0x00,  # Subchunk1 size (16)
        0x01, 0x00,              # Audio format (PCM = 1)
        0x01, 0x00,              # Number of channels (mono)
        0x44, 0xAC, 0x00, 0x00,  # Sample rate (44100 Hz)
        0x88, 0x58, 0x01, 0x00,  # Byte rate
        0x02, 0x00,              # Block align
        0x10, 0x00,              # Bits per sample
        0x64, 0x61, 0x74, 0x61,  # "data"
        0x00, 0xF0, 0x00, 0x00   # Subchunk2 size
    )
    
    # Add some basic PCM audio data (silence)
    $audioData = [byte[]]::new(61440)
    for ($i = 0; $i -lt $audioData.Length; $i += 2) {
        $audioData[$i] = 0x00
        $audioData[$i + 1] = 0x00
    }
    
    $fileBytes = $wavHeader + $audioData
    $fullPath = Join-Path (Get-Location) $audioFile
    [System.IO.File]::WriteAllBytes($fullPath, $fileBytes)
    Write-Host "Sample audio file created successfully at: $fullPath" -ForegroundColor Green
}

Write-Host ""
Write-Host "Test: Convert Audio to Image"
Write-Host "Uploading audio file: $audioFile" -ForegroundColor Yellow

try {
    # Get the full path to the audio file
    $audioFilePath = Join-Path (Get-Location) $audioFile
    
    if (-not (Test-Path $audioFilePath)) {
        throw "Audio file not found: $audioFilePath"
    }
    
    Write-Host "Audio file path: $audioFilePath" -ForegroundColor Cyan
    Write-Host "File size: $((Get-Item $audioFilePath).Length) bytes" -ForegroundColor Cyan
    
    # Create multipart form data using .NET
    $userId = "test-user-$(Get-Date -Format 'yyyyMMddHHmmss')"
    $boundary = [System.Guid]::NewGuid().ToString()
    $LF = "`r`n"
    
    # Read the file as bytes
    $fileBytes = [System.IO.File]::ReadAllBytes($audioFilePath)
    
    # Build the multipart body
    $body = @()
    
    # Add form fields
    $body += "--$boundary$LF"
    $body += "Content-Disposition: form-data; name=`"userId`"$LF$LF"
    $body += "$userId$LF"
    
    $body += "--$boundary$LF"
    $body += "Content-Disposition: form-data; name=`"compress`"$LF$LF"
    $body += "true$LF"
    
    $body += "--$boundary$LF"
    $body += "Content-Disposition: form-data; name=`"deleteSource`"$LF$LF"
    $body += "false$LF"
    
    # Add file
    $body += "--$boundary$LF"
    $body += "Content-Disposition: form-data; name=`"audioFile`"; filename=`"$audioFile`"$LF"
    $body += "Content-Type: audio/wav$LF$LF"
    
    # Convert text to bytes and combine
    $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes(($body -join ""))
    $bodyBytes += $fileBytes
    
    $bodyBytes += [System.Text.Encoding]::UTF8.GetBytes("$LF--$boundary--$LF")
    
    # Send request
    $response = Invoke-WebRequest -Uri "$BaseUrl/convert/audio-to-image" `
        -Method POST `
        -ContentType "multipart/form-data; boundary=$boundary" `
        -Body $bodyBytes `
        -ErrorAction Stop
    
    Write-Host ""
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Cyan
    $response.Content | ConvertFrom-Json | Format-List
    
    # Save the response for debugging
    $response.Content | Out-File -FilePath "conversion-response.json"
    Write-Host ""
    Write-Host "Response saved to: conversion-response.json" -ForegroundColor Green
}
catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "Response Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Error Details: $($reader.ReadToEnd())" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Test completed!" -ForegroundColor Cyan
