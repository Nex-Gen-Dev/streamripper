"""
StreamRipper Auto-Updater
Checks GitHub Releases for a newer version and handles download + install.
"""
import sys
import os
import platform
import subprocess
import tempfile
import threading
import requests
from pathlib import Path
from packaging import version as pkg_version

# ── CONFIG — Change these to match your GitHub repo ──────────────────────────
GITHUB_OWNER = "YOUR_GITHUB_USERNAME"   # e.g. "johndoe"
GITHUB_REPO  = "streamripper"           # your repo name
CURRENT_VERSION = "1.0.0"              # bump this on every release
# ─────────────────────────────────────────────────────────────────────────────

RELEASES_API = f"https://api.github.com/repos/{GITHUB_OWNER}/{GITHUB_REPO}/releases/latest"
ASSET_MAP = {
    "Windows": "StreamRipper-Windows.exe",
    "Darwin":  "StreamRipper-macOS.dmg",
    "Linux":   "StreamRipper-Linux.AppImage",
}


def get_platform() -> str:
    return platform.system()  # "Windows" | "Darwin" | "Linux"


def check_for_update() -> dict | None:
    """
    Returns dict with {version, download_url, release_notes} if update available.
    Returns None if up to date or check fails.
    """
    try:
        resp = requests.get(RELEASES_API, timeout=8, headers={"Accept": "application/vnd.github+json"})
        if resp.status_code != 200:
            return None
        data = resp.json()
        latest_tag = data.get("tag_name", "").lstrip("v")
        if not latest_tag:
            return None

        if pkg_version.parse(latest_tag) <= pkg_version.parse(CURRENT_VERSION):
            return None  # already up to date

        # Find the right asset for this platform
        sys_name   = get_platform()
        asset_name = ASSET_MAP.get(sys_name)
        if not asset_name:
            return None

        download_url = None
        for asset in data.get("assets", []):
            if asset["name"] == asset_name:
                download_url = asset["browser_download_url"]
                break

        if not download_url:
            return None

        return {
            "version":       latest_tag,
            "download_url":  download_url,
            "release_notes": data.get("body", "")[:500],
            "asset_name":    asset_name,
        }
    except Exception as e:
        print(f"[Updater] Check failed: {e}")
        return None


def download_and_install(download_url: str, asset_name: str, progress_callback=None) -> bool:
    """
    Downloads the new build into a temp file, then launches the installer.
    progress_callback(pct: int) called during download.
    """
    try:
        resp = requests.get(download_url, stream=True, timeout=60)
        resp.raise_for_status()
        total = int(resp.headers.get("content-length", 0))

        # Write to temp file
        suffix = Path(asset_name).suffix
        tmp    = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        downloaded = 0
        for chunk in resp.iter_content(chunk_size=65536):
            tmp.write(chunk)
            downloaded += len(chunk)
            if total and progress_callback:
                progress_callback(int((downloaded / total) * 100))
        tmp.close()

        tmp_path = tmp.name
        sys_name = get_platform()

        if sys_name == "Windows":
            os.startfile(tmp_path)

        elif sys_name == "Darwin":
            # Mount DMG and open
            subprocess.Popen(["open", tmp_path])

        elif sys_name == "Linux":
            os.chmod(tmp_path, 0o755)
            subprocess.Popen([tmp_path])

        return True
    except Exception as e:
        print(f"[Updater] Download/install failed: {e}")
        return False


# ── Background thread API (used by Flask) ────────────────────────────────────

_update_info   = None   # cached result from check
_update_status = "idle" # idle | checking | available | downloading | done | error
_update_progress = 0

def start_background_check():
    """Call this once on app startup."""
    def _check():
        global _update_info, _update_status
        _update_status = "checking"
        info = check_for_update()
        if info:
            _update_info   = info
            _update_status = "available"
        else:
            _update_status = "idle"
    threading.Thread(target=_check, daemon=True).start()


def start_background_download():
    """Call this when the user confirms the update."""
    global _update_status, _update_progress
    if not _update_info:
        return

    def _dl():
        global _update_status, _update_progress
        _update_status   = "downloading"
        _update_progress = 0

        def prog(pct):
            global _update_progress
            _update_progress = pct

        ok = download_and_install(
            _update_info["download_url"],
            _update_info["asset_name"],
            progress_callback=prog,
        )
        _update_status = "done" if ok else "error"

    threading.Thread(target=_dl, daemon=True).start()


def get_update_state() -> dict:
    return {
        "status":   _update_status,
        "progress": _update_progress,
        "info":     _update_info,
        "current":  CURRENT_VERSION,
    }
