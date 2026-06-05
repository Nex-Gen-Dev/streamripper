/* ── StreamRipper Frontend ─────────────────────────────────────────────────── */
"use strict";

const API = "";          // same origin
let searchMode  = "audio";
let urlMode     = "audio";
let modalMode   = "audio";
let pendingItem = null;
let pollTimer   = null;

// ── Navigation ───────────────────────────────────────────────────────────────
document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    const panel = document.getElementById("panel-" + btn.dataset.panel);
    if (panel) panel.classList.add("active");
    if (btn.dataset.panel === "queue") renderQueue();
  });
});

// ── Mode Tabs ─────────────────────────────────────────────────────────────────
function bindModeTabs(selector, onSelect) {
  document.querySelectorAll(selector).forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(selector).forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      onSelect(tab.dataset.mode);
    });
  });
}
bindModeTabs("#panel-search .mode-tab",  m => { searchMode = m; });
bindModeTabs("#panel-url .mode-tab",     m => { urlMode    = m; });
bindModeTabs("#panel-queue .mode-tab",   m => {});   // queue doesn't have mode tabs
bindModeTabs("#modal .mode-tab",         m => { modalMode  = m; });

// ── Search ────────────────────────────────────────────────────────────────────
const searchInput   = document.getElementById("search-input");
const searchBtn     = document.getElementById("search-btn");
const resultsGrid   = document.getElementById("search-results");
const searchEmpty   = document.getElementById("search-empty");
const searchLoading = document.getElementById("search-loading");

searchBtn.addEventListener("click", doSearch);
searchInput.addEventListener("keydown", e => { if (e.key === "Enter") doSearch(); });

async function doSearch() {
  const q = searchInput.value.trim();
  if (!q) return;
  resultsGrid.innerHTML = "";
  searchEmpty.style.display  = "none";
  searchLoading.style.display = "flex";
  try {
    const res  = await fetch(`${API}/api/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    searchLoading.style.display = "none";
    if (!data.results || !data.results.length) {
      searchEmpty.style.display = "block";
      return;
    }
    data.results.forEach(item => {
      resultsGrid.appendChild(buildResultCard(item));
    });
  } catch (err) {
    searchLoading.style.display = "none";
    toast("Search failed: " + err.message, "error");
  }
}

function buildResultCard(item) {
  const card = document.createElement("div");
  card.className = "result-card";

  const dur = item.duration ? formatDuration(item.duration) : "";
  const thumb = item.thumbnail
    ? `<img class="result-thumb" src="${item.thumbnail}" alt="" loading="lazy"/>`
    : `<div class="result-thumb-placeholder">♪</div>`;

  card.innerHTML = `
    ${thumb}
    <div class="result-body">
      <div class="result-title">${escHtml(item.title || "Unknown")}</div>
      <div class="result-meta">
        <span>${escHtml(item.uploader || "")}</span>
        ${dur ? `<span>${dur}</span>` : ""}
      </div>
    </div>
    <button class="result-add-btn">+ Add</button>
  `;

  card.querySelector(".result-add-btn").addEventListener("click", e => {
    e.stopPropagation();
    openModal({
      url:    item.url,
      title:  item.title,
      artist: item.uploader || "",
      album:  "",
    });
  });

  card.addEventListener("click", () => {
    openModal({
      url:    item.url,
      title:  item.title,
      artist: item.uploader || "",
      album:  "",
    });
  });

  return card;
}

// ── URL Panel ─────────────────────────────────────────────────────────────────
document.getElementById("url-add-btn").addEventListener("click", async () => {
  const raw    = document.getElementById("url-input").value.trim();
  const artist = document.getElementById("url-artist").value.trim();
  const album  = document.getElementById("url-album").value.trim();
  const urls   = raw.split("\n").map(u => u.trim()).filter(Boolean);

  if (!urls.length) { toast("Paste at least one URL", "error"); return; }

  let added = 0;
  for (const url of urls) {
    await enqueue({ url, artist, album, mode: urlMode, title: url });
    added++;
  }
  toast(`Added ${added} item(s) to queue`, "success");
  document.getElementById("url-input").value = "";
});

// ── Modal ─────────────────────────────────────────────────────────────────────
const modal       = document.getElementById("modal");
const modalTitle  = document.getElementById("modal-title-display");
const modalArtist = document.getElementById("modal-artist");
const modalAlbum  = document.getElementById("modal-album");

function openModal(item) {
  pendingItem = item;
  modalTitle.textContent  = item.title || item.url;
  modalArtist.value       = item.artist || "";
  modalAlbum.value        = item.album  || "";
  modal.style.display     = "flex";

  // reset modal mode tabs
  document.querySelectorAll("#modal .mode-tab").forEach(t => {
    t.classList.toggle("active", t.dataset.mode === "audio");
  });
  modalMode = "audio";
}

document.getElementById("modal-cancel").addEventListener("click",  () => { modal.style.display = "none"; });
modal.addEventListener("click", e => { if (e.target === modal) modal.style.display = "none"; });

document.getElementById("modal-confirm").addEventListener("click", async () => {
  if (!pendingItem) return;
  modal.style.display = "none";
  await enqueue({
    url:    pendingItem.url,
    title:  pendingItem.title,
    artist: modalArtist.value.trim() || pendingItem.artist || "",
    album:  modalAlbum.value.trim(),
    mode:   modalMode,
  });
  toast("Added to queue!", "success");
  switchPanel("queue");
});

// ── Enqueue ───────────────────────────────────────────────────────────────────
async function enqueue(job) {
  try {
    const res  = await fetch(`${API}/api/enqueue`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(job),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    startPolling();
    return data;
  } catch (err) {
    toast("Failed to add: " + err.message, "error");
  }
}

// ── Queue Polling & Rendering ─────────────────────────────────────────────────
function startPolling() {
  if (pollTimer) return;
  pollTimer = setInterval(async () => {
    await refreshQueue();
  }, 800);
}

async function refreshQueue() {
  try {
    const res  = await fetch(`${API}/api/queue`);
    const jobs = await res.json();
    updateStats(jobs);
    updateBadge(jobs);
    // only re-render if queue panel is active
    if (document.getElementById("panel-queue").classList.contains("active")) {
      renderQueueItems(jobs);
    }
    // stop polling if nothing active
    const active = jobs.filter(j => ["queued","downloading","processing","starting"].includes(j.status));
    if (!active.length && pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  } catch {}
}

async function renderQueue() {
  const res  = await fetch(`${API}/api/queue`).catch(() => null);
  if (!res) return;
  const jobs = await res.json();
  renderQueueItems(jobs);
  updateStats(jobs);
  updateBadge(jobs);
}

function renderQueueItems(jobs) {
  const list  = document.getElementById("queue-list");
  const empty = document.getElementById("queue-empty");

  if (!jobs.length) {
    list.innerHTML = "";
    list.appendChild(empty);
    return;
  }

  // Remove empty state
  empty.remove();

  // Update existing items, add new ones, remove gone ones
  const existingIds = new Set([...list.querySelectorAll(".queue-item")].map(el => el.dataset.id));
  const currentIds  = new Set(jobs.map(j => j.id));

  // Remove stale
  list.querySelectorAll(".queue-item").forEach(el => {
    if (!currentIds.has(el.dataset.id)) el.remove();
  });

  // Reverse so newest at top
  const sorted = [...jobs].reverse();

  sorted.forEach(job => {
    const el = list.querySelector(`[data-id="${job.id}"]`);
    if (el) {
      updateQueueItem(el, job);
    } else {
      const newEl = buildQueueItem(job);
      list.prepend(newEl);
    }
  });
}

function buildQueueItem(job) {
  const el = document.createElement("div");
  el.className = `queue-item status-${job.status}`;
  el.dataset.id = job.id;
  el.innerHTML = queueItemHTML(job);
  el.querySelector(".btn-icon")?.addEventListener("click", async () => {
    await fetch(`${API}/api/queue/${job.id}/cancel`, { method: "DELETE" });
    el.querySelector(".btn-icon").disabled = true;
  });
  return el;
}

function updateQueueItem(el, job) {
  el.className = `queue-item status-${job.status}`;
  el.innerHTML = queueItemHTML(job);
  el.querySelector(".btn-icon")?.addEventListener("click", async () => {
    await fetch(`${API}/api/queue/${job.id}/cancel`, { method: "DELETE" });
  });
}

function queueItemHTML(job) {
  const barClass  = job.status === "done" ? "done" : job.status === "failed" ? "failed" : "";
  const chipClass = `chip-${job.status}`;
  const pct       = job.progress || 0;
  const meta      = [
    job.platform ? `<span class="qi-platform">${escHtml(job.platform)}</span>` : "",
    job.mode     ? `<span>${job.mode === "video" ? "🎬 MP4" : "🎵 MP3"}</span>` : "",
    job.artist   ? `<span>${escHtml(job.artist)}</span>` : "",
    job.status === "downloading" && job.speed ? `<span>${escHtml(job.speed)}</span>` : "",
    job.status === "downloading" && job.eta   ? `<span>ETA ${escHtml(job.eta)}</span>` : "",
    job.status === "failed" && job.error      ? `<span style="color:var(--danger)">${escHtml(job.error.slice(0,60))}</span>` : "",
  ].filter(Boolean).join("");

  return `
    <div>
      <div class="qi-title">${escHtml(job.title || job.url)}</div>
      <div class="qi-meta">${meta}</div>
      ${job.status !== "queued" ? `<div class="progress-bar-wrap"><div class="progress-bar ${barClass}" style="width:${pct}%"></div></div>` : ""}
    </div>
    <div style="display:flex;align-items:center;gap:0.5rem">
      <span class="status-chip ${chipClass}">${job.status}</span>
      ${["done","failed","cancelled"].includes(job.status) ? "" : `<button class="btn-icon" title="Cancel">✕</button>`}
    </div>
  `;
}

// ── Clear Done ────────────────────────────────────────────────────────────────
document.getElementById("clear-done-btn").addEventListener("click", async () => {
  await fetch(`${API}/api/queue/clear`, { method: "DELETE" });
  await renderQueue();
  toast("Cleared finished downloads");
});

// ── Stats ─────────────────────────────────────────────────────────────────────
function updateStats(jobs) {
  document.getElementById("stat-done").textContent    = jobs.filter(j => j.status === "done").length;
  document.getElementById("stat-failed").textContent  = jobs.filter(j => j.status === "failed").length;
  document.getElementById("stat-pending").textContent = jobs.filter(j => ["queued","downloading","processing","starting"].includes(j.status)).length;
}
function updateBadge(jobs) {
  const n = jobs.filter(j => ["queued","downloading","processing","starting"].includes(j.status)).length;
  document.getElementById("badge-queue").textContent = n;
}

// ── Downloads path ────────────────────────────────────────────────────────────
async function loadDownloadsPath() {
  try {
    const res  = await fetch(`${API}/api/downloads-path`);
    const data = await res.json();
    document.getElementById("dl-path-text").textContent    = data.path;
    document.getElementById("settings-path").textContent   = data.path;
  } catch {}
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function switchPanel(name) {
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.panel === name));
  document.querySelectorAll(".panel").forEach(p => p.classList.toggle("active", p.id === "panel-" + name));
  if (name === "queue") renderQueue();
}

function toast(msg, type = "info") {
  const wrap = document.getElementById("toast-wrap");
  const el   = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

function escHtml(str) {
  return String(str ?? "")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function formatDuration(secs) {
  if (!secs) return "";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2,"0")}`;
}

// ── Init ──────────────────────────────────────────────────────────────────────
(async () => {
  await loadDownloadsPath();
  await renderQueue();
  searchEmpty.style.display = "block";
  startPolling();
})();
