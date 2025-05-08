# Restart-services.ps1 - Script to restart all microservices

Write-Host "Stopping all services..." -ForegroundColor Yellow

# Find and stop all Node.js processes running our services
Get-Process -Name "node" -ErrorAction SilentlyContinue | ForEach-Object {
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}

Write-Host "All services stopped. Starting services again..." -ForegroundColor Green

# Start each service in a new PowerShell window

# Start API Gateway
Start-Process powershell -ArgumentList "-NoExit -Command cd '$PSScriptRoot\api-gateway'; node server.js"
Write-Host "Started API Gateway" -ForegroundColor Cyan

# Start Property Service
Start-Process powershell -ArgumentList "-NoExit -Command cd '$PSScriptRoot\services\property-service'; node server.js"
Write-Host "Started Property Service" -ForegroundColor Cyan

# Start User Service
Start-Process powershell -ArgumentList "-NoExit -Command cd '$PSScriptRoot\services\user-service'; node server.js"
Write-Host "Started User Service" -ForegroundColor Cyan

# Start Appointment Service
Start-Process powershell -ArgumentList "-NoExit -Command cd '$PSScriptRoot\services\appointment-service'; node server.js"
Write-Host "Started Appointment Service" -ForegroundColor Cyan

# Start Chat Service
Start-Process powershell -ArgumentList "-NoExit -Command cd '$PSScriptRoot\services\chat-service'; node server.js"
Write-Host "Started Chat Service" -ForegroundColor Cyan

# Start Notification Service
Start-Process powershell -ArgumentList "-NoExit -Command cd '$PSScriptRoot\services\notification-service'; node server.js"
Write-Host "Started Notification Service" -ForegroundColor Cyan

Write-Host "All services are now running!" -ForegroundColor Green 