Set-Location $PSScriptRoot # make sure terminal is in the same directory as this script

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Error "Python is not installed or not found in PATH."
    exit 1
}

if (-Not (Test-Path -Path "venv" -PathType Container)) {
    Write-Host "Creating Python virtual environment and installing dependencies..."
    python -m venv venv
    venv/Scripts/Activate.ps1
    pip install -r requirements.txt
}
else {
    venv/Scripts/Activate.ps1
}

Write-Host "Starting the server..."
python server.py start --json