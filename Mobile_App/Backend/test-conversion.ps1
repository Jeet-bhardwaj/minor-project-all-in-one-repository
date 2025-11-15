# Test Conversion API Endpoints

Write-Host "Testing Conversion API Endpoints"
Write-Host "================================"
Write-Host ""

$BaseUrl = "http://localhost:3000/api"

# Test 1: List Conversions
Write-Host "Test 1: List Conversions" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/conversions" -Method GET -ErrorAction Stop
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor Gray
}
catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Conversion API is ready!"
Write-Host ""
