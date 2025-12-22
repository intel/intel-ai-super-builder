# Build script for Mind_map MCP Server

Write-Host "Building Mind_map MCP Server..." -ForegroundColor Green

# Find Python executable
$PythonExe = $null
$PossiblePythons = @(
    "python",
    "python3",
    "py",
    "C:\Users\$env:USERNAME\AppData\Local\Microsoft\WindowsApps\python.exe",
    "C:\Users\$env:USERNAME\AppData\Local\Microsoft\WindowsApps\python3.exe"
)

foreach ($py in $PossiblePythons) {
    try {
        $version = & $py --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            $PythonExe = $py
            Write-Host "Found Python: $version using $py" -ForegroundColor Cyan
            break
        }
    } catch {
        continue
    }
}

if (-not $PythonExe) {
    Write-Host "Error: Python is not installed or not found in PATH." -ForegroundColor Red
    exit 1
}

# Set up variables
$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$VenvDir = "$ProjectDir\venv"

# Change to project directory
Push-Location $ProjectDir

# Create virtual environment if it doesn't exist
if (-not (Test-Path $VenvDir)) {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    & $PythonExe -m venv $VenvDir
}

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& "$VenvDir\Scripts\Activate.ps1"

# Install/upgrade dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
& "$VenvDir\Scripts\python.exe" -m pip install --upgrade pip
& "$VenvDir\Scripts\pip.exe" install -r requirements.txt

# Build markmap standalone executable first
Write-Host "Building markmap standalone executable..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: npm install failed" -ForegroundColor Red
    exit 1
}

Write-Host "Running npm build..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: markmap build failed" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "markmap-standalone.exe")) {
    Write-Host "Error: markmap-standalone.exe was not created" -ForegroundColor Red
    exit 1
}

# Build the executable
Write-Host "Building executable..." -ForegroundColor Yellow

# Run PyInstaller
Write-Host "Running PyInstaller..." -ForegroundColor Yellow
& "$VenvDir\Scripts\pyinstaller.exe" mind_map_server.spec

if ($LASTEXITCODE -eq 0) {
    Write-Host "Build successful!" -ForegroundColor Green
    Write-Host "Executable created at: dist\mind_map-mcp-server.exe" -ForegroundColor Green
    
    # Basic test
    Write-Host "Testing executable..." -ForegroundColor Yellow
    & .\dist\mind_map-mcp-server.exe version --json
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Executable test passed!" -ForegroundColor Green
    } else {
        Write-Host "Warning: Executable test failed" -ForegroundColor Yellow
    }
} else {
    Write-Host "Build failed!" -ForegroundColor Red
    Pop-Location
    exit 1
}

Pop-Location
Write-Host "Build process completed." -ForegroundColor Green

Write-Host "Build process completed." -ForegroundColor Green
