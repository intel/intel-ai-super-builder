@echo off
REM Build script for Mind_map MCP Server

echo Building Mind_map MCP Server...

REM Check if Node.js is available
node --version >nul 2>&1
if errorlevel 1 (
    echo Error: Node.js is not installed or not found in PATH.
    echo Node.js is required to build the standalone markmap executable.
    echo Please install Node.js from https://nodejs.org/
    exit /b 1
)

REM Step 1: Build standalone markmap executable
echo.
echo Step 1: Building standalone markmap executable...
call build-markmap.bat
if errorlevel 1 (
    echo Error: Failed to build markmap executable.
    exit /b 1
)

REM Check if Python is available
py --version >nul 2>&1
if errorlevel 1 (
    python --version >nul 2>&1
    if errorlevel 1 (
        echo Error: Python is not installed or not found in PATH.
        exit /b 1
    )
    set PYTHON_CMD=python
) else (
    set PYTHON_CMD=py
)

REM Step 2: Build Python MCP Server
echo.
echo Step 2: Building Python MCP Server...

REM Create virtual environment if it doesn't exist
if not exist "venv" (
    echo Creating virtual environment...
    %PYTHON_CMD% -m venv venv
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install/upgrade dependencies
echo Installing dependencies...
%PYTHON_CMD% -m pip install --upgrade pip
pip install -r requirements.txt

REM Build the executable
echo Building executable...
%PYTHON_CMD% -m PyInstaller mind_map_server.spec

if %errorlevel% equ 0 (
    echo.
    echo ====================================
    echo Build successful!
    echo ====================================
    echo Executable created at: dist\mind_map-mcp-server.exe
    echo This is a SINGLE, STANDALONE executable with ALL dependencies bundled.
    echo No Node.js or Python installation required on target machines.
    echo.
    
    REM Basic test
    echo Testing executable...
    dist\mind_map-mcp-server.exe version --json
    
    if %errorlevel% equ 0 (
        echo.
        echo ====================================
        echo Executable test passed!
        echo ====================================
        echo.
        echo The executable is ready for distribution.
        echo Size: 
        dir dist\mind_map-mcp-server.exe | find "mind_map-mcp-server.exe"
    ) else (
        echo Warning: Executable test failed
    )
) else (
    echo Build failed!
    exit /b 1
)

echo.
echo Build process completed.
pause
