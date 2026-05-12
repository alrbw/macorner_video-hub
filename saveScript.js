const STORE_KEY = 'macorner_script_store';

function getStore() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; }
    catch { return []; }
}

function saveToStore(fullCode, productBase, rawScript, targetCode) {
    const store = getStore();
    const existing = store.findIndex(s => s.fullCode === fullCode);
    const entry = {
        fullCode,
        productBase,
        rawScript,
        targetCode: (targetCode || fullCode).toUpperCase(),
        savedAt: new Date().toISOString()
    };
    if (existing >= 0) store[existing] = entry;
    else store.unshift(entry);
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
    renderStore();
    showStoreToast();
}

function deleteFromStore(fullCode) {
    const store = getStore().filter(s => s.fullCode !== fullCode);
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
    renderStore();
}

function clearStore() {
    if (!confirm('Clear all saved scripts?')) return;
    localStorage.removeItem(STORE_KEY);
    renderStore();
}
function renderStoreEntry(s) {
    const date = new Date(s.savedAt).toLocaleString();
    const preview = s.rawScript.split('\n').slice(0, 2).join(' ').substring(0, 140) + '...';
    return `
    <div class="store-entry" onclick="openStoreModal('${s.fullCode}')" style="cursor:pointer;">
        <div class="store-entry-header">
            <div>
                <span class="store-entry-code">${s.fullCode}</span>
                <span class="store-entry-badge">${s.productBase}</span>
                <div class="store-entry-date">${date}</div>
            </div>
            <div class="store-entry-actions" onclick="event.stopPropagation()">
                <button class="store-btn store-btn-copy" onclick="storeCopy('${s.fullCode}')" data-copy-btn="${s.fullCode}">📋 Copy</button>
                <button class="store-btn store-btn-dl"  onclick="storeDownload('${s.fullCode}')">⬇️ Download</button>
                <button class="store-btn store-btn-del" onclick="deleteFromStore('${s.fullCode}')">🗑️</button>
            </div>
        </div>
        <div class="store-entry-preview">${preview}</div>
    </div>`;
}

function renderStore() {
    const search = (document.getElementById('store-search')?.value || '').toLowerCase();
    const sort = document.getElementById('store-sort')?.value || 'newest';

    let store = getStore().filter(s =>
        s.fullCode.toLowerCase().includes(search) ||
        s.productBase.toLowerCase().includes(search)
    );
    if (sort === 'oldest') store.reverse();
    else if (sort === 'code') store.sort((a, b) => a.fullCode.localeCompare(b.fullCode));

    const list = document.getElementById('store-list');
    const empty = document.getElementById('store-empty');
    const count = document.getElementById('store-count');
    if (!list) return;

    count.textContent = `${store.length} script${store.length !== 1 ? 's' : ''} saved`;

    if (!store.length) {
        list.innerHTML = '';
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';

    const suffixGroups = {};
    store.forEach(s => {
        const tc = (s.targetCode || s.fullCode).toUpperCase();
        const suffix = tc.slice(-2);
        if (!suffixGroups[suffix]) suffixGroups[suffix] = [];
        suffixGroups[suffix].push(s);
    });

    const suffixKeys = Object.keys(suffixGroups).sort((a, b) => suffixGroups[b].length - suffixGroups[a].length);
    const prevSuffix = list.dataset.activeSuffix;
    const activeSuffix = prevSuffix ? prevSuffix : 'ALL';
    // ── Filter store theo suffix đang active
    const filteredBySuffix = activeSuffix === 'ALL' ? store : (suffixGroups[activeSuffix] || []);

    // ── Group theo targetCode trong suffix đó
    const groups = {};
    filteredBySuffix.forEach(s => {
        const tab = (s.targetCode || s.fullCode).toUpperCase();
        if (!groups[tab]) groups[tab] = [];
        groups[tab].push(s);
    });

    const tabKeys = Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length);
    const prevActive = list.dataset.activeTab;
    const activeTab = (prevActive && tabKeys.includes(prevActive)) ? prevActive : tabKeys[0];

    const tabHeadersHtml = tabKeys.map(key => `
        <button class="store-tab-btn ${key === activeTab ? 'active' : ''}" onclick="switchStoreTab('${key}')">
            ${key}
            <span class="store-tab-count">${groups[key].length}</span>
        </button>
    `).join('');

    const tabContentsHtml = tabKeys.map(key => `
        <div class="store-tab-pane ${key === activeTab ? 'active' : ''}" id="store-tab-${key}">
            ${groups[key].map(s => renderStoreEntry(s)).join('')}
        </div>
    `).join('');

    const allCount = store.length;
    const verticalTabsHtml = `
        <button 
            class="store-vtab ${activeSuffix === 'ALL' ? 'active' : ''}"
            onclick="switchStoreSuffix('ALL')">
            ALL
            <span class="store-vtab-count">${allCount}</span>
        </button>
    ` + suffixKeys.map(sfx => `
        <button 
            class="store-vtab ${sfx === activeSuffix ? 'active' : ''}"
            onclick="switchStoreSuffix('${sfx}')">
            ${sfx}
            <span class="store-vtab-count">${suffixGroups[sfx].length}</span>
        </button>
    `).join('');
    list.innerHTML = `
        <div class="store-layout">
            <div class="store-vtabs">${verticalTabsHtml}</div>
            <div class="store-main">
                <div class="store-tabs-header">${tabHeadersHtml}</div>
                <div class="store-tabs-body">${tabContentsHtml}</div>
            </div>
        </div>
    `;

    list.dataset.activeSuffix = activeSuffix;
    list.dataset.activeTab = activeTab;

    store.forEach(s => {
        window[`_storeScript_${s.fullCode}`] = {
            clean: s.rawScript.split('\n').map(l => l.replace(/^\[\d+:\d+-\d+:\d+\]\s*/, '')).join('\n'),
            raw: s.rawScript,
            productBase: s.productBase
        };
    });
}

function switchStoreSuffix(sfx) {
    const list = document.getElementById('store-list');
    if (!list) return;
    list.dataset.activeSuffix = sfx;
    list.dataset.activeTab = '';
    renderStore();
}

function switchStoreTab(key) {
    const list = document.getElementById('store-list');
    if (!list) return;
    list.dataset.activeTab = key;
    list.querySelectorAll('.store-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.trim().startsWith(key));
    });
    list.querySelectorAll('.store-tab-pane').forEach(pane => {
        pane.classList.toggle('active', pane.id === `store-tab-${key}`);
    });
}

function switchStoreTab(key) {
    const list = document.getElementById('store-list');
    if (!list) return;
    list.dataset.activeTab = key;

    list.querySelectorAll('.store-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.trim().startsWith(key));
    });
    list.querySelectorAll('.store-tab-pane').forEach(pane => {
        pane.classList.toggle('active', pane.id === `store-tab-${key}`);
    });
}

function storeCopy(fullCode) {
    const data = window[`_storeScript_${fullCode}`];
    if (!data) return;
    navigator.clipboard.writeText(data.clean).then(() => {
        const btn = document.querySelector(`[data-copy-btn="${fullCode}"]`);
        if (btn) { btn.innerText = '✅ Copied!'; setTimeout(() => btn.innerText = '📋 Copy', 2000); }
    });
}

function storeDownload(fullCode) {
    const data = window[`_storeScript_${fullCode}`];
    if (!data) return;
    const blob = new Blob([data.raw], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `script_${fullCode}_${data.productBase.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
}

function showStoreToast() {
    let toast = document.getElementById('store-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'store-toast';
        toast.style = 'position:fixed;bottom:24px;right:24px;background:#1e293b;color:#fff;padding:10px 18px;border-radius:8px;font-size:13px;z-index:9999;opacity:0;transition:opacity .3s;';
        document.body.appendChild(toast);
    }
    toast.textContent = '💾 Script saved to Store!';
    toast.style.opacity = '1';
    setTimeout(() => toast.style.opacity = '0', 2500);
}
function openStoreModal(fullCode) {
    const data = window[`_storeScript_${fullCode}`];
    if (!data) return;

    let modal = document.getElementById('store-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'store-modal';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.45);z-index:2000;display:flex;align-items:center;justify-content:center;animation:fadeIn .15s ease;';
        modal.onclick = (e) => { if (e.target === modal) closeStoreModal(); };
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
    <div style="background:#fff;border-radius:14px;width:90%;max-width:640px;max-height:82vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.2);">
        
        <div style="padding:18px 22px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-shrink:0;">
            <div>
                <span style="font-weight:700;font-size:15px;font-family:monospace;">${fullCode}</span>
                <span style="margin-left:8px;font-size:11px;font-weight:600;background:#fff3e0;color:#FF6B00;padding:2px 9px;border-radius:20px;border:1px solid rgba(255,107,0,0.2);">${data.productBase}</span>
            </div>
            <div style="display:flex;gap:6px;align-items:center;">
                <button id="modal-copy-btn" onclick="modalCopy('${fullCode}')"
                    style="background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;padding:7px 14px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;font-family:Inter,sans-serif;">
                    📋 Copy
                </button>
                <button onclick="storeDownload('${fullCode}')"
                    style="background:#f0fdf4;color:#166534;border:1px solid #bbf7d0;padding:7px 14px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;font-family:Inter,sans-serif;">
                    ⬇️ Download
                </button>
                <button onclick="closeStoreModal()"
                    style="background:transparent;border:none;font-size:20px;cursor:pointer;color:#999;line-height:1;padding:4px 6px;">✕</button>
            </div>
        </div>

        <div style="padding:20px 22px;overflow-y:auto;flex:1;">
            <pre style="margin:0;font-family:'Inter',sans-serif;font-size:13.5px;line-height:1.75;color:#1a1a1a;white-space:pre-wrap;word-break:break-word;">${data.raw}</pre>
        </div>

    </div>`;

    modal.style.display = 'flex';
}

function closeStoreModal() {
    const modal = document.getElementById('store-modal');
    if (modal) modal.style.display = 'none';
}

function modalCopy(fullCode) {
    const data = window[`_storeScript_${fullCode}`];
    if (!data) return;
    navigator.clipboard.writeText(data.clean).then(() => {
        const btn = document.getElementById('modal-copy-btn');
        if (btn) { btn.innerText = '✅ Copied!'; setTimeout(() => btn.innerText = '📋 Copy', 2000); }
    });
}

// Render khi load
document.addEventListener('DOMContentLoaded', renderStore);