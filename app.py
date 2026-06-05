import os
import sys
import json
import threading
import uuid
import re
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory, render_template
from flask_cors import CORS
import yt_dlp

# ── Path resolution (works both dev and PyInstaller bundle) ──────────────────
if getattr(sys, "frozen", False):
    BASE_DIR = Path(sys._MEIPASS)
    APP_DIR  = Path(sys.executable).parent
else:
    BASE_DIR = Path(__file__).parent
    APP_DIR  = BASE_DIR.parent

FRONTEND_DIR  = BASE_DIR / "frontend"
DOWNLOADS_DIR = APP_DIR  / "StreamRipper Downloads"
DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)

app = Flask(
    __name__,
    template_folder=str(FRONTEND_DIR / "templates"),
    static_folder=str(FRONTEND_DIR / "static"),
)
CORS(app)

# ── In-memory queue store ────────────────────────────────────────────────────
queue: dict[str, dict] = {}   # job_id -> job info
queue_lock = threading.Lock()


# ── Helpers ──────────────────────────────────────────────────────────────────

def detect_platform(url: str) -> str:
    if "tiktok.com" in url:   return "TikTok"
    if "instagram.com" in url: return "Instagram"
    if "music.youtube" in url: return "YouTube Music"
    return "YouTube"


def safe_filename(name: str) -> str:
    return re.sub(r'[<>:"/\\|?*]', "_", name).strip()


def output_path(platform: str, artist: str, album: str) -> Path:
    p = DOWNLOADS_DIR / safe_filename(platform) / safe_filename(artist or "Unknown Artist") / safe_filename(album or "Unknown Album")
    p.mkdir(parents=True, exist_ok=True)
    return p


def build_ydl_opts(job: dict) -> dict:
    platform = job["platform"]
    mode     = job.get("mode", "audio")  # "audio" | "video"
    out_dir  = output_path(platform, job.get("artist", ""), job.get("album", ""))

    common = {
        "outtmpl": str(out_dir / "%(title)s.%(ext)s"),
        "writethumbnail": True,
        "embedthumbnail": True,
        "addmetadata": True,
        "noplaylist": False,
        "ignoreerrors": True,
        "retries": 5,
        "fragment_retries": 5,
        "http_headers": {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            )
        },
        "progress_hooks": [lambda d: _progress_hook(d, job["id"])],
    }

    if mode == "video":
        common.update({
            "format": "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
            "merge_output_format": "mp4",
            "postprocessors": [{"key": "FFmpegMetadata"}],
        })
    else:
        common.update({
            "format": "bestaudio/best",
            "postprocessors": [
                {
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": "mp3",
                    "preferredquality": "128",
                },
                {"key": "FFmpegMetadata"},
                {"key": "EmbedThumbnail"},
            ],
        })

    return common


def _progress_hook(d: dict, job_id: str):
    with queue_lock:
        job = queue.get(job_id)
        if not job:
            return
        if d["status"] == "downloading":
            total   = d.get("total_bytes") or d.get("total_bytes_estimate", 0)
            downloaded = d.get("downloaded_bytes", 0)
            job["progress"] = int((downloaded / total) * 100) if total else 0
            job["speed"]    = d.get("_speed_str", "")
            job["eta"]      = d.get("_eta_str", "")
            job["status"]   = "downloading"
        elif d["status"] == "finished":
            job["progress"] = 99
            job["status"]   = "processing"
        elif d["status"] == "error":
            job["status"]   = "failed"


def _run_download(job_id: str):
    with queue_lock:
        job = queue[job_id]
        job["status"] = "starting"

    try:
        opts = build_ydl_opts(job)
        with yt_dlp.YoutubeDL(opts) as ydl:
            ydl.download([job["url"]])
        with queue_lock:
            queue[job_id]["status"]   = "done"
            queue[job_id]["progress"] = 100
    except Exception as e:
        with queue_lock:
            queue[job_id]["status"] = "failed"
            queue[job_id]["error"]  = str(e)


# ── Routes ───────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/search")
def search():
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify({"results": []})
    try:
        opts = {
            "quiet": True,
            "no_warnings": True,
            "extract_flat": True,
            "default_search": "ytsearch10",
        }
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(f"ytsearch10:{query}", download=False)
        results = []
        for entry in (info.get("entries") or []):
            results.append({
                "id":       entry.get("id"),
                "title":    entry.get("title"),
                "uploader": entry.get("uploader") or entry.get("channel"),
                "duration": entry.get("duration"),
                "url":      entry.get("url") or f"https://www.youtube.com/watch?v={entry.get('id')}",
                "thumbnail": entry.get("thumbnail"),
            })
        return jsonify({"results": results})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/enqueue", methods=["POST"])
def enqueue():
    data = request.json or {}
    url  = (data.get("url") or "").strip()
    if not url:
        return jsonify({"error": "No URL provided"}), 400

    job_id = str(uuid.uuid4())
    job = {
        "id":       job_id,
        "url":      url,
        "title":    data.get("title", url),
        "artist":   data.get("artist", ""),
        "album":    data.get("album", ""),
        "mode":     data.get("mode", "audio"),
        "platform": detect_platform(url),
        "status":   "queued",
        "progress": 0,
        "speed":    "",
        "eta":      "",
        "error":    "",
    }
    with queue_lock:
        queue[job_id] = job

    thread = threading.Thread(target=_run_download, args=(job_id,), daemon=True)
    thread.start()

    return jsonify({"job_id": job_id, "job": job})


@app.route("/api/queue")
def get_queue():
    with queue_lock:
        return jsonify(list(queue.values()))


@app.route("/api/queue/<job_id>")
def get_job(job_id):
    with queue_lock:
        job = queue.get(job_id)
    if not job:
        return jsonify({"error": "Not found"}), 404
    return jsonify(job)


@app.route("/api/queue/<job_id>/cancel", methods=["DELETE"])
def cancel_job(job_id):
    with queue_lock:
        job = queue.get(job_id)
        if job:
            job["status"] = "cancelled"
    return jsonify({"ok": True})


@app.route("/api/queue/clear", methods=["DELETE"])
def clear_done():
    with queue_lock:
        done = [k for k, v in queue.items() if v["status"] in ("done", "failed", "cancelled")]
        for k in done:
            del queue[k]
    return jsonify({"cleared": len(done)})


@app.route("/api/downloads-path")
def downloads_path():
    return jsonify({"path": str(DOWNLOADS_DIR)})


if __name__ == "__main__":
    import webbrowser
    port = 7474
    print(f"[StreamRipper] Starting on http://127.0.0.1:{port}")
    timer = threading.Timer(1.2, lambda: webbrowser.open(f"http://127.0.0.1:{port}"))
    timer.start()
    app.run(host="127.0.0.1", port=port, debug=False, threaded=True)
