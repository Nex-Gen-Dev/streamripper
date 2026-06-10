# streamripper.spec
# PyInstaller build spec — bundles Python + all deps into a single executable

import sys
from pathlib import Path
from PyInstaller.utils.hooks import collect_data_files, collect_submodules

block_cipher = None

# Collect yt-dlp data files and hidden imports
yt_dlp_datas    = collect_data_files("yt_dlp")
yt_dlp_hidden   = collect_submodules("yt_dlp")
flask_datas     = collect_data_files("flask")
jinja_datas     = collect_data_files("jinja2")

a = Analysis(
    ["backend/app.py"],
    pathex=["."],
    binaries=[],
    datas=[
        ("frontend/templates", "frontend/templates"),
        ("frontend/static",    "frontend/static"),
        *yt_dlp_datas,
        *flask_datas,
        *jinja_datas,
    ],
    hiddenimports=[
        "flask",
        "flask_cors",
        "jinja2",
        "mutagen",
        "mutagen.mp3",
        "mutagen.id3",
        "mutagen.mp4",
        "mutagen.flac",
        *yt_dlp_hidden,
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
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
    name="StreamRipper",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,            # no terminal window for end-users
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon="assets/icon.ico" if sys.platform == "win32" else (
         "assets/icon.icns" if sys.platform == "darwin" else None
    ),
)

# macOS .app bundle
if sys.platform == "darwin":
    app = BUNDLE(
        exe,
        name="StreamRipper.app",
        icon="assets/icon.icns",
        bundle_identifier="com.streamripper.app",
        info_plist={
            "NSHighResolutionCapable": True,
            "LSMinimumSystemVersion":  "10.14",
            "CFBundleShortVersionString": "1.0.0",
        },
    )
