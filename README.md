# StreamRipper

> Download music & video from YouTube, YouTube Music, Instagram, TikTok — in bulk, with metadata, beautiful UI.

---

## ✅ How to Deploy on GitHub (Step by Step)

### Step 1 — Create a GitHub Account
If you don't have one, go to **https://github.com** and sign up (free).

---

### Step 2 — Create a New Repository

1. Click the **+** icon (top right) → **New repository**
2. Name it: `streamripper`
3. Set it to **Public** (required for free GitHub Actions)
4. ✅ Check **"Add a README file"**
5. Click **Create repository**

---

### Step 3 — Upload All Files

**Option A — GitHub Web Upload (easiest):**
1. Open your repository on GitHub
2. Click **Add file** → **Upload files**
3. Drag and drop ALL folders and files from this project
4. Make sure you maintain the folder structure exactly as shown below
5. Click **Commit changes**

**Option B — Git (if you have Git installed):**
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/streamripper.git
git push -u origin main
```

---

### Step 4 — Watch the Builds

1. Go to your repository on GitHub
2. Click the **Actions** tab at the top
3. You'll see **"Build StreamRipper"** running automatically
4. It builds 3 things in parallel:
   - ✅ `StreamRipper-Windows.exe`
   - ✅ `StreamRipper-macOS.dmg`
   - ✅ `StreamRipper-Linux.AppImage`
5. Each build takes ~5-10 minutes

---

### Step 5 — Download Your Build

1. Click the completed workflow run
2. Scroll down to **Artifacts**
3. Download the one for your OS

---

### Step 6 — Create a Release (for clean download links)

1. On your repo page, click **Releases** (right sidebar) → **Create a new release**
2. Click **Choose a tag** → type `v1.0.0` → click **Create new tag**
3. Click **Publish release**
4. GitHub Actions will automatically attach all 3 build files to the release

---

## 📁 Required Folder Structure

Make sure your files are uploaded in EXACTLY this structure:

```
streamripper/
├── .github/
│   └── workflows/
│       └── build.yml          ← GitHub Actions build script
├── backend/
│   └── app.py                 ← Python Flask server
├── frontend/
│   ├── templates/
│   │   └── index.html         ← Main UI
│   └── static/
│       ├── css/
│       │   └── app.css
│       └── js/
│           └── app.js
├── requirements.txt           ← Python dependencies
├── streamripper.spec          ← PyInstaller build config
└── README.md
```

---

## 🖥️ How to Run (After Download)

### Windows
1. Double-click `StreamRipper-Windows.exe`
2. Windows may show a security warning → click **More info** → **Run anyway**
3. Your browser opens automatically at `http://127.0.0.1:7474`

### macOS
1. Open `StreamRipper-macOS.dmg`
2. Drag StreamRipper to Applications
3. Right-click → **Open** (first time only, to bypass Gatekeeper)

### Linux / ChromeOS
```bash
chmod +x StreamRipper-Linux.AppImage
./StreamRipper-Linux.AppImage
```
On ChromeOS: enable Linux environment in Settings, then run the AppImage there.

---

## 📥 What It Downloads

| Platform        | Audio (MP3) | Video (MP4) | Metadata | Artwork |
|----------------|-------------|-------------|----------|---------|
| YouTube         | ✅          | ✅          | ✅       | ✅      |
| YouTube Music   | ✅          | ✅          | ✅       | ✅      |
| Instagram       | ✅          | ✅          | ✅       | ✅      |
| TikTok          | ✅          | ✅          | ✅       | ✅      |

---

## 📂 Download Folder Structure

Files save to your Desktop automatically:
```
StreamRipper Downloads/
└── YouTube/
    └── Drake/
        └── Certified Lover Boy/
            ├── Girls Want Girls.mp3
            └── Way 2 Sexy.mp3
└── Instagram/
    └── ...
```

---

## 🔧 Features

- 🔍 **Search bar** — search YouTube directly inside the app
- 📋 **Bulk queue** — add dozens of URLs at once
- 🎵 MP3 128kbps audio or 🎬 MP4 video per item
- 🏷️ **Full metadata** — title, artist, album, artwork embedded
- 🔁 **Cloudflare bypass** via yt-dlp's built-in evasion
- 📊 **Live progress** — speed, ETA, status per item
- 🗂️ **Auto-organized folders** by Platform → Artist → Album
- ❌ Cancel individual downloads
- 🧹 Clear finished items from queue
