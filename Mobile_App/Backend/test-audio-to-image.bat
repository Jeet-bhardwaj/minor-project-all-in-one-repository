@echo off
REM Test Audio to Image Conversion API using cURL

setlocal enabledelayedexpansion

echo.
echo ============================================
echo Testing Audio to Image Conversion API
echo ============================================
echo.

set "BASE_URL=http://localhost:3000/api"
set "AUDIO_FILE=test-audio.wav"

REM Check if audio file exists
if not exist "%AUDIO_FILE%" (
    echo ERROR: Audio file not found: %AUDIO_FILE%
    exit /b 1
)

REM Get file size
for %%A in ("%AUDIO_FILE%") do (
    set "FILE_SIZE=%%~zA"
)

echo [OK] Audio file found: %AUDIO_FILE%
echo [OK] File size: %FILE_SIZE% bytes
echo.
echo [INFO] Sending request to: %BASE_URL%/convert/audio-to-image
echo.

REM Send the request using curl with explicit mime type
curl -X POST ^
  -F "audioFile=@%AUDIO_FILE%;type=audio/wav" ^
  -F "userId=test-user" ^
  -F "compress=true" ^
  -F "deleteSource=false" ^
  "%BASE_URL%/convert/audio-to-image"

echo.
echo.
echo [INFO] Test completed!
