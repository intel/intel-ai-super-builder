@echo off
REM Build standalone Node.js executable for markmap

echo Building standalone markmap executable...

REM Check if Node.js is available
node --version >nul 2>&1
if errorlevel 1 (
    echo Error: Node.js is not installed or not found in PATH.
    echo Please install Node.js from https://nodejs.org/
    exit /b 1
)

REM Install dependencies
echo Installing Node.js dependencies...
call npm install

REM Install pkg globally if not already installed
echo Checking for pkg...
call npm list -g pkg >nul 2>&1
if errorlevel 1 (
    echo Installing pkg globally...
    call npm install -g pkg
)

REM Bundle markmap-cli using ncc
echo Bundling markmap-cli with ncc...
call npm run bundle

if errorlevel 1 (
    echo Error: Failed to bundle markmap-cli
    exit /b 1
)

REM Build standalone executable
echo Building markmap-standalone.exe...
call npm run build

if %errorlevel% equ 0 (
    echo.
    echo Standalone markmap executable created successfully!
    echo Location: markmap-standalone.exe
    echo.
    echo Testing executable...
    .\markmap-standalone.exe --version
    if %errorlevel% equ 0 (
        echo Test passed!
    ) else (
        echo Warning: Test failed
    )
) else (
    echo Build failed!
    exit /b 1
)

echo Done!
