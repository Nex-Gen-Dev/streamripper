"""
StreamRipper Backend — Flask API
Features: Auth, strict MP3/MP4 download, queue, analytics reporting
"""
import os, sys, json, threading, uuid, re, hashlib, time
from pathlib import Path
from datetime import datetime
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import yt_dlp

if getattr(sys, "frozen", False):
    BASE_DIR = Path(sys._MEIPASS)
    APP_DIR  = Path(sys.executable).parent
else:
    BASE_DIR = Path(__file__).parent
    APP_DIR  = BASE_DIR.parent

FRONTEND_DIR  = BASE_DIR / "frontend"
DOWNLOADS_DIR = APP_DIR / "StreamRipper Downloads"
DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)

CF_WORKER_URL = os.environ.get("CF_WORKER_URL", "https://streamripper-worker.YOUR_SUBDOMAIN.workers.dev")

app = Flask(__name__,
    template_folder=str(FRONTEND_DIR / "templates"),
    static_folder=str(FRONTEND_DIR / "static"))
app.secret_key = os.environ.get("SECRET_KEY", "streamripper-secret-change-me")
CORS(app, supports_credentials=True)

queue: dict = {}
queue_lock  = threading.Lock()
sessions: dict = {}

def detect_platform(url):
    u = url.lower()
    if "tiktok.com"    in u: return "TikTok"
    if "instagram.com" in u: return "Instagram"
    if "music.youtube" in u: return "YouTube Music"
    return "YouTube"

def safe_name(s):
    return re.sub(r'[<>:"/\\|?*]', "_", str(s or "Unknown")).strip() or "Unknown"

def out_dir(platform, artist, album):
    p = DOWNLOADS_DIR / safe_name(platform) / safe_name(artist or "Unknown Artist") / safe_name(album or "Unknown Album")
    p.mkdir(parents=True, exist_ok=True)
    return p

def hash_pass(pw): return hashlib.sha256(pw.encode()).hexdigest()
def get_ip(): return request.headers.get("X-Forwarded-For", request.remote_addr or "unknown").split(",")[0].strip()
def get_token(): return request.headers.get("X-Auth-Token") or request.cookies.get("sr_token")
def current_user():
    tok = get_token()
    return sessions.get(tok) if tok else None

def report_to_cf(event, extra={}):
    import requests as req
    user = current_user()
    payload = {
        "event": event, "ts": datetime.utcnow().isoformat(),
        "ip": get_ip(), "ua": request.headers.get("User-Agent",""),
        "email": (user or {}).get("email",""),
        "uid":   (user or {}).get("uid",""),
        **extra
    }
    def _send():
        try: req.post(f"{CF_WORKER_URL}/api/event", json=payload, timeout=5)
        except: pass
    threading.Thread(target=_send, daemon=True).start()

def build_opts(job):
    mode    = job.get("mode","audio")
    odir    = out_dir(job["platform"], job.get("artist",""), job.get("album",""))
    quality = str(job.get("quality","128"))
    common  = {
        "outtmpl": str(odir / "%(title)s.%(ext)s"),
        "writethumbnail": True, "addmetadata": True,
        "noplaylist": False, "ignoreerrors": True,
        "retries": 5, "fragment_retries": 5,
        "http_headers": {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"},
        "progress_hooks": [lambda d: _hook(d, job["id"])],
    }
    if mode == "video":
        common.update({
            "format": "bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo[ext=mp4]+bestaudio/best[ext=mp4]",
            "merge_output_format": "mp4",
            "postprocessors": [
                {"key": "FFmpegVideoConvertor", "preferedformat": "mp4"},
                {"key": "FFmpegMetadata"}, {"key": "EmbedThumbnail"},
            ],
        })
    else:
        common.update({
            "format": "bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio/best",
            "postprocessors": [
                {"key": "FFmpegExtractAudio", "preferredcodec": "mp3",
                 "preferredquality": quality, "nopostoverwrites": False},
                {"key": "FFmpegMetadata"}, {"key": "EmbedThumbnail"},
            ],
        })
    return common

def _hook(d, job_id):
    with queue_lock:
        job = queue.get(job_id)
        if not job: return
        if d["status"] == "downloading":
            total = d.get("total_bytes") or d.get("total_bytes_estimate", 0)
            dl    = d.get("downloaded_bytes", 0)
            job["progress"] = int((dl/total)*100) if total else 0
            job["speed"]    = d.get("_speed_str","")
            job["eta"]      = d.get("_eta_str","")
            job["status"]   = "downloading"
        elif d["status"] == "finished":
            job["progress"] = 99; job["status"] = "processing"
        elif d["status"] == "error":
            job["status"] = "failed"

def _run(job_id):
    with queue_lock: queue[job_id]["status"] = "starting"
    try:
        with yt_dlp.YoutubeDL(build_opts(queue[job_id])) as ydl:
            ydl.download([queue[job_id]["url"]])
        with queue_lock:
            queue[job_id]["status"] = "done"
            queue[job_id]["progress"] = 100
        report_to_cf("download_complete", {"title": queue[job_id].get("title",""), "mode": queue[job_id].get("mode","")})
    except Exception as e:
        with queue_lock:
            queue[job_id]["status"] = "failed"
            queue[job_id]["error"]  = str(e)

# ── Auth ──────────────────────────────────────────────────────────────────────
@app.route("/api/auth/register", methods=["POST"])
def register():
    import requests as req
    data  = request.json or {}
    email = data.get("email","").strip().lower()
    pw    = data.get("password","")
    name  = data.get("name","").strip()
    if not email or not pw: return jsonify({"error":"Email and password required"}),400
    try:
        r    = req.post(f"{CF_WORKER_URL}/api/auth/register", json={
            "email":email,"password":hash_pass(pw),"name":name,
            "ip":get_ip(),"ua":request.headers.get("User-Agent",""),"os":data.get("os",""),
        }, timeout=8)
        resp = r.json()
        if resp.get("error"): return jsonify(resp),400
        tok = resp["token"]
        sessions[tok] = {"email":email,"uid":resp["uid"],"name":name}
        report_to_cf("register",{"email":email})
        return jsonify({"token":tok,"name":name,"email":email})
    except Exception as e: return jsonify({"error":str(e)}),500

@app.route("/api/auth/login", methods=["POST"])
def login():
    import requests as req
    data  = request.json or {}
    email = data.get("email","").strip().lower()
    pw    = data.get("password","")
    try:
        r    = req.post(f"{CF_WORKER_URL}/api/auth/login", json={
            "email":email,"password":hash_pass(pw),
            "ip":get_ip(),"ua":request.headers.get("User-Agent",""),"os":data.get("os",""),
        }, timeout=8)
        resp = r.json()
        if resp.get("error"): return jsonify(resp),401
        tok = resp["token"]
        sessions[tok] = {"email":email,"uid":resp["uid"],"name":resp.get("name","")}
        report_to_cf("login",{"email":email})
        return jsonify({"token":tok,"name":resp.get("name",""),"email":email})
    except Exception as e: return jsonify({"error":str(e)}),500

@app.route("/api/auth/logout", methods=["POST"])
def logout():
    tok = get_token()
    if tok and tok in sessions: del sessions[tok]
    return jsonify({"ok":True})

@app.route("/api/auth/me")
def me():
    user = current_user()
    if not user: return jsonify({"error":"Not logged in"}),401
    return jsonify(user)

# ── Ads ───────────────────────────────────────────────────────────────────────
@app.route("/api/ads/current")
def get_ad():
    import requests as req
    try:
        r = req.get(f"{CF_WORKER_URL}/api/ads/current", timeout=4)
        return jsonify(r.json())
    except: return jsonify({"ad":None})

# ── Search ────────────────────────────────────────────────────────────────────
@app.route("/api/search")
def search():
    q = request.args.get("q","").strip()
    if not q: return jsonify({"results":[]})
    report_to_cf("search",{"query":q})
    try:
        with yt_dlp.YoutubeDL({"quiet":True,"no_warnings":True,"extract_flat":True}) as ydl:
            info = ydl.extract_info(f"ytsearch10:{q}", download=False)
        results = [{"id":e.get("id"),"title":e.get("title"),"uploader":e.get("uploader") or e.get("channel"),
            "duration":e.get("duration"),"url":e.get("url") or f"https://www.youtube.com/watch?v={e.get('id')}",
            "thumbnail":e.get("thumbnail")} for e in (info.get("entries") or [])]
        return jsonify({"results":results})
    except Exception as e: return jsonify({"error":str(e)}),500

# ── Queue ─────────────────────────────────────────────────────────────────────
@app.route("/api/enqueue", methods=["POST"])
def enqueue():
    data = request.json or {}
    url  = (data.get("url") or "").strip()
    if not url: return jsonify({"error":"No URL"}),400
    job_id = str(uuid.uuid4())
    job = {
        "id":job_id,"url":url,"title":data.get("title",url),
        "artist":data.get("artist",""),"album":data.get("album",""),
        "mode":data.get("mode","audio"),   # "audio"=MP3 ONLY  "video"=MP4 ONLY
        "quality":data.get("quality","128"),
        "platform":detect_platform(url),
        "status":"queued","progress":0,"speed":"","eta":"","error":"",
        "queued_at":datetime.utcnow().isoformat(),
    }
    with queue_lock: queue[job_id] = job
    threading.Thread(target=_run, args=(job_id,), daemon=True).start()
    return jsonify({"job_id":job_id,"job":job})

@app.route("/api/queue")
def get_queue():
    with queue_lock: return jsonify(list(queue.values()))

@app.route("/api/queue/<job_id>/cancel", methods=["DELETE"])
def cancel_job(job_id):
    with queue_lock:
        if job_id in queue: queue[job_id]["status"] = "cancelled"
    return jsonify({"ok":True})

@app.route("/api/queue/clear", methods=["DELETE"])
def clear_done():
    with queue_lock:
        done = [k for k,v in queue.items() if v["status"] in ("done","failed","cancelled")]
        for k in done: del queue[k]
    return jsonify({"cleared":len(done)})

@app.route("/api/downloads-path")
def dl_path(): return jsonify({"path":str(DOWNLOADS_DIR)})

# ── Updater ───────────────────────────────────────────────────────────────────
try:
    from updater import start_background_check, start_background_download, get_update_state
    _upd = True
except ImportError: _upd = False

@app.route("/api/update/status")
def upd_status(): return jsonify(get_update_state() if _upd else {"status":"unavailable"})

@app.route("/api/update/install", methods=["POST"])
def upd_install():
    if not _upd: return jsonify({"error":"unavailable"}),400
    start_background_download(); return jsonify({"ok":True})

@app.route("/", defaults={"path":""})
@app.route("/<path:path>")
def index(path=""): return render_template("index.html")

if __name__ == "__main__":
    import webbrowser
    port = 7474
    if _upd: start_background_check()
    print(f"[StreamRipper] http://127.0.0.1:{port}")
    threading.Timer(1.2, lambda: webbrowser.open(f"http://127.0.0.1:{port}")).start()
    app.run(host="127.0.0.1", port=port, debug=False, threaded=True)
