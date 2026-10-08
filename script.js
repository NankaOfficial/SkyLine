
function escapeHtml(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}

// ================= NOTICES =================
function showNotice(message, type, title) {
    const stack = document.getElementById('toastStack'); if (!stack) return;
    type = type || 'info';
    const labels = { info: 'Notice', error: 'Error', success: 'Success' };
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.innerHTML = '<div class="t-title">' + escapeHtml(title || labels[type]) + '</div><div>' + escapeHtml(message) + '</div>';
    stack.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, type === 'error' ? 6000 : 3500);
}

// ================= FIREBASE =================
firebase.initializeApp({ databaseURL: "https://skyline-7330c-default-rtdb.firebaseio.com", projectId: "skyline-7330c" });
const rtdb = firebase.database();

// ================= SAVING =================
function setCookie(n, v, days) {
    let e = "";
    if (days) { const d = new Date(); d.setTime(d.getTime() + days * 864e5); e = "; expires=" + d.toUTCString(); }
    document.cookie = n + "=" + encodeURIComponent(v || "") + e + "; path=/; SameSite=Lax";
}
function getCookie(n) {
    for (let c of document.cookie.split(';')) {
        c = c.trim();
        if (c.indexOf(n + "=") === 0) { try { return decodeURIComponent(c.substring(n.length + 1)); } catch (e) { return c.substring(n.length + 1); } }
    }
    return null;
}
function saveSetting(k, v) { setCookie(k, String(v), 365); try { localStorage.setItem(k, String(v)); } catch (e) {} }
function loadSetting(k, fb) {
    let v = null;
    try { v = localStorage.getItem(k); } catch (e) {}
    if (v === null || v === undefined) v = getCookie(k);
    return (v === null || v === undefined || v === '') ? fb : v;
}
function removeSetting(k) { setCookie(k, '', -1); try { localStorage.removeItem(k); } catch (e) {} }

let currentUser = loadSetting('skyline_username', '');
let ownerKeyInputVal = loadSetting('skyline_owner_key', '');

// ================= PRESENCE + VISITORS =================
const visitorId = (() => {
    let id = loadSetting('skyline_vid', '');
    if (!id) { id = Math.random().toString(36).slice(2) + Date.now().toString(36); saveSetting('skyline_vid', id); }
    return id;
})();
const presenceRef = rtdb.ref('presence/' + visitorId);
function updatePresence() {
    const playing = new URLSearchParams(location.search).get('page') === 'play';
    presenceRef.set({ playing, ts: firebase.database.ServerValue.TIMESTAMP }).catch(() => {});
}
function initPresence() {
    presenceRef.onDisconnect().remove().catch(() => {});
    rtdb.ref('.info/connected').on('value', s => { if (s.val() === true) { presenceRef.onDisconnect().remove().catch(() => {}); updatePresence(); } });
    if (loadSetting('skyline_counted', '') !== '1') {
        rtdb.ref('stats/visitors').transaction(v => (v || 0) + 1, (err, ok) => { if (!err && ok) saveSetting('skyline_counted', '1'); });
    }
}
function initHomeStats() {
    trackListener(rtdb.ref('presence'), snap => {
        let online = 0, playing = 0;
        snap.forEach(c => { online++; if (c.val() && c.val().playing) playing++; });
        const o = document.getElementById('statOnline'), p = document.getElementById('statPlaying');
        if (o) o.textContent = online; if (p) p.textContent = playing;
    });
    trackListener(rtdb.ref('stats/visitors'), snap => {
        const v = document.getElementById('statVisitors');
        if (v) v.textContent = (snap.val() || 0).toLocaleString();
    });
}

// ================= ROLES =================
function getUserRole() {
    const v = ownerKeyInputVal.trim();
    if (v === '𒐫𒐫' || v.toLowerCase() === 'u1242b unicode') return 'owner';
    if (v === '𒐫' || v.toLowerCase() === 'u1242a') return 'admin';
    return 'none';
}
const isOwner = () => getUserRole() === 'owner';
const isAdmin = () => getUserRole() === 'admin' || isOwner();
function roleBadgeHtml(r) {
    if (r === 'owner') return '<span class="badge owner-badge">Owner</span>';
    if (r === 'admin') return '<span class="badge admin-badge">Admin</span>';
    return '';
}

// ================= PROFANITY FILTER (words.json) =================
const WORDS_URL = 'https://raw.githubusercontent.com/NankaOfficial/SkyLine/refs/heads/main/words.json';
const FALLBACK_WORDS = { severe: ['fuck', 'fuk', 'fck', 'nigga', 'nigger', 'cunt', 'bitch'], whole: ['shit', 'ass'], emoji: ['🖕'] };
const LEET_MAP = { '@': 'a', '$': 's', '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '+': 't' };
let SEVERE_REGEXES = [], WHOLE_REGEXES = [], BAD_EMOJI = [];
function wildPattern(word) {
    return word.toLowerCase().replace(/[^a-z]/g, '').split('').map(c => 'aeiou'.includes(c) ? '(?:' + c + '+|[^a-z\\s])' : c + '+').join('[^a-z]*');
}
function buildFilters(d) {
    SEVERE_REGEXES = (d.severe || []).map(w => new RegExp(wildPattern(w)));
    WHOLE_REGEXES = (d.whole || []).map(w => new RegExp('^' + wildPattern(w) + '(?:s|es|ed|er|ers|ing|y|ie)?$'));
    BAD_EMOJI = d.emoji || [];
}
async function loadWordLists() {
    try { const r = await fetch(WORDS_URL + '?t=' + Date.now()); if (!r.ok) throw 0; buildFilters(await r.json()); } catch (e) {}
}
const HOMOGLYPHS = {'а':'a','е':'e','о':'o','р':'p','с':'c','х':'x','у':'y','і':'i','ј':'j','ѕ':'s','һ':'h','ɡ':'g','ν':'v','ο':'o','ι':'i','κ':'k','α':'a','ε':'e','ρ':'p','τ':'t','υ':'u','ß':'ss'};
// Lowercase, fold lookalike letters (Cyrillic/Greek/fullwidth), strip accents + invisible chars, undo leetspeak
function leetNormalize(s) {
    s = String(s).normalize('NFKC').toLowerCase().replace(/[\u200B-\u200D\u2060\uFEFF\u00AD]/g, '');
    s = s.replace(/[^\u0000-\u007f]/g, ch => HOMOGLYPHS[ch] || ch);
    s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return s.replace(/(?<=[a-z])!(?=[a-z])/g, 'i').replace(/[@$013457+]/g, ch => LEET_MAP[ch] || ch);
}
// Joins spaced-out letters so "f u c k", "f.u.c.k" and "f-u-c-k" become "fuck"
function collapseSpaced(norm) {
    const out = []; let run = [];
    const flush = () => { if (run.length >= 3) out.push(run.join('')); else out.push(...run); run = []; };
    for (let w of norm.split(/\s+/).filter(Boolean)) {
        w = w.replace(/^((?:[a-z][.\-_]){2,}[a-z])$/, m => m.replace(/[.\-_]/g, ''));
        if (/^[a-z]$/.test(w.replace(/[^a-z]/g, '')) && w.length <= 2) run.push(w.replace(/[^a-z]/g, ''));
        else { flush(); out.push(w); }
    }
    flush();
    return out;
}
function containsBadWord(str) {
    if (!str) return false;
    const clean = String(str).replace(/[\u200B-\u200D\u2060\uFEFF]/g, '');
    if (BAD_EMOJI.some(e => clean.includes(e))) return true;
    const norm = leetNormalize(clean);
    const tokens = collapseSpaced(norm);
    if (SEVERE_REGEXES.some(r => r.test(norm) || r.test(tokens.join(' ')))) return true;
    const words = norm.split(/[\s,;:\/|]+/).concat(tokens);
    return words.map(t => t.replace(/^[.,;:"'()\[\]]+|[.,;:"'()\[\]]+$/g, '')).filter(Boolean).some(t => WHOLE_REGEXES.some(r => r.test(t)));
}
buildFilters(FALLBACK_WORDS);
loadWordLists();

// ================= DEVICE IDENTITY + BANS =================
const BAN_URL = 'https://game.fyi.jp/ban';
const LADDER_MIN = [1, 2, 3, 5, 10, 30, 50, 100, 120, 1440];
let offenderState = null, deviceBan = null, identReady = null;
const myIdent = { ip: '', fp: '' };

async function sha(str) {
    const s = 'skyline-v1|' + str;
    try {
        const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
        return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('').slice(0, 32);
    } catch (e) { let h = 5381; for (const c of s) h = ((h << 5) + h + c.charCodeAt(0)) | 0; return 'x' + (h >>> 0).toString(16); }
}
// Hashed public IP: same on every browser / private tab on the same network, and not readable as a real IP
async function getIpHash() {
    for (const u of ['https://api.ipify.org?format=json', 'https://api64.ipify.org?format=json']) {
        try { const r = await fetch(u, { cache: 'no-store' }); const j = await r.json(); if (j && j.ip) return await sha('ip:' + j.ip); } catch (e) {}
    }
    return '';
}
// Hardware/system traits only (no canvas or storage), so Safari private mode gives the same result
async function getFingerprint() {
    let gl = '';
    try {
        const c = document.createElement('canvas'), g = c.getContext('webgl') || c.getContext('experimental-webgl');
        const e = g && g.getExtension('WEBGL_debug_renderer_info');
        if (e) gl = g.getParameter(e.UNMASKED_RENDERER_WEBGL) + '|' + g.getParameter(e.UNMASKED_VENDOR_WEBGL);
    } catch (e) {}
    const parts = [Math.max(screen.width, screen.height), Math.min(screen.width, screen.height), screen.colorDepth, window.devicePixelRatio || 1, navigator.hardwareConcurrency || 0, navigator.deviceMemory || 0, navigator.platform || '', (Intl.DateTimeFormat().resolvedOptions().timeZone) || '', (navigator.languages || [navigator.language]).join(','), navigator.maxTouchPoints || 0, gl];
    return sha('fp:' + parts.join('|'));
}

function getBanUntil() { return parseInt(loadSetting('skyline_chat_ban', '0')) || 0; }
function isBlocked() { return !!((offenderState && offenderState.blocked) || (deviceBan && deviceBan.blocked) || loadSetting('skyline_blocked', '0') === '1'); }
function isChatBanned() { return isBlocked() || getBanUntil() > Date.now() || (deviceBan && (deviceBan.bannedUntil || 0) > Date.now()); }
function enforceBlock() { if (isBlocked() && !isAdmin()) location.href = BAN_URL; }
function deviceInfo() {
    return { ua: navigator.userAgent, platform: navigator.platform || '', lang: navigator.language || '', tz: (Intl.DateTimeFormat().resolvedOptions().timeZone) || '', screen: screen.width + 'x' + screen.height + ' @' + (window.devicePixelRatio || 1), cores: navigator.hardwareConcurrency || null, mem: navigator.deviceMemory || null, touch: navigator.max…
