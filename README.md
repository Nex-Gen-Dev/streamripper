# StreamRipper v1.0

> Download YouTube · YouTube Music · Instagram · TikTok — bulk, metadata, beautiful UI, cross-platform.

---

## 📁 Complete File Structure

```
streamripper/
├── .github/workflows/build.yml        ← GitHub Actions: Windows + macOS + Linux + Android APK
├── backend/
│   ├── app.py                         ← Flask server (auth, queue, strict MP3/MP4, analytics)
│   └── updater.py                     ← Auto-update checker (GitHub Releases)
├── frontend/
│   ├── templates/index.html           ← Full UI: login, onboarding, search, queue, logs, legal
│   └── static/
│       ├── css/app.css                ← Cinematic dark tech design
│       └── js/app.js                  ← Live polling, auth, ads, updater
├── android/                           ← React Native Android app
│   ├── App.js                         ← Root navigator
│   ├── package.json
│   ├── babel.config.js
│   ├── metro.config.js
│   ├── android/
│   │   ├── build.gradle
│   │   └── app/
│   │       ├── build.gradle
│   │       └── src/main/
│   │           ├── AndroidManifest.xml
│   │           └── res/values/styles.xml
│   └── src/
│       ├── screens/
│       │   ├── LoginScreen.js
│       │   ├── SearchScreen.js
│       │   ├── QueueScreen.js
│       │   ├── AddUrlScreen.js
│       │   ├── SettingsScreen.js
│       │   ├── PrivacyScreen.js
│       │   └── TermsScreen.js
│       └── services/store.js          ← Zustand global state
├── cloudflare/
│   ├── worker/
│   │   ├── index.js                   ← Cloudflare Worker: auth, analytics, ads API
│   │   └── wrangler.toml              ← Worker deploy config
│   └── dashboard/
│       ├── index.html                 ← Admin dashboard (Cloudflare Pages)
│       ├── _redirects                 ← Pages routing
│       └── _headers                   ← Security headers
├── scripts/bump_version.py            ← Version bump helper
├── requirements.txt
├── streamripper.spec                  ← PyInstaller bundle config
└── README.md
```

---

## 🚀 STEP 1 — GitHub Setup (Build All Apps)

### 1.1 Create Repository
1. Go to **github.com** → sign in → click **+** → **New repository**
2. Name: `streamripper` · Set to **Public** · Click **Create repository**

### 1.2 Upload All Files
**Option A — Web upload (easiest):**
1. In your repo click **Add file → Upload files**
2. Drag ALL folders/files keeping exact structure above
3. Click **Commit changes**

**Option B — Git CLI:**
```bash
git init && git add .
git commit -m "v1.0.0 initial"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/streamripper.git
git push -u origin main
```

### 1.3 Watch Builds
1. Click **Actions** tab → **Build StreamRipper**
2. Four builds run in parallel (~8 min each):
   - ✅ `StreamRipper-Windows.exe`
   - ✅ `StreamRipper-macOS.dmg`
   - ✅ `StreamRipper-Linux.AppImage`
   - ✅ `StreamRipper-Android.apk`

### 1.4 Create a Release (for download links)
1. Click **Releases** → **Create a new release**
2. Tag: `v1.0.0` → **Publish release**
3. GitHub Actions attaches all 4 build files automatically

---

## ☁️ STEP 2 — Cloudflare Worker (Auth + Analytics + Ads)

> This powers login, user tracking, and the admin dashboard.

### 2.1 Create Cloudflare Account
Go to **cloudflare.com** → sign up (free)

### 2.2 Install Wrangler CLI
```bash
npm install -g wrangler
wrangler login
```

### 2.3 Create 3 KV Namespaces
```bash
wrangler kv:namespace create "SR_USERS"
wrangler kv:namespace create "SR_EVENTS"
wrangler kv:namespace create "SR_ADS"
```
Copy the 3 IDs printed and paste them into `cloudflare/worker/wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "SR_USERS"
id      = "PASTE_ID_HERE"
```

### 2.4 Edit Worker Config
Open `cloudflare/worker/index.js` and change line 4:
```js
const ADMIN_EMAIL = "your@email.com";
```

### 2.5 Deploy Worker
```bash
cd cloudflare/worker
wrangler deploy
```
Copy the Worker URL printed (e.g. `https://streamripper-worker.xxxx.workers.dev`)

### 2.6 Set Admin Token
```bash
curl -X POST https://streamripper-worker.xxxx.workers.dev/api/admin/setup \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: " \
  -d '{"token":"CHOOSE_A_SECRET_ADMIN_TOKEN"}'
```
Save that token — you'll use it to log into the dashboard.

### 2.7 Connect Worker URL to Desktop App
Open `backend/app.py` line ~20:
```python
CF_WORKER_URL = "https://streamripper-worker.YOUR_SUBDOMAIN.workers.dev"
```
Replace with your actual Worker URL.

---

## 📊 STEP 3 — Deploy Admin Dashboard (Cloudflare Pages)

### 3.1 In Cloudflare Dashboard
1. Go to **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Select your `streamripper` GitHub repo
3. Set:
   - **Build output directory:** `cloudflare/dashboard`
   - **Build command:** *(leave empty)*
4. Click **Save and Deploy**

### 3.2 Update Dashboard Worker URL
Open `cloudflare/dashboard/index.html` line ~210:
```js
const WORKER = "https://streamripper-worker.YOUR_SUBDOMAIN.workers.dev";
```
Replace with your Worker URL, commit and push — Pages redeploys automatically.

### 3.3 Access Dashboard
Go to your Pages URL (e.g. `https://streamripper-dash.pages.dev`)
Enter your admin token to log in.

**Dashboard Features:**
- 📈 Live stats: users, downloads, logins, searches, unique IPs, OS breakdown
- 👥 Users table: email, IP, OS, join date, last seen, login count, downloads
- 🚫 Ban any user with one click
- 📋 Full event log with filters (login / register / download / search)
- 📢 **Ad Builder**: create banner or popup ads, target by OS, set expiry
- 🔴 Broadcast ads to all users instantly — they see it within 60 seconds

---

## 📱 STEP 4 — Android App

The APK is built automatically by GitHub Actions. But if you want to run locally:

### Prerequisites
- Node.js 20+
- Android Studio + Android SDK
- Java 17

### Run on Emulator
```bash
cd android
npm install
npx react-native run-android
```

### Connect to Desktop App
The Android app sends downloads to your desktop's StreamRipper instance.
In `android/src/screens/SearchScreen.js` change:
```js
const API = 'http://10.0.2.2:7474';  // emulator
// OR for a real phone on the same WiFi:
const API = 'http://192.168.1.XXX:7474';  // your PC's local IP
```

---

## 🖥️ STEP 5 — Run the Desktop App

### Windows
Double-click `StreamRipper-Windows.exe`
Windows may show a security warning → **More info → Run anyway**

### macOS
Open `StreamRipper-macOS.dmg` → drag to Applications
Right-click → **Open** first time (bypasses Gatekeeper)

### Linux / ChromeOS
```bash
chmod +x StreamRipper-Linux.AppImage
./StreamRipper-Linux.AppImage
```
ChromeOS: enable Linux environment in Settings first.

**Browser opens automatically** at `http://127.0.0.1:7474`
Python is fully bundled — no installation required.

---

## 🔄 STEP 6 — Releasing Updates

Every time you want to push an update that auto-appears in all users' apps:

```bash
# 1. Bump version
python scripts/bump_version.py 1.2.0

# 2. Commit and push
git add .
git commit -m "v1.2.0 — describe changes"
git push

# 3. Create GitHub Release with tag v1.2.0
# GitHub Actions builds all 4 files and attaches them
# Users see the green update banner within 30 minutes
```

---

## ✅ Features Summary

| Feature | Desktop | Android |
|---------|---------|---------|
| YouTube download | ✅ | ✅ |
| YouTube Music | ✅ | ✅ |
| Instagram | ✅ | ✅ |
| TikTok | ✅ | ✅ |
| MP3 only mode (strict) | ✅ | ✅ |
| MP4 only mode (strict) | ✅ | ✅ |
| Bulk queue | ✅ | ✅ |
| Metadata embedding | ✅ | ✅ |
| Live progress (1s polling) | ✅ | ✅ |
| Login / Register | ✅ | ✅ |
| Auto-updater | ✅ | via APK |
| Cloudflare analytics | ✅ | ✅ |
| Admin dashboard | Cloudflare Pages | — |
| Ad/popup broadcasts | ✅ receiver | ✅ receiver |
| Privacy Policy | ✅ | ✅ |
| Terms of Service | ✅ | ✅ |
| Cloudflare bypass | ✅ | via desktop |

---

## ⚙️ Things You Must Customize

| File | What to change |
|------|---------------|
| `backend/app.py` line ~20 | Your Cloudflare Worker URL |
| `backend/updater.py` line ~12 | Your GitHub username |
| `cloudflare/worker/index.js` line 4 | Your admin email |
| `cloudflare/worker/wrangler.toml` | Your 3 KV namespace IDs |
| `cloudflare/dashboard/index.html` line ~210 | Your Worker URL |
| `android/src/screens/SearchScreen.js` | Your PC's local IP for real device |
| `android/src/services/store.js` line ~5 | Your Worker URL |
