# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ['server.py'],
    pathex=[],
    binaries=[
        ('markmap-standalone.exe', '.'),  # Bundle the standalone markmap executable
    ],
    datas=[],
    hiddenimports=[
        'mcp.server.fastmcp',
        'fastapi',
        'uvicorn',
        'asyncio',
        'threading',
        'json',
        'argparse',
        'socket',
        'signal',
        'platform',
        'time',
        'os',
        'sys',
        'logging',
        'subprocess',
        'pathlib',
        'typing',
        'requests',
        'datetime',
        'psutil',
        'tzdata',
        # Add project-specific imports as needed
        # 'python_dotenv',     # For environment variables
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['readline'],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='mind_map-mcp-server',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
