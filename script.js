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
  firebase.initializeApp({ databaseURL: 'https://skyline-7330c-default-rtdb.firebaseio.com', projectId: 'skyline-7330c' });
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
  v.innerHTML = '<div class="page-container animate-fade-in"><h2 class="page-title">Games</h2><input class="search-input" id="gSearch" placeholder="Search games..." style="padding-left:1rem;width:100%"><div class="g-grid scr" id="gGrid" style="max-height:calc(100vh - 270px)"><p class="page-desc">Loading games...</p></div></div>';
  const list = await loadGames(); if (!$('gGrid')) return;
  const draw = () => {
    const t = $('gSearch').value.toLowerCase();
    const f = list.filter(g => g.title.toLowerCase().includes(t)).sort((a, b) => (favs.includes(b.title) - favs.includes(a.title)) || a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' }));
    $('gGrid').innerHTML = f.length ? f.map(g => '<div class="card g-card" data-t="' + esc(g.title) + '"><span class="star" data-fav="' + esc(g.title) + '" title="Favorite">' + (favs.includes(g.title) ? '⭐' : '☆') + '</span>' + (g.picture ? '<img loading="lazy" src="' + esc(g.picture) + '" alt="">' : '') + '<b>' + esc(g.title) + '</b></div>').join('') : '<p class="page-desc">No games found. Not here? Use the Requests tab!</p>';
  };
  draw(); $('gSearch').oninput = draw;
  $('gGrid').onclick = e => {
    const s = e.target.closest('[data-fav]'); if (s) { toggleFav(s.dataset.fav); draw(); return; }
    const c = e.target.closest('.g-card'); if (c) go('play', '&game=' + encodeURIComponent(c.dataset.t));
  };
}
async function pgPlay(v, q) {
  v.innerHTML = '<div class="page-container"><h2 class="page-title" id="pt">Loading...</h2><div class="row"><button class="play-btn ghost mb" onclick="go(\'games\')">← Back</button><button class="play-btn mb" id="fsBtn">⛶ Fullscreen</button><button class="play-btn mb" id="newTab">Open in new tab</button></div><div class="fsbox" id="fsBox" style="margin-top:.75rem"><button class="play-btn mb fsx" id="fsX">✕ Exit fullscreen</button><div id="frameBox"></div></div></div>';
  const list = await loadGames(), g = list.find(x => x.title === q.get('game'));
  if (!g || !$('pt')) return go('games');
  $('pt').textContent = g.title;
  const setFs = on => {
    $('fsBox').classList.toggle('fs', on); document.body.style.overflow = on ? 'hidden' : '';
    if (on) { const r = $('fsBox').requestFullscreen && $('fsBox').requestFullscreen(); if (r) r.then(() => { try { navigator.keyboard && navigator.keyboard.lock(['Escape']); } catch (e) {} }).catch(() => {}); }
    else { try { navigator.keyboard && navigator.keyboard.unlock(); } catch (e) {} if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); }
  };
  $('fsBtn').onclick = () => setFs(true); $('fsX').onclick = () => setFs(false);
  let html;
  try { html = await (await fetch(g.source)).text(); } catch (e) { $('frameBox').textContent = 'Failed to load this game.'; return; }
  const tag = '<base href="' + g.source.replace(/[^\/]*$/, '') + '">';
  html = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, m => m + tag) : tag + html;
  const f = document.createElement('iframe'); f.srcdoc = html; f.allowFullscreen = true; f.setAttribute('allow', 'fullscreen; autoplay; gamepad; clipboard-write');
  f.style.cssText = 'width:100%;height:75vh;border:0;border-radius:12px;background:#000'; $('frameBox').appendChild(f);
  $('newTab').onclick = () => window.open(URL.createObjectURL(new Blob([html], { type: 'text/html' })));
}

// ===== private messages =====
const pairId = (a, b) => [a, b].sort().join('_');
function pgChat(v) {
  if (!db) { v.innerHTML = '<div class="page-container"><p class="page-desc">Database not connected.</p></div>'; return; }
  if (!currentUser) {
    v.innerHTML = '<div class="page-container animate-fade-in"><h2 class="page-title">Pick a name</h2><p class="page-desc">You need a unique name to use messages.</p><div class="row"><input class="search-input" id="nameIn" maxlength="15" placeholder="Your name..." style="padding-left:1rem"><button class="play-btn" id="nameGo">Save</button></div></div>';
    $('nameGo').onclick = () => chooseName($('nameIn').value); return;
  }
  v.innerHTML = '<div class="page-container animate-fade-in"><h2 class="page-title">Messages</h2><p class="page-desc">Private chats — request someone, and chat once they accept. The site owner can view messages.</p>' +
    '<div class="chat-wrap"><div><div id="inc"></div><h4>Chats</h4><div id="contacts" class="scr" style="max-height:22vh"><p class="page-desc">None yet.</p></div><h4 style="margin-top:1rem">Find people</h4><input class="search-input" id="pSearch" placeholder="Search names..." style="padding-left:1rem;width:100%"><div id="people" class="scr" style="max-height:30vh"></div></div>' +
    '<div><div class="chat-box" id="chatBox"><p class="page-desc">Select a chat.</p></div><div class="row"><input class="search-input" id="chatIn" maxlength="300" placeholder="Message..." style="padding-left:1rem"><button class="play-btn" id="chatSend">Send</button></div></div></div></div>';
  let contacts = {}, users = {}, peer = null;
  const drawPeople = () => {
    const t = $('pSearch').value.toLowerCase();
    $('people').innerHTML = Object.entries(users).filter(([k, u]) => k !== vid && u.name && u.name.toLowerCase().includes(t)).slice(0, 30).map(([k, u]) =>
      '<div class="card pill"><span>' + esc(u.name) + badge(u.role) + '</span>' + (contacts[k] ? '<button class="play-btn mb" data-open="' + k + '" data-n="' + esc(u.name) + '">Chat</button>' : '<button class="play-btn mb" data-req="' + k + '">Request</button>') + '</div>').join('') || '<p class="page-desc">No one found.</p>';
  };
  db.ref('users').once('value').then(s => { users = s.val() || {}; drawPeople(); });
  $('pSearch').oninput = drawPeople;
  listen(db.ref('contacts/' + vid), s => {
    contacts = s.val() || {};
    $('contacts').innerHTML = Object.entries(contacts).map(([k, c]) => '<div class="card pill ' + (peer === k ? 'on' : '') + '" data-open="' + k + '" data-n="' + esc(c.name) + '"><span>' + esc(c.name) + '</span></div>').join('') || '<p class="page-desc">None yet.</p>'; drawPeople();
  });
  listen(db.ref('chatRequests/' + vid), s => {
    const r = s.val() || {};
    $('inc').innerHTML = Object.keys(r).length ? '<h4>Requests</h4>' + Object.entries(r).map(([k, x]) => '<div class="card pill"><span>' + esc(x.name) + '</span><span><button class="play-btn mb" data-acc="' + k + '" data-n="' + esc(x.name) + '">Accept</button> <button class="play-btn mb" data-dec="' + k + '">✕</button></span></div>').join('') : '';
  });
  const open = (k, n) => {
    if (dmOff) dmOff(); peer = k;
    const ref = db.ref('dms/' + pairId(vid, k)).limitToLast(100);
    const fn = s => { const b = $('chatBox'); if (!b) return; let h = ''; s.forEach(c => { const m = c.val(); h += '<div class="msg"><b>' + esc(m.from === vid ? 'You' : m.name) + '</b>: ' + esc(m.text) + '</div>'; }); b.innerHTML = '<p class="page-desc">Chat with ' + esc(n) + '</p>' + h; b.scrollTop = b.scrollHeight; };
    ref.on('value', fn); dmOff = () => ref.off('value', fn);
  };
  v.onclick = e => {
    const t = e.target.closest('[data-open],[data-req],[data-acc],[data-dec]'); if (!t) return; const d = t.dataset;
    if (d.open) open(d.open, d.n);
    else if (d.req) db.ref('chatRequests/' + d.req + '/' + vid).set({ name: currentUser, ts: Date.now() }).then(() => showNotice('Request sent!', 'success'));
    else if (d.acc) db.ref().update({ ['contacts/' + vid + '/' + d.acc]: { name: d.n }, ['contacts/' + d.acc + '/' + vid]: { name: currentUser }, ['chatRequests/' + vid + '/' + d.acc]: null });
    else if (d.dec) db.ref('chatRequests/' + vid + '/' + d.dec).remove();
  };
  const send = () => {
    const t = $('chatIn').value.trim(); if (!t || !peer) return;
    db.ref('dms/' + pairId(vid, peer)).push({ from: vid, name: currentUser, text: t, ts: Date.now() }); $('chatIn').value = '';
  };
  $('chatSend').onclick = send; $('chatIn').onkeydown = e => { if (e.key === 'Enter') send(); };
}

// ===== game requests =====
function pgRequests(v) {
  let list = [], f = 'all', type = 'other';
  v.innerHTML = '<div class="page-container animate-fade-in"><h2 class="page-title">Game Requests</h2><div class="scr" style="max-height:calc(100vh - 170px)"><p class="page-desc">Request a game and upvote the ones you want most.</p>' +
    '<div class="card" style="margin-bottom:1rem"><h4>New request</h4>' +
    '<input class="search-input" id="rName" maxlength="60" placeholder="Game name..." style="padding-left:1rem;width:100%;margin-bottom:.5rem">' +
    '<input class="search-input" id="rUrl" maxlength="300" placeholder="Game URL (https://...)" style="padding-left:1rem;width:100%;margin-bottom:.5rem">' +
    '<div class="tabs" id="typeTabs"><button class="tab" data-type="google">Google Sites</button><button class="tab on" data-type="other">Any website</button></div>' +
    '<div id="rHint" style="margin:.6rem 0"></div><button class="play-btn" id="rSend" style="width:100%">Send Request</button></div>' +
    '<div class="tabs" id="fTabs">' + ['all', 'pending', 'planned', 'added', 'declined'].map(x => '<button class="tab ' + (x === 'all' ? 'on' : '') + '" data-f="' + x + '">' + x + '</button>').join('') + '</div><div id="rList"></div></div></div>';
  const setType = t => {
    type = t; v.querySelectorAll('#typeTabs .tab').forEach(b => b.classList.toggle('on', b.dataset.type === t));
    $('rHint').innerHTML = t === 'google' ? '<span class="ok">✅ Google Sites games work almost every time</span>' : '<span class="bad">⚠ Other websites sometimes work</span>';
  };
  setType('other');
  $('rUrl').oninput = () => { if (/sites\.google\.com/i.test($('rUrl').value)) setType('google'); };
  const draw = () => {
    const rows = list.filter(r => f === 'all' || r.status === f).sort((a, b) => b.n - a.n || b.ts - a.ts);
    $('rList').innerHTML = rows.map(r => {
      const g = r.type === 'google', link = /^https?:\/\//i.test(r.url || '') ? '<a href="' + esc(r.url) + '" target="_blank" rel="noopener noreferrer">' + esc(r.url.slice(0, 60)) + '</a>' : esc(r.url || '');
      return '<div class="card pill" style="cursor:default"><span style="min-width:0;word-break:break-word"><b>' + esc(r.text) + '</b> <span class="' + (g ? 'ok' : 'bad') + '">' + (g ? '✅ Google Sites · works almost every time' : '⚠ Website · sometimes works') + '</span><br><small>' + link + '</small><br><small>by ' + esc(r.by) + ' · ' + ago(r.ts) + ' · <span class="' + (r.status === 'added' ? 'ok' : r.status === 'declined' ? 'bad' : '') + '">' + r.status + '</span></small></span><span class="row" style="margin:0;flex-wrap:nowrap">' +
        '<button class="play-btn mb ' + (r.voted ? '' : 'ghost') + '" data-vote="' + r.k + '">▲ ' + r.n + '</button>' +
        (isAdmin() ? '<select class="search-input mb" data-st="' + r.k + '">' + ['pending', 'planned', 'added', 'declined'].map(s => '<option ' + (s === r.status ? 'selected' : '') + '>' + s + '</option>').join('') + '</select><button class="play-btn ghost mb" data-del="' + r.k + '">🗑</button>' : '') + '</span></div>';
    }).join('') || '<p class="page-desc">Nothing here yet.</p>';
  };
  listen(db && db.ref('requests'), s => { list = []; s.forEach(c => { const x = c.val() || {}; list.push({ k: c.key, text: x.name || x.text || '?', url: x.url || '', type: x.type || 'other', by: x.by || 'Guest', ts: x.ts || 0, status: x.status || 'pending', n: Object.keys(x.votes || {}).length, voted: !!(x.votes && x.votes[vid]) }); }); draw(); });
  $('rSend').onclick = () => {
    const name = $('rName').value.trim(), url = $('rUrl').value.trim(); if (!db) return;
    if (!name) return showNotice('Enter the game name.', 'error');
    if (!/^https?:\/\/\S+\.\S+/i.test(url)) return showNotice('Enter a valid URL starting with https://', 'error');
    if (type === 'google' && !/google\.com/i.test(url)) return showNotice('That does not look like a Google Sites link.', 'error');
    if (Date.now() - +ls.get('skyline_lastreq', 0) < 30000) return showNotice('Wait a bit before requesting again.', 'error');
    ls.set('skyline_lastreq', Date.now());
    db.ref('requests').push({ name, url, type, by: currentUser || 'Guest', vid, ts: Date.now(), status: 'pending', votes: { [vid]: true } });
    $('rName').value = ''; $('rUrl').value = ''; setType('other'); showNotice('Request sent!', 'success');
  };
  v.onclick = e => {
    const d = e.target.dataset;
    if (d.type) setType(d.type);
    if (d.f) { f = d.f; v.querySelectorAll('#fTabs .tab').forEach(b => b.classList.toggle('on', b.dataset.f === f)); draw(); }
    if (!db) return;
    if (d.vote) db.ref('requests/' + d.vote + '/votes/' + vid).transaction(c => c ? null : true);
    if (d.del && isAdmin()) db.ref('requests/' + d.del).remove();
  };
  v.onchange = e => { const k = e.target.dataset.st; if (k && isAdmin()) db.ref('requests/' + k + '/status').set(e.target.value); };
}

// ===== owner console =====
function pgDev(v) {
  let tab = 'users';
  v.innerHTML = '<div class="page-container animate-fade-in"><h2 class="page-title">Owner Console</h2><div class="tabs">' + ['users', 'messages', 'tools'].map(x => '<button class="tab ' + (x === 'users' ? 'on' : '') + '" data-tab="' + x + '">' + x + '</button>').join('') + '</div><div id="devBody" class="scr" style="max-height:calc(100vh - 230px)"></div></div>';
  const show = () => { unsubs.forEach(f => f()); unsubs = []; ({ users: devUsers, messages: devMsgs, tools: devTools }[tab])($('devBody')); };
  v.onclick = e => { const t = e.target.dataset.tab; if (t) { tab = t; v.querySelectorAll('.tabs .tab').forEach(b => b.classList.toggle('on', b.dataset.tab === t)); show(); } };
  show();
}
function devUsers(b) {
  b.innerHTML = '<h4>Recent joins</h4><div id="joinFeed"></div><h4 style="margin-top:1rem">All users</h4><div id="uList"></div>';
  listen(db.ref('joins').limitToLast(10), s => { const a = []; s.forEach(c => a.unshift(c.val())); $('joinFeed') && ($('joinFeed').innerHTML = a.map(j => '<div class="msg">👋 <b>' + esc(j.name) + '</b> · ' + ago(j.ts) + '</div>').join('') || 'None'); });
  listen(db.ref('users'), async s => {
    const [bn, dn] = await Promise.all([db.ref('bans').once('value'), db.ref('deviceBans').once('value')]), B = bn.val() || {}, D = dn.val() || {}, rows = [];
    s.forEach(c => rows.push({ k: c.key, ...c.val() })); rows.sort((a, b) => (b.last || 0) - (a.last || 0));
    if (!$('uList')) return;
    $('uList').innerHTML = rows.map(u => '<div class="card pill" style="cursor:default"><span><b>' + esc(u.name || '(no name)') + '</b>' + badge(u.role) + ' <small>' + u.k.slice(0, 6) + ' · seen ' + ago(u.last) + '</small>' +
      (B[u.k] && B[u.k].until > Date.now() ? ' <span class="bad">[banned]</span>' : '') + (D[u.fp] ? ' <span class="bad">[device]</span>' : '') + '</span><span class="row" style="margin:0">' +
      '<select class="search-input mb" data-role="' + u.k + '">' + Object.keys(RANK).map(r => '<option ' + (r === (u.role || 'none') ? 'selected' : '') + '>' + r + '</option>').join('') + '</select>' +
      '<button class="play-btn mb" data-ban="' + u.k + '">Ban</button><button class="play-btn mb" data-dban="' + u.k + '" data-fp="' + esc(u.fp) + '">Device ban</button><button class="play-btn mb" data-unban="' + u.k + '" data-fp="' + esc(u.fp) + '">Unban</button></span></div>').join('');
  });
  b.onclick = e => {
    const d = e.target.dataset;
    if (d.ban) { const m = prompt('Ban for how many minutes? (blank = permanent)'); if (m === null) return; db.ref('bans/' + d.ban).set({ until: m.trim() ? Date.now() + (+m || 0) * 60000 : 8e15, by: currentUser || 'owner', ts: Date.now() }); }
    if (d.dban && d.fp && confirm('Ban this device permanently?')) { db.ref('deviceBans/' + d.fp).set({ ts: Date.now() }); db.ref('bans/' + d.dban).set({ until: 8e15, ts: Date.now() }); }
    if (d.unban) { db.ref('bans/' + d.unban).remove(); if (d.fp) db.ref('deviceBans/' + d.fp).remove(); showNotice('Unbanned', 'success'); }
  };
  b.onchange = e => { const k = e.target.dataset.role; if (k) db.ref('users/' + k + '/role').set(e.target.value === 'none' ? null : e.target.value); };
}
function devMsgs(b) {
  b.innerHTML = '<div class="chat-wrap"><div id="pairs">Loading...</div><div class="chat-box" id="pView"><p class="page-desc">Pick a conversation.</p></div></div>';
  db.ref('dms').once('value').then(s => {
    const all = s.val() || {};
    $('pairs').innerHTML = Object.entries(all).map(([k, m]) => { const a = Object.values(m), names = [...new Set(a.map(x => x.name))].join(' ↔ '); return '<div class="card pill" data-p="' + k + '"><span>' + esc(names) + '</span><small>' + a.length + '</small></div>'; }).join('') || '<p class="page-desc">No chats.</p>';
    b.onclick = e => { const p = e.target.closest('[data-p]'); if (p) $('pView').innerHTML = Object.values(all[p.dataset.p]).map(m => '<div class="msg"><b>' + esc(m.name) + '</b> <small>' + ago(m.ts) + '</small>: ' + esc(m.text) + '</div>').join(''); };
  });
}
function devTools(b) {
  const T = [['Reset all private chats', ['dms', 'chatRequests', 'contacts']], ['Reset game requests', ['requests']], ['Reset users, names & join log', ['users', 'names', 'joins']], ['Clear all bans', ['bans', 'deviceBans']]];
  b.innerHTML = '<div class="setting-label">Announcement</div><div class="row"><input class="search-input" id="annIn" maxlength="120" style="padding-left:1rem" value="' + esc($('announcementText').textContent) + '"><button class="play-btn" id="annSave">Save</button></div><h4 style="margin-top:1rem">Resets</h4>' +
    T.map((t, i) => '<div class="row"><button class="play-btn ghost" data-r="' + i + '">' + t[0] + '</button></div>').join('');
  $('annSave').onclick = () => db.ref('announcement').set($('annIn').value).then(() => showNotice('Saved', 'success'));
  b.onclick = e => { const i = e.target.dataset.r; if (i && confirm(T[i][0] + '? This cannot be undone.')) Promise.all(T[i][1].map(p => db.ref(p).remove())).then(() => showNotice('Done', 'success')); };
}

// ===== settings =====
const modal = $('settingsModal');
function openModal(o) { ['active', 'open', 'show'].forEach(c => modal.classList.toggle(c, o)); Object.assign(modal.style, { display: o ? 'flex' : 'none', opacity: o ? '1' : '0', pointerEvents: o ? 'auto' : 'none' }); }
openModal(false);
$('settingsToggle').onclick = () => { $('settingsNameInput').value = currentUser; openModal(true); };
$('closeModal').onclick = () => openModal(false);
modal.addEventListener('click', e => { if (e.target === modal) openModal(false); });
function submitCodeButton() {
  codeVal = $('ownerKeyInput').value;
  if (getUserRole() === 'none' && !['ownerkey', 'ownerkeys'].includes(codeVal.trim())) { codeVal = ''; ls.del('skyline_owner_key'); return showNotice('Wrong code.', 'error'); }
  ls.set('skyline_owner_key', codeVal); $('ownerKeyInput').value = ''; showNotice('Logged in as ' + getUserRole() + '.', 'success'); watchJoins(); renderPage();
}
function logoutRole() { codeVal = ''; ls.del('skyline_owner_key'); showNotice('Code removed.'); renderPage(); }

// ===== starfield =====
const cv = $('starfield'), cx = cv.getContext('2d');
let W, H, stars = [], meteors = [], mt, colorful = ls.get('skyline_colorful', '0') === '1';
function makeStars() { stars = Array.from({ length: +ls.get('skyline_stars', 800) }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.3 + .2, t: Math.random() * 6.28, c: colorful ? 'hsl(' + Math.floor(Math.random() * 360) + ',90%,75%)' : '#fff' })); }
function resize() { W = cv.width = innerWidth; H = cv.height = innerHeight; makeStars(); }
function startMeteors() { clearInterval(mt); mt = setInterval(() => meteors.push({ x: Math.random() * W + 200, y: -20, vx: -7, vy: 7, life: 60 }), +ls.get('skyline_meteor', 800)); }
function frame() {
  cx.clearRect(0, 0, W, H);
  for (const s of stars) { cx.globalAlpha = .5 + .5 * Math.sin(s.t += .02); cx.fillStyle = s.c; cx.beginPath(); cx.arc(s.x, s.y, s.r, 0, 6.28); cx.fill(); }
  cx.globalAlpha = 1; cx.strokeStyle = '#cfe8ff'; cx.lineWidth = 2; meteors = meteors.filter(m => m.life > 0);
  for (const m of meteors) { cx.beginPath(); cx.moveTo(m.x, m.y); cx.lineTo(m.x - m.vx * 6, m.y - m.vy * 6); cx.stroke(); m.x += m.vx; m.y += m.vy; m.life--; }
  requestAnimationFrame(frame);
}
function updateColorfulStars(on) { colorful = on; ls.set('skyline_colorful', on ? '1' : '0'); makeStars(); }
$('starCountRange').value = ls.get('skyline_stars', 800); $('starCountVal').textContent = $('starCountRange').value;
$('rarityRange').value = ls.get('skyline_meteor', 800); $('rarityVal').textContent = $('rarityRange').value + 'ms'; $('colorfulToggle').checked = colorful;
$('starCountRange').oninput = e => { ls.set('skyline_stars', e.target.value); $('starCountVal').textContent = e.target.value; makeStars(); };
$('rarityRange').oninput = e => { ls.set('skyline_meteor', e.target.value); $('rarityVal').textContent = e.target.value + 'ms'; startMeteors(); };
addEventListener('resize', resize); resize(); startMeteors(); frame();

boot(); renderPage();
