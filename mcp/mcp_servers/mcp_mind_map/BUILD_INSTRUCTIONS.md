# Build Instructions for Standalone Mind Map MCP Server

## Overview
This build process creates a **SINGLE, FULLY STANDALONE** executable that includes:
- Python runtime
- All Python dependencies (mcp, fastapi, uvicorn, etc.)
- Node.js runtime (bundled)
- markmap-cli (bundled)

**Result**: One `.exe` file (~80-120MB) that works on any Windows machine without requiring Python, Node.js, or any installations.

## Prerequisites (Build Machine Only)

The build machine needs:
1. **Python 3.8+** - To build the Python server
2. **Node.js 18+** - To build the standalone markmap executable
3. **npm** - Comes with Node.js

## Build Steps

### Step 1: Build Standalone Markmap Executable
```cmd
build-markmap.bat
```

This will:
- Install markmap-cli and esbuild via npm
- Bundle markmap-cli dependencies using esbuild with ESM→CommonJS conversion
- Package bundled code + Node.js runtime using pkg into `markmap-standalone.exe` (~60-80MB)
- Test the executable

**Technical Details**: The build uses a custom bundler script (`create-bundle.js`) that properly handles markmap-cli's ESM modules by converting them to CommonJS with `import.meta.url` shims. This is necessary because markmap-cli is ESM-only and pkg cannot execute ESM modules directly.

**Output**: `markmap-standalone.exe`

### Step 2: Build Complete MCP Server
```cmd
build.bat
```

This will:
- Run `build-markmap.bat` automatically (Step 1)
- Create Python virtual environment
- Install Python dependencies
- Use PyInstaller to bundle everything into one exe
- Bundle `markmap-standalone.exe` inside the Python exe
- Test the final executable

**Output**: `dist\mind_map-mcp-server.exe` (single standalone file)

## Alternative: Build Everything at Once
```cmd
build.bat
```
This runs both steps automatically.

## Verification

Test the final executable:
```cmd
# Test version (doesn't require external dependencies)
dist\mind_map-mcp-server.exe version --json

# Test server start
dist\mind_map-mcp-server.exe start --json

# In another terminal, test status
dist\mind_map-mcp-server.exe status --json

# Stop server
dist\mind_map-mcp-server.exe stop --json
```

## Distribution

Simply copy `dist\mind_map-mcp-server.exe` to target machines. No installation required!

The exe will:
1. Extract bundled `markmap-standalone.exe` to temp folder on first run
2. Use it for markdown-to-mindmap conversions
3. Clean up temp files on exit

## Target Machine Requirements

**NONE!** The executable is completely self-contained.

- ✅ No Python installation needed
- ✅ No Node.js installation needed
- ✅ No npm packages needed
- ✅ No PowerShell execution policy changes needed

## Troubleshooting

### Build fails at Step 1 (markmap)
- Ensure Node.js is installed: `node --version`
- Ensure npm is available: `npm --version`
- Try: `npm install` manually, then `npm run build`

### Build fails at Step 2 (Python)
- Ensure Python is installed: `python --version`
- Ensure pip is working: `python -m pip --version`
- Try deleting `venv` folder and rebuild

### Executable test fails
- Check if `markmap-standalone.exe` exists in the project folder
- Try running `markmap-standalone.exe --version` manually
- Rebuild with `build.bat`

## File Size Breakdown

- `markmap-standalone.exe`: ~60-80 MB (Node.js + markmap-cli)
- `mind_map-mcp-server.exe`: ~80-120 MB (Python + all deps + markmap exe)

Total distribution size: **One file, ~80-120 MB**
