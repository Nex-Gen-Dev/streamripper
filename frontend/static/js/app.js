"use strict";

/* ══ CANVAS VISUALIZER ═══════════════════════════════════════════════════ */
(function(){
  const c=document.getElementById("vizCanvas"); if(!c)return;
  const ctx=c.getContext("2d"); let W,H,bars=[];
  function resize(){W=c.width=window.innerWidth;H=c.height=window.innerHeight;}
  window.addEventListener("resize",resize); resize();
  for(let i=0;i<80;i++) bars.push({h:Math.random()*H*0.3+H*0.05,speed:0.3+Math.random()*0.7,dir:1,hue:i%2===0?185:330});
  function draw(){
    ctx.clearRect(0,0,W,H);
    bars.forEach((b,i)=>{
      b.h+=b.speed*b.dir; if(b.h>H*0.4||b.h<H*0.03)b.dir*=-1;
      ctx.fillStyle=`hsla(${b.hue},100%,60%,${0.1+(b.h/(H*0.4))*0.2})`;
      ctx.fillRect((W/80)*i,H-b.h,(W/80)-2,b.h);
    });
    requestAnimationFrame(draw);
  } draw();
})();

/* ══ TYPING EFFECT ════════════════════════════════════════════════════════ */
(function(){
  const el=document.getElementById("mockType"); if(!el)return;
  const phrases=["The Weeknd","Drake After Hours","Bad Bunny","Kendrick Lamar"];
  let pi=0,ci=0,del=false;
  function t(){
    const p=phrases[pi];
    if(!del){el.textContent=p.slice(0,++ci);if(ci===p.length){del=true;setTimeout(t,1800);return;}}
    else{el.textContent=p.slice(0,--ci);if(ci===0){del=false;pi=(pi+1)%phrases.length;setTimeout(t,400);return;}}
    setTimeout(t,del?60:100);
  } t();
})();

/* ══ STATE ════════════════════════════════════════════════════════════════ */
let authToken   = localStorage.getItem("sr_token") || "";
let currentUser = JSON.parse(localStorage.getItem("sr_user") || "null");
let searchMode  = "audio";
let urlMode     = "audio";
let modalMode   = "audio";
let pendingItem = null;
let pollTimer   = null;
let adPollTimer = null;
let lastJobStates = {};
let obStep      = 0;
let authMode    = "login";

/* ══ BOOT ════════════════════════════════════════════════════════════════ */
window.addEventListener("DOMContentLoaded", () => {
  if (authToken && currentUser) {
    showApp();
  } else {
    document.getElementById("login-screen").classList.remove("hidden");
  }
});

/* ══ AUTH ════════════════════════════════════════════════════════════════ */
function switchAuthTab(mode) {
  authMode = mode;
  document.getElementById("tab-login").classList.toggle("active", mode==="login");
  document.getElementById("tab-register").classList.toggle("active", mode==="register");
  document.getElementById("auth-name-wrap").style.display = mode==="register" ? "block" : "none";
  document.getElementById("auth-btn-txt").textContent = mode==="login" ? "SIGN IN" : "CREATE ACCOUNT";
  document.getElementById("auth-error").classList.add("hidden");
}

async function doAuth() {
  const email = document.getElementById("auth-email").value.trim().toLowerCase();
  const pw    = document.getElementById("auth-password").value;
  const name  = document.getElementById("auth-name")?.value.trim() || "";
  const errEl = document.getElementById("auth-error");
  errEl.classList.add("hidden");

  if (!email || !pw) { errEl.textContent="Email and password required"; errEl.classList.remove("hidden"); return; }

  // Hash password in browser before sending
  const pwHash = await sha256(pw);
  const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
  const body = { email, password: pwHash, os: getOS() };
  if (authMode === "register") body.name = name;

  try {
    const res  = await fetch(endpoint, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body) });
    const data = await res.json();
    if (data.error) { errEl.textContent = data.error; errEl.classList.remove("hidden"); return; }
    authToken   = data.token;
    currentUser = { email: data.email, name: data.name || name };
    localStorage.setItem("sr_token", authToken);
    localStorage.setItem("sr_user",  JSON.stringify(currentUser));
    showApp();
  } catch(e) {
    errEl.textContent = "Connection error — is the app running?";
    errEl.classList.remove("hidden");
  }
}

async function doLogout() {
  await fetch("/api/auth/logout", { method:"POST", headers:{"X-Auth-Token":authToken} }).catch(()=>{});
  authToken = ""; currentUser = null;
  localStorage.removeItem("sr_token");
  localStorage.removeItem("sr_user");
  clearInterval(pollTimer); clearInterval(adPollTimer);
  document.getElementById("app").classList.add("hidden");
  document.getElementById("login-screen").classList.remove("hidden");
}

async function sha256(msg) {
  const buf  = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

function getOS() {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua))  return "Android";
  if (/iPhone|iPad/i.test(ua)) return "iOS";
  if (/Win/i.test(ua))      return "Windows";
  if (/Mac/i.test(ua))      return "macOS";
  if (/Linux/i.test(ua))    return "Linux";
  return "Unknown";
}

/* ══ SHOW APP ════════════════════════════════════════════════════════════ */
function showApp() {
  document.getElementById("login-screen").classList.add("hidden");
  // First time? Show onboarding
  if (!localStorage.getItem("sr_ob_done")) {
    document.getElementById("onboarding").classList.remove("hidden");
    initOnboarding();
  } else {
    launchApp();
  }
}

/* ══ ONBOARDING ══════════════════════════════════════════════════════════ */
function initOnboarding() {
  document.getElementById("obNext").addEventListener("click", () => {
    if (obStep < 2) { obStep++; showObStep(obStep); }
    else launchApp();
  });
  document.getElementById("obSkip").addEventListener("click", launchApp);
  document.querySelectorAll(".ob-dot").forEach(d => d.addEventListener("click", () => { obStep=+d.dataset.dot; showObStep(obStep); }));
}
function showObStep(n) {
  document.querySelectorAll(".ob-step").forEach((s,i) => s.classList.toggle("active",i===n));
  document.querySelectorAll(".ob-dot").forEach((d,i) => d.classList.toggle("active",i===n));
  document.getElementById("obNext").innerHTML = n===2 ? "Launch ▶" : "Next →";
}
function launchApp() {
  localStorage.setItem("sr_ob_done","1");
  document.getElementById("onboarding").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  // Update user display
  if (currentUser) {
    document.getElementById("user-name-display").textContent = currentUser.name || currentUser.email;
    document.getElementById("settings-account-info").textContent = `Signed in as ${currentUser.email}`;
  }
  loadDownloadsPath();
  renderQueue();
  startPolling();
  startAdPolling();
  checkUpdate();
}

/* ══ NAVIGATION ══════════════════════════════════════════════════════════ */
function switchPanel(name) {
  document.querySelectorAll(".tnav").forEach(b => b.classList.toggle("active", b.dataset.panel===name));
  document.querySelectorAll(".panel").forEach(p => p.classList.toggle("active", p.id==="panel-"+name));
  if (name==="queue") renderQueue();
}
document.querySelectorAll(".tnav").forEach(b => b.addEventListener("click", () => switchPanel(b.dataset.panel)));

/* ══ MODE PILLS ══════════════════════════════════════════════════════════ */
function bindPills(ids, setter) {
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("click", () => {
      ids.forEach(oid => document.getElementById(oid)?.classList.remove("active"));
      el.classList.add("active");
      setter(el.dataset.mode);
    });
  });
}
bindPills(["sm-audio","sm-video"], m => searchMode = m);
bindPills(["um-audio","um-video"], m => urlMode    = m);
bindPills(["mm-audio","mm-video"], m => modalMode  = m);

/* ══ SEARCH ══════════════════════════════════════════════════════════════ */
document.getElementById("search-btn")?.addEventListener("click", doSearch);
document.getElementById("search-input")?.addEventListener("keydown", e => { if(e.key==="Enter") doSearch(); });

async function doSearch() {
  const q = document.getElementById("search-input").value.trim();
  if (!q) return;
  document.getElementById("search-results").innerHTML = "";
  document.getElementById("search-empty").classList.add("hidden");
  document.getElementById("search-loading").classList.remove("hidden");
  addLog(`Searching: "${q}"`, "info");
  try {
    const res  = await fetch(`/api/search?q=${encodeURIComponent(q)}`, headers());
    const data = await res.json();
    document.getElementById("search-loading").classList.add("hidden");
    if (!data.results?.length) { document.getElementById("search-empty").classList.remove("hidden"); return; }
    addLog(`Found ${data.results.length} results`, "info");
    data.results.forEach(item => document.getElementById("search-results").appendChild(buildResultCard(item)));
  } catch(e) {
    document.getElementById("search-loading").classList.add("hidden");
    document.getElementById("search-empty").classList.remove("hidden");
    addLog("Search error: "+e.message, "error");
  }
}

function buildResultCard(item) {
  const card = document.createElement("div");
  card.className = "result-card";
  const dur = item.duration ? fmt(item.duration) : "";
  card.innerHTML = `
    ${item.thumbnail ? `<img class="rc-thumb" src="${item.thumbnail}" alt="" loading="lazy"/>` : `<div class="rc-thumb-ph">♪</div>`}
    <div class="rc-overlay">+ ADD</div>
    <div class="rc-body">
      <div class="rc-title">${esc(item.title||"")}</div>
      <div class="rc-meta"><span>${esc(item.uploader||"")}</span>${dur?`<span>${dur}</span>`:""}</div>
    </div>
    <button class="rc-add">+</button>`;
  const open = () => openModal({ url:item.url, title:item.title, artist:item.uploader||"", album:"" });
  card.querySelector(".rc-add").addEventListener("click", e => { e.stopPropagation(); open(); });
  card.addEventListener("click", open);
  return card;
}

/* ══ URL PANEL ═══════════════════════════════════════════════════════════ */
document.getElementById("url-add-btn")?.addEventListener("click", async () => {
  const raw    = document.getElementById("url-input").value.trim();
  const artist = document.getElementById("url-artist").value.trim();
  const album  = document.getElementById("url-album").value.trim();
  const urls   = raw.split("\n").map(u=>u.trim()).filter(Boolean);
  if (!urls.length) { toast("Paste at least one URL","error"); return; }
  for (const url of urls) await enqueue({ url, artist, album, mode:urlMode, title:url });
  toast(`Added ${urls.length} item(s) to queue`,"success");
  document.getElementById("url-input").value = "";
  switchPanel("queue");
});

/* ══ MODAL ═══════════════════════════════════════════════════════════════ */
const modal = document.getElementById("modal");
function openModal(item) {
  pendingItem = item;
  document.getElementById("modal-title-display").textContent = item.title || item.url;
  document.getElementById("modal-artist").value = item.artist || "";
  document.getElementById("modal-album").value  = item.album  || "";
  modal.classList.remove("hidden");
  ["mm-audio","mm-video"].forEach(id => document.getElementById(id)?.classList.toggle("active", id==="mm-audio"));
  modalMode = "audio";
}
document.getElementById("modal-cancel")?.addEventListener("click", () => modal.classList.add("hidden"));
modal?.addEventListener("click", e => { if(e.target===modal) modal.classList.add("hidden"); });
document.getElementById("modal-confirm")?.addEventListener("click", async () => {
  if (!pendingItem) return;
  modal.classList.add("hidden");
  await enqueue({ url:pendingItem.url, title:pendingItem.title,
    artist:document.getElementById("modal-artist").value.trim() || pendingItem.artist || "",
    album: document.getElementById("modal-album").value.trim(),
    mode:  modalMode,
  });
  toast("Added to queue!","success");
  switchPanel("queue");
});

/* ══ ENQUEUE ═════════════════════════════════════════════════════════════ */
async function enqueue(job) {
  try {
    const res  = await fetch("/api/enqueue", { method:"POST", ...headers(), body:JSON.stringify(job) });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    addLog(`Queued: ${job.title||job.url} [${job.mode==="video"?"MP4":"MP3"}]`, "start");
    startPolling();
    return data;
  } catch(e) { toast("Enqueue failed: "+e.message,"error"); }
}

/* ══ LIVE POLLING (every 1s) ═════════════════════════════════════════════ */
function startPolling() {
  if (pollTimer) return;
  pollTimer = setInterval(async () => {
    const res  = await fetch("/api/queue", headers()).catch(()=>null);
    if (!res) return;
    const jobs = await res.json();
    updateStats(jobs); updateBadge(jobs);
    jobs.forEach(j => {
      if (lastJobStates[j.id] !== j.status) {
        if (j.status==="downloading") addLog(`↓ Downloading: ${j.title||j.url}`, "download");
        if (j.status==="done")        addLog(`✓ Done: ${j.title||j.url}`, "done");
        if (j.status==="failed")      addLog(`✕ Failed: ${j.title||j.url} — ${j.error||""}`, "error");
        lastJobStates[j.id] = j.status;
      }
    });
    if (document.getElementById("panel-queue").classList.contains("active")) renderQueueItems(jobs);
    const active = jobs.filter(j=>["queued","downloading","processing","starting"].includes(j.status));
    if (!active.length) { clearInterval(pollTimer); pollTimer=null; }
  }, 1000);
}

async function renderQueue() {
  const res  = await fetch("/api/queue", headers()).catch(()=>null);
  if (!res) return;
  const jobs = await res.json();
  renderQueueItems(jobs); updateStats(jobs); updateBadge(jobs);
}

function renderQueueItems(jobs) {
  const list = document.getElementById("queue-list");
  const empty = document.getElementById("queue-empty");
  if (!jobs.length) { list.innerHTML=""; list.appendChild(empty); return; }
  empty.remove?.();
  const cur = new Set(jobs.map(j=>j.id));
  list.querySelectorAll(".q-item").forEach(el=>{ if(!cur.has(el.dataset.id)) el.remove(); });
  [...jobs].reverse().forEach(job => {
    const ex = list.querySelector(`[data-id="${job.id}"]`);
    if (ex) updateQItem(ex,job); else { const el=buildQItem(job); list.prepend(el); }
  });
}

function buildQItem(job) {
  const el = document.createElement("div");
  el.dataset.id = job.id; el.className = `q-item s-${job.status}`;
  el.innerHTML = qHTML(job);
  el.querySelector(".q-cancel")?.addEventListener("click", async () => {
    await fetch(`/api/queue/${job.id}/cancel`, { method:"DELETE", ...headers() });
  });
  return el;
}
function updateQItem(el,job) {
  el.className = `q-item s-${job.status}`; el.innerHTML = qHTML(job);
  el.querySelector(".q-cancel")?.addEventListener("click", async () => {
    await fetch(`/api/queue/${job.id}/cancel`, { method:"DELETE", ...headers() });
  });
}
function qHTML(job) {
  const pct=job.progress||0, plat=(job.platform||"").toLowerCase().replace(" ","");
  const platC=["yt","ytm","ig","tt"].includes(plat)?plat:"";
  const barC=job.status==="done"?"done":job.status==="failed"?"fail":"";
  const meta=[
    `<span class="qi-platform ${platC}">${esc(job.platform||"")}</span>`,
    `<span>${job.mode==="video"?"🎬 MP4 only":"🎵 MP3 only"}</span>`,
    job.artist?`<span>${esc(job.artist)}</span>`:"",
    job.album ?`<span>${esc(job.album)}</span>`:"",
    job.status==="downloading"&&job.speed?`<span>${esc(job.speed)}</span>`:"",
    job.status==="downloading"&&job.eta  ?`<span>ETA ${esc(job.eta)}</span>`:"",
    job.status==="failed"&&job.error     ?`<span style="color:var(--red)">${esc(job.error.slice(0,55))}</span>`:"",
  ].filter(Boolean).join("");
  const showProg = !["queued","cancelled"].includes(job.status);
  const showCancel = !["done","failed","cancelled"].includes(job.status);
  return `
    <div>
      <div class="qi-title">${esc(job.title||job.url)}</div>
      <div class="qi-meta">${meta}</div>
      ${showProg?`<div class="prog-wrap"><div class="prog-bar ${barC}" style="width:${pct}%"></div></div>`:""}
    </div>
    <div class="q-actions">
      <span class="chip chip-${job.status}">${job.status}</span>
      ${showCancel?`<button class="q-cancel" title="Cancel">✕</button>`:""}
    </div>`;
}

document.getElementById("clear-done-btn")?.addEventListener("click", async () => {
  await fetch("/api/queue/clear", { method:"DELETE", ...headers() });
  await renderQueue(); toast("Cleared finished items");
});

/* ══ STATS / BADGE ═══════════════════════════════════════════════════════ */
function updateStats(jobs) {
  document.getElementById("ts-done").textContent   = jobs.filter(j=>j.status==="done").length;
  document.getElementById("ts-active").textContent = jobs.filter(j=>["downloading","processing","starting"].includes(j.status)).length;
  document.getElementById("ts-fail").textContent   = jobs.filter(j=>j.status==="failed").length;
}
function updateBadge(jobs) {
  document.getElementById("badge-queue").textContent =
    jobs.filter(j=>["queued","downloading","processing","starting"].includes(j.status)).length;
}

/* ══ LOGS ════════════════════════════════════════════════════════════════ */
function addLog(msg, type="info") {
  const t = document.getElementById("log-terminal"); if(!t) return;
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`;
  const el = document.createElement("div");
  el.className = `log-line ${type}`; el.dataset.time = time; el.textContent = msg;
  t.appendChild(el); t.scrollTop = t.scrollHeight;
}
document.getElementById("clear-logs-btn")?.addEventListener("click", () => {
  document.getElementById("log-terminal").innerHTML="";
  addLog("Logs cleared","system");
});

/* ══ ADS POLLING (every 60s) ═════════════════════════════════════════════ */
function startAdPolling() {
  checkAd();
  adPollTimer = setInterval(checkAd, 60000);
}
async function checkAd() {
  try {
    const res  = await fetch("/api/ads/current", headers());
    const data = await res.json();
    const ad   = data.ad;
    if (!ad) return;
    // Filter by targetOs
    const os = getOS();
    if (ad.targetOs && ad.targetOs !== "all" && ad.targetOs !== os) return;
    if (ad.type === "banner") showBanner(ad);
    else showPopup(ad);
  } catch {}
}
function showBanner(ad) {
  const b = document.getElementById("ad-banner"); if(!b) return;
  b.style.borderLeftColor = ad.bgColor || "var(--cyan)";
  document.getElementById("ad-banner-title").textContent = ad.title || "";
  document.getElementById("ad-banner-msg").textContent   = ad.message || "";
  const cta = document.getElementById("ad-banner-cta");
  if (ad.cta) { cta.textContent=ad.cta; cta.href=ad.ctaUrl||"#"; cta.style.display="inline"; }
  else cta.style.display="none";
  b.classList.remove("hidden");
}
function showPopup(ad) {
  const pop = document.getElementById("ad-popup"); if(!pop) return;
  document.getElementById("ad-popup-inner").innerHTML = `
    <h3 style="font-family:var(--fhead);font-size:1.1rem;color:${ad.bgColor||'var(--cyan)'};margin-bottom:0.75rem">${esc(ad.title||"")}</h3>
    <p style="font-family:var(--fmono);font-size:0.85rem;color:var(--text2);margin-bottom:1rem">${esc(ad.message||"")}</p>
    ${ad.cta?`<a href="${esc(ad.ctaUrl||'#')}" target="_blank" style="display:inline-block;background:${ad.bgColor||'var(--cyan)'};color:#000;font-family:var(--fhead);font-weight:700;font-size:0.75rem;padding:0.7rem 1.5rem;border-radius:7px;text-decoration:none;letter-spacing:0.08em">${esc(ad.cta)}</a>`:""}`;
  pop.classList.remove("hidden");
}

/* ══ AUTO-UPDATER ════════════════════════════════════════════════════════ */
let updateDismissed = false;
let updatePoll = null;
async function checkUpdate() {
  try {
    const res  = await fetch("/api/update/status", headers());
    const data = await res.json();
    handleUpdateState(data);
  } catch {}
}
function handleUpdateState(data) {
  if (updateDismissed) return;
  const { status, progress, info, current } = data;
  if (status==="available"&&info) {
    document.getElementById("update-banner").classList.remove("hidden");
    document.getElementById("ub-version").textContent = `v${current} → v${info.version}`;
    addLog(`Update available: v${info.version}`, "info");
  }
  if (status==="downloading") {
    document.getElementById("update-banner").classList.remove("hidden");
    document.getElementById("ub-progress-wrap").classList.remove("hidden");
    document.getElementById("ub-install-btn").disabled=true;
    document.getElementById("ub-install-btn").textContent="Downloading…";
    document.getElementById("ub-bar").style.width=progress+"%";
    document.getElementById("ub-pct").textContent=progress+"%";
    if (!updatePoll) updatePoll = setInterval(checkUpdate, 1000);
  }
  if (status==="done") { clearInterval(updatePoll); toast("Update downloaded — installer launched!","success"); }
}
document.getElementById("ub-install-btn")?.addEventListener("click", async () => {
  document.getElementById("ub-install-btn").disabled=true;
  await fetch("/api/update/install",{method:"POST",...headers()});
  updatePoll = setInterval(checkUpdate, 800);
});
document.getElementById("ub-dismiss")?.addEventListener("click", () => {
  updateDismissed=true;
  document.getElementById("update-banner").classList.add("hidden");
});
setTimeout(checkUpdate,3000);
setInterval(checkUpdate,30*60*1000);

/* ══ DOWNLOADS PATH ══════════════════════════════════════════════════════ */
async function loadDownloadsPath() {
  try {
    const res  = await fetch("/api/downloads-path", headers());
    const data = await res.json();
    const el   = document.getElementById("settings-path");
    if (el) el.textContent = data.path;
    addLog(`Downloads folder: ${data.path}`, "system");
  } catch {}
}

/* ══ HELPERS ═════════════════════════════════════════════════════════════ */
function headers(extra={}) {
  return { headers:{"Content-Type":"application/json","X-Auth-Token":authToken}, ...extra };
}
function toast(msg,type="info") {
  const wrap=document.getElementById("toasts");
  const el=document.createElement("div"); el.className=`toast ${type}`; el.textContent=msg;
  wrap.appendChild(el); setTimeout(()=>el.remove(),4000);
}
function addLog(msg,type="info") {
  const t=document.getElementById("log-terminal"); if(!t) return;
  const now=new Date();
  const time=`${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`;
  const el=document.createElement("div"); el.className=`log-line ${type}`; el.dataset.time=time; el.textContent=msg;
  t.appendChild(el); t.scrollTop=t.scrollHeight;
}
function esc(s){return String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function fmt(s){const m=Math.floor(s/60),sec=Math.floor(s%60);return `${m}:${String(sec).padStart(2,"0")}`;}
