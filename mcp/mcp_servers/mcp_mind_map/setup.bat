@echo off
REM Setup script for Mind_map MCP Server
REM This script sets up the development environment

echo Setting up Mind_map MCP Server development environment...

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not found in PATH.
    echo Please install Python 3.8 or later from https://python.org
    pause
    exit /b 1
) else (
    echo Python found: 
    python --version
)

REM Create virtual environment if it doesn't exist
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
) else (
    echo Virtual environment already exists.
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Upgrade pip
echo Upgrading pip...
python -m pip install --upgrade pip

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt

REM Install development dependencies
echo Installing development dependencies...
pip install pyinstaller pytest

echo.
echo Setup completed successfully!
echo.
echo Next steps:
echo 1. To run the server: run.ps1
echo 2. To build executable: build.bat
echo 3. To run tests: python -m pytest
echo 4. To manage server: manage-server.ps1 start^|stop^|status
echo.
pause
