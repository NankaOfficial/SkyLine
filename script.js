function escapeHtml(s) {
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

// ================= NOTICES =================
function showNotice(message, type, title) {
    const stack = document.getElementById('toastStack'); 
    if (!stack) return;
    type = type || 'info';
    const labels = { info: 'Notice', error: 'Error', success: 'Success' };
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.innerHTML = '<div class="t-title">' + escapeHtml(title || labels[type]) + '</div><div>' + escapeHtml(message) + '</div>';
    stack.appendChild(t);
    setTimeout(() => { 
        t.classList.add('out'); 
        setTimeout(() => t.remove(), 320); 
    }, type === 'error' ? 6000 : 3500);
}

// ================= FIREBASE =================
const firebaseConfig = {
    databaseURL: "https://skyline-7330c-default-rtdb.firebaseio.com", 
    projectId: "skyline-7330c"
};
firebase.initializeApp(firebaseConfig);
const rtdb = firebase.database();

// ================= LISTENER TRACKER =================
const activeListeners = [];
function trackListener(ref, cb) {
    ref.on('value', cb);
    activeListeners.push({ ref, cb });
}

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

// ================= ROLES (SECURED) =================
function getUserRole() {
    const v = ownerKeyInputVal.trim();
    if (v.toLowerCase().includes('milocomas')) return 'none';
    if (v === 'openkeys') return 'owner';
    return 'none';
}
const isOwner = () => getUserRole() === 'owner';
const isAdmin = () => getUserRole() === 'admin' || isOwner();
function roleBadgeHtml(r) {
    if (r === 'owner') return '<span class="badge owner-badge">Owner</span>';
    if (r === 'admin') return '<span class="badge admin-badge">Admin</span>';
    return '';
}

// ================= PROFANITY FILTER =================
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
function leetNormalize(s) {
    s = String(s).normalize('NFKC').toLowerCase().replace(/[\u200B-\u200D\u2060\uFEFF\u00AD]/g, '');
    s = s.replace(/[^\u0000-\u007f]/g, ch => HOMOGLYPHS[ch] || ch);
    s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return s.replace(/(?<=[a-z])!(?=[a-z])/g, 'i').replace(/[@$013457+]/g, ch => LEET_MAP[ch] || ch);
}
function collapseSpaced(norm) {
    const out = []; let run = [];
    const flush = () => { if (run.length >= 3) out.push(run.join('')); else out.push(...run); run = []; };
    for (let w of norm.split(/\s+/).filter(Boolean)) {
        w = w.replace(/^((?:[a-z][.\-_]){2,}[a-z])$/, m => m.replace(/[.\-_]/g, ''));
        if (/^[a-z]$/.test(w.replace(/[^a-z]$/g, '')) && w.length <= 2) run.push(w.replace(/[^a-z]/g, ''));
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

// ================= CHAT & MESSAGES =================
let lastMessageTime = 0;
const COOLDOWN_MS = 3000; // 3 seconds rate limit

function initChat() {
    const chatContainer = document.getElementById('chatMessages');
    if (!chatContainer) return;

    rtdb.ref('chats').limitToLast(50).on('value', snapshot => {
        chatContainer.innerHTML = '';
        if (!snapshot.exists()) {
            chatContainer.innerHTML = '<div style="color: #666; text-align: center; padding: 1rem;">No messages yet. Say hello!</div>';
            return;
        }

        snapshot.forEach(childSnap => {
            const msgId = childSnap.key;
            const data = childSnap.val();
            if (!data) return;

            const timeStr = data.timestamp ? new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            const roleBadge = data.role === 'owner' ? '<span class="badge owner-badge">Owner</span>' : (data.role === 'admin' ? '<span class="badge admin-badge">Admin</span>' : '');

            const msgDiv = document.createElement('div');
            msgDiv.style.cssText = "background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.06); padding: 0.6rem 0.8rem; border-radius: 8px; font-size: 0.9rem; display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 0.5rem;";
            
            msgDiv.innerHTML = `
                <div>
                    <strong class="name-owner" style="color:#64b5f6;font-size:.8rem;display:block;margin-bottom:.2rem;">${escapeHtml(data.name || 'Guest')} ${roleBadge}</strong>
                    ${escapeHtml(data.text || '')}
                </div>
                <div style="display:flex;align-items:center;gap:8px;">
                    <span style="font-size:.7rem;color:#666;white-space:nowrap;">${timeStr}</span>
                    ${isAdmin() ? `<button onclick="deleteChatMessage('${msgId}')" style="background:none;border:none;color:#ff5555;cursor:pointer;font-size:.8rem;">Delete</button>` : ''}
                </div>
            `;
            chatContainer.appendChild(msgDiv);
        });
        chatContainer.scrollTop = chatContainer.scrollHeight;
    });
}

function sendChatMessage() {
    const input = document.getElementById('chatInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    // Rate limiting
    const now = Date.now();
    if (now - lastMessageTime < COOLDOWN_MS) {
        showNotice("Please wait a few seconds before sending another message!", "error", "Rate Limit");
        return;
    }
    lastMessageTime = now;

    // Length check
    if (text.length > 300) {
        showNotice("Message is too long! Max 300 characters.", "error", "Error");
        return;
    }

    // Profanity check
    if (containsBadWord(text)) {
        showNotice("Your message contains blocked words.", "error", "Filtered");
        return;
    }

    rtdb.ref('chats').push({
        text: text,
        name: currentUser || "Guest",
        role: getUserRole(),
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });

    input.value = "";
}

function deleteChatMessage(messageId) {
    if (!isAdmin()) {
        showNotice("You must be logged in as owner/admin to delete messages.", "error", "Unauthorized");
        return;
    }
    rtdb.ref('chats/' + messageId).remove().catch(() => {
        showNotice("Failed to delete message.", "error", "Error");
    });
}

function updateUsername(newName) {
    currentUser = newName.trim().slice(0, 15);
    saveSetting('skyline_username', currentUser);
}

function submitCodeButton() {
    const inputEl = document.getElementById('ownerKeyInput');
    if (!inputEl) return;
    ownerKeyInputVal = inputEl.value;
    saveSetting('skyline_owner_key', ownerKeyInputVal);

    if (isOwner() || isAdmin()) {
        showNotice("Owner code accepted!", "success", "Success");
        inputEl.value = "";
        initChat(); // Refresh chat to show admin/owner badges
    } else {
        showNotice("Invalid code.", "error", "Access Denied");
    }
}

function logoutRole() {
    ownerKeyInputVal = "";
    removeSetting('skyline_owner_key');
    showNotice("Code removed.", "info", "Logged Out");
    initChat();
}

// Initialize on load
window.addEventListener('DOMContentLoaded', () => {
    initPresence();
    initHomeStats();
    initChat();
    const nameInput = document.getElementById('settingsNameInput');
    if (nameInput && currentUser) nameInput.value = currentUser;
});
