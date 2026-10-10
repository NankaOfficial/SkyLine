const GAMES_URL = 'https://raw.githubusercontent.com/NankaOfficial/SkyLine/refs/heads/main/Games.json';
const RANK = { none: 0, vip: 1, mod: 2, admin: 3, headadmin: 4, owner: 5 };

// ===== helpers =====
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ls = {
  get(k, f) { try { const v = localStorage.getItem(k); return v === null ? f : v; } catch (e) { return f; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} }
};
function showNotice(msg, type) {
  const s = $('toastStack'); if (!s) return;
  const t = document.createElement('div'); t.className = 'toast ' + (type || 'info');
  t.innerHTML = '<div>' + esc(msg) + '</div>'; s.appendChild(t); setTimeout(() => t.remove(), 4000);
}
const ago = t => { if (!t) return 'never'; const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : m < 60 ? m + 'm ago' : m < 1440 ? Math.round(m / 60) + 'h ago' : Math.round(m / 1440) + 'd ago'; };
const nameKey = n => n.toLowerCase().replace(/[.#$\/\[\]]/g, '_');

// ===== firebase =====
let db = null, TS = null;
try {
  firebase.initializeApp({ databaseURL: 'https://skylinev2-d710d-default-rtdb.firebaseio.com', projectId: 'skylinev2-d710d' });
  db = firebase.database(); TS = firebase.database.ServerValue.TIMESTAMP;
} catch (e) { console.error('Firebase failed:', e); }
let unsubs = [], dmOff = null;
function listen(ref, fn) { if (!ref) return; ref.on('value', fn); unsubs.push(() => ref.off('value', fn)); }

// ===== identity / roles =====
let currentUser = ls.get('skyline_username', '');
let codeVal = ls.get('skyline_owner_key', '');
let dbRole = 'none';
let vid = ls.get('skyline_vid', '');
if (!vid) { vid = Math.random().toString(36).slice(2, 12) + Date.now().toString(36); ls.set('skyline_vid', vid); }
function getUserRole() {
  const v = codeVal.trim();
  const c = v === 'ownerkey' ? 'owner' : v === 'ownerkeys' ? 'admin' : 'none';
  return RANK[c] >= RANK[dbRole] ? c : dbRole;
}
const rank = () => RANK[getUserRole()] || 0;
const isOwner = () => rank() >= 5, isAdmin = () => rank() >= 3;
const badge = r => r && r !== 'none' ? ' <span class="badge ' + esc(r) + '-badge">' + esc(r) + '</span>' : '';

async function sha(s) {
  try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('skyline-v2|' + s)); return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('').slice(0, 32); }
  catch (e) { let h = 5381; for (const c of s) h = ((h << 5) + h + c.charCodeAt(0)) | 0; return 'x' + (h >>> 0).toString(16); }
}
async function getFp() {
  let gl = '';
  try { const g = document.createElement('canvas').getContext('webgl'); const e = g && g.getExtension('WEBGL_debug_renderer_info'); if (e) gl = g.getParameter(e.UNMASKED_RENDERER_WEBGL); } catch (e) {}
  return sha([Math.max(screen.width, screen.height), Math.min(screen.width, screen.height), screen.colorDepth, devicePixelRatio, navigator.hardwareConcurrency, navigator.platform, Intl.DateTimeFormat().resolvedOptions().timeZone, gl].join('|'));
}
let fp = '', banA = null, banB = null;
function checkBan() {
  const hit = (banA && (banA.until || 0) > Date.now()) || banB;
  let el = $('banScreen');
  if (hit && !isOwner()) {
    if (!el) { el = document.createElement('div'); el.id = 'banScreen'; el.className = 'ban-screen'; document.body.appendChild(el); }
    el.innerHTML = '<h1>🚫 You are banned</h1><p>' + (banB ? 'This device has been banned.' : 'Your ban ends: ' + (banA.until > 4e15 ? 'never (permanent)' : new Date(banA.until).toLocaleString())) + '</p>';
  } else if (el) el.remove();
}
async function boot() {
  if (!db) return;
  fp = await getFp();
  const me = db.ref('users/' + vid);
  const s = await me.once('value');
  me.update({ name: currentUser, fp, ua: navigator.userAgent.slice(0, 120), last: TS, ...(s.exists() ? {} : { first: TS }) });
  if (!s.exists()) db.ref('joins').push({ vid, name: currentUser || 'New visitor', ts: TS });
  me.child('role').on('value', r => { dbRole = r.val() || 'none'; renderNav(); watchJoins(); });
  db.ref('bans/' + vid).on('value', r => { banA = r.val(); checkBan(); });
  db.ref('deviceBans/' + fp).on('value', r => { banB = r.val(); checkBan(); });
  db.ref('stats/visitors').once('value').then(() => {});
}
let watching = false; const loadT = Date.now() - 3000;
function watchJoins() {
  if (!isOwner() || watching || !db) return; watching = true;
  db.ref('joins').limitToLast(1).on('child_added', c => { const j = c.val(); if (j && j.ts > loadT && j.vid !== vid) showNotice('👋 ' + j.name + ' joined', 'info'); });
}
async function chooseName(n) {
  n = (n || '').trim().replace(/\s+/g, ' ');
  if (n.length < 2 || n.length > 15) { showNotice('Name must be 2-15 characters', 'error'); return false; }
  if (!db) return false;
  const k = nameKey(n), r = await db.ref('names/' + k).transaction(c => (c === null || c === vid) ? vid : undefined);
  if (!r.committed) { showNotice('That name is taken', 'error'); return false; }
  const old = nameKey(currentUser); if (currentUser && old !== k) db.ref('names/' + old).remove();
  currentUser = n; ls.set('skyline_username', n);
  db.ref('users/' + vid).update({ name: n, last: TS }); db.ref('joins').push({ vid, name: n, ts: TS });
  showNotice('Name set to ' + n, 'success'); renderPage(); return true;
}

// ===== presence =====
const presenceRef = db ? db.ref('presence/' + vid) : null;
function updatePresence() { if (presenceRef) presenceRef.set({ playing: new URLSearchParams(location.search).get('page') === 'play', ts: TS }).catch(() => {}); }
if (db) {
  presenceRef.onDisconnect().remove().catch(() => {});
  db.ref('.info/connected').on('value', s => { if (s.val() === true) { presenceRef.onDisconnect().remove().catch(() => {}); updatePresence(); } });
  if (ls.get('skyline_counted', '') !== '1') db.ref('stats/visitors').transaction(v => (v || 0) + 1, (e, ok) => { if (!e && ok) ls.set('skyline_counted', '1'); });
  db.ref('announcement').on('value', s => { if (typeof s.val() === 'string' && s.val()) $('announcementText').textContent = s.val(); });
}

// ===== firebase diagnostics =====
if (db) {
  let linked = false;
  db.ref('.info/connected').on('value', x => { if (x.val() === true) linked = true; });
  setTimeout(() => { if (!linked) showNotice('Firebase not connecting: check the databaseURL (region) in the code and that the Realtime Database exists.', 'error'); }, 8000);
  db.ref('stats').once('value').catch(e => showNotice('Firebase blocked the site (' + (e.code || e.message) + '). Update your Realtime Database rules.', 'error'));
} else showNotice('Firebase library failed to load. Check your internet / ad blocker.', 'error');

// ===== router =====
const homeHTML = $('viewport').innerHTML;
function go(page, extra) { history.pushState({}, '', '?page=' + page + (extra || '')); renderPage(); }
function renderNav() { $('devNavBtn').style.display = isOwner() ? '' : 'none'; }
function renderPage() {
  unsubs.forEach(f => f()); unsubs = []; if (dmOff) { dmOff(); dmOff = null; }
  document.body.style.overflow = ''; if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  const q = new URLSearchParams(location.search); let p = q.get('page') || 'home';
  if (p === 'dev' && !isOwner()) { history.replaceState({}, '', '?page=home'); p = 'home'; }
  document.querySelectorAll('.nav-item').forEach(a => a.classList.toggle('active', a.dataset.page === p));
  renderNav();
  const pages = { home: pgHome, games: pgGames, play: pgPlay, chat: pgChat, requests: pgRequests, dev: pgDev };
  try { (pages[p] || pgHome)($('viewport'), q); } catch (e) { console.error(e); $('viewport').innerHTML = '<div class="page-container"><h2 class="page-title">Error</h2><p class="page-desc">' + esc(e.message) + '</p></div>'; }
  updatePresence();
}
window.addEventListener('popstate', renderPage);
document.addEventListener('click', e => { const a = e.target.closest('a.nav-item'); if (a) { e.preventDefault(); go(a.dataset.page); } });

// ===== home =====
function pgHome(v) {
  v.innerHTML = homeHTML; if (!db) return;
  listen(db.ref('presence'), s => { let o = 0, p = 0; s.forEach(c => { o++; if (c.val() && c.val().playing) p++; }); if ($('statOnline')) { $('statOnline').textContent = o; $('statPlaying').textContent = p; } });
  listen(db.ref('stats/visitors'), s => { if ($('statVisitors')) $('statVisitors').textContent = (s.val() || 0).toLocaleString(); });
  setLbPeriod('all');
}
function setLbPeriod(p) {
  document.querySelectorAll('.tabs .tab').forEach(b => b.classList.toggle('on', b.getAttribute('onclick').includes("'" + p + "'")));
  const el = $('leaderboardList'); if (!el || !db) return;
  db.ref('leaderboard/' + p).once('value').then(s => {
    const r = []; s.forEach(c => { const x = c.val(); r.push({ n: (x && x.name) || c.key, s: typeof x === 'number' ? x : (x && x.score) || 0 }); });
    r.sort((a, b) => b.s - a.s);
    el.innerHTML = r.length ? r.slice(0, 10).map((x, i) => '<div class="lb-row">' + (i + 1) + '. ' + esc(x.n) + ' — ' + esc(x.s) + '</div>').join('') : '<div class="lb-empty">No scores yet.</div>';
  }).catch(() => { el.innerHTML = '<div class="lb-empty">No scores yet.</div>'; });
}

// ===== games (from Games.json) =====
let games = [], favs = [];
try { favs = JSON.parse(ls.get('skyline_favs', '[]')); } catch (e) {}
function toggleFav(t) { favs = favs.includes(t) ? favs.filter(x => x !== t) : [...favs, t]; ls.set('skyline_favs', JSON.stringify(favs)); }
async function loadGames() {
  if (games.length) return games;
  try { const j = await (await fetch(GAMES_URL + '?t=' + Date.now())).json(); games = (Array.isArray(j) ? j : j.games || []).filter(g => g.title && g.source); }
  catch (e) { showNotice('Could not load Games.json', 'error'); }
  return games;
}
async function pgGames(v) {
  v.innerHTML = '<div class="page-container animate-fade-i…
