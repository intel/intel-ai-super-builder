# Setup script for Mind_map MCP Server
# This script sets up the development environment

Write-Host "Setting up Mind_map MCP Server development environment..." -ForegroundColor Green

# Check if Python is available
try {
    $pythonVersion = python --version 2>$null
    Write-Host "Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "Error: Python is not installed or not found in PATH." -ForegroundColor Red
    Write-Host "Please install Python 3.8 or later from https://python.org" -ForegroundColor Yellow
    exit 1
}

# Create virtual environment if it doesn't exist
if (-not (Test-Path "venv")) {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv venv
} else {
    Write-Host "Virtual environment already exists." -ForegroundColor Green
}

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& "venv\Scripts\Activate.ps1"

# Upgrade pip
Write-Host "Upgrading pip..." -ForegroundColor Yellow
python -m pip install --upgrade pip

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt

# Install development dependencies
Write-Host "Installing development dependencies..." -ForegroundColor Yellow
pip install pyinstaller pytest

Write-Host "" -ForegroundColor Green
Write-Host "Setup completed successfully!" -ForegroundColor Green
Write-Host "" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. To run the server: .\run.ps1" -ForegroundColor White
Write-Host "2. To build executable: .\build.ps1" -ForegroundColor White
Write-Host "3. To run tests: python -m pytest" -ForegroundColor White
Write-Host "4. To manage server: .\manage-server.ps1 start|stop|status" -ForegroundColor White
