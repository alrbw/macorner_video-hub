/**
 * MACORNER STRATEGY BUILDER
 * FULL AUTO V60 (Cloud Sync Gallery, Token UI, Fullscreen 9:16 Fix)
 */

if (!document.getElementById('modern-ui-styles')) {
    document.head.insertAdjacentHTML('beforeend', `
    <style id="modern-ui-styles">
        .modern-action-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 1px 2px rgba(0,0,0,0.05); border: 1px solid transparent; }
        .modern-action-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 6px rgba(0,0,0,0.08); }
        .btn-prompt { background: #fffbeb; color: #d97706; border-color: #fde68a; }
        .btn-prompt:hover { background: #fef3c7; }
        .btn-copy { background: #f8fafc; color: #475569; border-color: #cbd5e1; }
        .btn-copy:hover { background: #f1f5f9; }
        .btn-save { background: #f0fdf4; color: #166534; border-color: #bbf7d0; }
        .btn-save:hover { background: #dcfce7; }
        .prompt-builder-wrapper { margin-top:20px; padding:20px; background:#fffaf5; border-radius:8px; border:1px solid #fed7aa; box-shadow: 0 4px 15px rgba(234, 88, 12, 0.05); transition: all 0.3s ease; position: relative;}
        
        .prompt-view-box {
            width: 100%; height: 450px; overflow-y: auto; padding: 15px; 
            font-family: inherit; font-size: 14px; border: 1px solid #cbd5e1; 
            border-radius: 6px; margin-top: 10px; background: #fafaf9; 
            box-sizing: border-box; white-space: pre-wrap; line-height: 1.6;
        }
        .prompt-view-box::-webkit-scrollbar { width: 6px; }
        .prompt-view-box::-webkit-scrollbar-track { background: transparent; }
        .prompt-view-box::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .prompt-view-box::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        
        /* CSS Fix Fullscreen cho Video tỷ lệ 9:16 */
        .gallery-video { width: 100%; height: 100%; object-fit: cover; background: #000; }
        .gallery-video::-webkit-media-controls-enclosure { object-fit: contain !important; }
        .gallery-video:-webkit-full-screen { object-fit: contain !important; background: #000; }
        .gallery-video:-moz-full-screen { object-fit: contain !important; background: #000; }
        .gallery-video:fullscreen { object-fit: contain !important; background: #000; }
    </style>`);
}

let RAW_DATA = [];
let SELECTED_PAIRS = new Map();
let FINAL_SELECTED_CODES = new Map();

let CSV_HEADERS = [];
let PB_INDEX = -1;

let GLOBAL_TARGET_CODE = "";
let GLOBAL_PRODUCT_BASE = "";
let GLOBAL_SCRAPED_DATA = "";
let GLOBAL_IMAGE_URL = "";
let CURRENT_NICHE = "";

let AI_CACHE = new Map();
let MIX_OPTIONS_CACHE = new Map(); 

let MANUAL_E2 = [];
let MANUAL_E4 = [];
let CURRENT_MATRIX_LIMIT = 5;

window.CURRENT_RENDERED_E2 = [];
window.CURRENT_RENDERED_E4 = [];

let GLOBAL_CACHE_KEY = ""; 

// Quản lý Token Frontend
window.BYTEPLUS_TOTAL_TOKENS = parseInt(localStorage.getItem('bp_total_tokens')) || 0;

const API_BASE_URL = 'https://only-breanne-dzt-b25e098f.koyeb.app'; 

function saveStateToCache() {
    if (!GLOBAL_CACHE_KEY) return;
    const state = {
        pairs: Array.from(SELECTED_PAIRS.entries()),
        finals: Array.from(FINAL_SELECTED_CODES.entries()),
        ai: Array.from(AI_CACHE.entries()),
        mixes: Array.from(MIX_OPTIONS_CACHE.entries()),
        pb: GLOBAL_PRODUCT_BASE,
        sd: GLOBAL_SCRAPED_DATA,
        img: GLOBAL_IMAGE_URL,
        mE2: MANUAL_E2,
        mE4: MANUAL_E4,
        limit: CURRENT_MATRIX_LIMIT
    };
    localStorage.setItem(`macorner_state_${GLOBAL_CACHE_KEY}`, JSON.stringify(state));
}

function loadStateFromCache(key) {
    const raw = localStorage.getItem(`macorner_state_${key}`);
    SELECTED_PAIRS.clear();
    FINAL_SELECTED_CODES.clear();
    AI_CACHE.clear();
    MIX_OPTIONS_CACHE.clear();
    MANUAL_E2 = [];
    MANUAL_E4 = [];

    if (raw) {
        try {
            const state = JSON.parse(raw);
            SELECTED_PAIRS = new Map(state.pairs || []);
            FINAL_SELECTED_CODES = new Map(state.finals || []);
            AI_CACHE = new Map(state.ai || []);
            MIX_OPTIONS_CACHE = new Map(state.mixes || []);
            
            if (state.pb) GLOBAL_PRODUCT_BASE = state.pb;
            if (state.sd) GLOBAL_SCRAPED_DATA = state.sd;
            if (state.img) GLOBAL_IMAGE_URL = state.img;
            if (state.mE2) MANUAL_E2 = state.mE2 || [];
            if (state.mE4) MANUAL_E4 = state.mE4 || [];
            if (state.limit) CURRENT_MATRIX_LIMIT = state.limit;
            
            return true;
        } catch (e) {
            console.error("Lỗi đọc Smart Cache:", e);
        }
    }
    return false; 
}

window.switchView = function(view) {
    document.querySelectorAll('.view-pane').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(`view-${view}`).classList.add('active');
    document.getElementById(`nav-${view}`).classList.add('active');

    if (view === 'review') window.renderReviewView();
    if (view === 'gallery') window.renderGalleryView(); 
    if (view === 'store') window.renderStore(); 
}

function extractNiche(adName) {
    const match = adName.match(/([A-Z]{3})\d{4,6}/);
    return match ? match[1] : adName.substring(0, 3).toUpperCase();
}

document.getElementById('csvFileInput').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        const rows = event.target.result.split('\n').filter(r => r.trim() !== "");
        if (rows.length === 0) return;

        CSV_HEADERS = rows[0].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
        PB_INDEX = CSV_HEADERS.findIndex(h => h.includes('product base') || h.includes('product'));

        RAW_DATA = rows.slice(1).map(line => {
            const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            if (cols.length < 3) return null;

            let cleanAdName = cols[0] ? cols[0].replace(/^"|"$/g, '').trim() : "";
            let rawSpent = cols[2] ? cols[2].replace(/[^0-9.-]+/g, "") : "0";
            let productBase = (PB_INDEX !== -1 && cols[PB_INDEX]) ? cols[PB_INDEX].replace(/^"|"$/g, '').trim() : "";

            return {
                adName: cleanAdName,
                productBase: productBase,
                spent: parseFloat(rawSpent) || 0,
                elements: cleanAdName.match(/\d{10}/) ? cleanAdName.match(/\d{10}/)[0] : null
            };
        }).filter(i => i);
        document.getElementById('fileStatus').textContent = "Loaded: " + RAW_DATA.length;
    };
    reader.readAsText(file);
});

document.getElementById('targetVideoCode').placeholder = "Paste Product Link Or Code";
document.getElementById('targetVideoCode').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('btnAnalyze').click();
    }
});

document.getElementById('btnAnalyze').onclick = async function () {
    const inputVal = document.getElementById('targetVideoCode').value.trim();
    if (inputVal.length < 3) return alert("Please Enter Proper Link Or Code");

    const btn = this;
    const analysisSec = document.getElementById('analysisSection');

    const mixArea = document.getElementById('mixArea');
    if (mixArea) mixArea.style.display = 'none';
    const reviewHeaders = document.getElementById('reviewTabHeaders');
    const reviewContents = document.getElementById('reviewTabContents');
    if (reviewHeaders) reviewHeaders.innerHTML = '';
    if (reviewContents) reviewContents.innerHTML = '';
    const noMsg = document.getElementById('no-selection-msg');
    if (noMsg) noMsg.style.display = 'block';
    const oldPb = document.getElementById('pb-container');
    if (oldPb) oldPb.remove();

    let tempTargetCode = inputVal;
    let tempProductBase = "";
    let tempScrapedData = "";
    let tempImageUrl = "";
    let asin = "";

    analysisSec.style.display = 'none';
    btn.innerText = "⏳ Loading The Product...";
    btn.disabled = true;

    try {
        const res = await fetch(`${API_BASE_URL}/api/analyze-link`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: inputVal })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        tempTargetCode = data.targetCode;
        tempProductBase = data.productBase;
        tempScrapedData = data.scrapedData;
        tempImageUrl = data.imageUrl || "";
        asin = data.asin || "";

        document.getElementById('targetVideoCode').value = tempTargetCode;
        
    } catch (err) {
        alert(`❌ Lỗi: ${err.message}`);
        const tcMatch = inputVal.match(/([A-Z]{3}\d{4,10}[A-Z0-9]*)/);
        if (tcMatch) tempTargetCode = tcMatch[1].toUpperCase();
    } finally {
        btn.innerText = "Start Analysis";
        btn.disabled = false;
    }

    GLOBAL_TARGET_CODE = tempTargetCode;
    GLOBAL_CACHE_KEY = asin ? `ASIN_${asin}` : `CODE_${tempTargetCode}`;

    const history = RAW_DATA.filter(i => i.adName.includes(GLOBAL_TARGET_CODE) && i.elements);
    CURRENT_NICHE = history.length > 0 ? extractNiche(history[0].adName) : extractNiche(GLOBAL_TARGET_CODE);
    
    const hasCache = loadStateFromCache(GLOBAL_CACHE_KEY);
    if (!hasCache) {
        CURRENT_MATRIX_LIMIT = history.length > 0 ? 9 : 5;
    }
    
    if (tempProductBase) GLOBAL_PRODUCT_BASE = tempProductBase;
    if (tempScrapedData) GLOBAL_SCRAPED_DATA = tempScrapedData;
    if (tempImageUrl) GLOBAL_IMAGE_URL = tempImageUrl;

    analysisSec.style.display = 'block';
    saveStateToCache();

    const hContainer = document.getElementById('historyContainer');
    if (history.length > 0) {
        hContainer.style.display = 'block';
        window.renderHistoryTable(history);
    } else {
        hContainer.style.display = 'none';
    }

    window.renderMatrix(CURRENT_NICHE, CURRENT_MATRIX_LIMIT, GLOBAL_TARGET_CODE);
    
    if (SELECTED_PAIRS.size > 0) window.updateMixArea();
    if (FINAL_SELECTED_CODES.size > 0) window.renderReviewView();
};

window.getTopElements = function(niche, type, limit) {
    let pool = typeof ELEMENTS_DATA !== 'undefined' && ELEMENTS_DATA[type] ? ELEMENTS_DATA[type].map(i => i.Code.toString().padStart(2, '0')) : [];
    if (type === 'E4' && typeof NICHE_E4_MAP !== 'undefined') {
        const allowedE4s = NICHE_E4_MAP[niche.toUpperCase()];
        if (allowedE4s && allowedE4s.length > 0) pool = pool.filter(code => allowedE4s.includes(code));
        else pool.sort(() => 0.5 - Math.random());
    }

    const nicheData = RAW_DATA.filter(i => i.adName.toUpperCase().includes(niche.toUpperCase()) && i.elements);
    let map = {};
    nicheData.forEach(i => {
        const code = type === 'E2' ? i.elements.substring(2, 4) : i.elements.substring(6, 8);
        if (pool.includes(code)) map[code] = (map[code] || 0) + i.spent;
    });

    let results = Object.keys(map).map(k => ({ code: k, spent: map[k] })).sort((a, b) => b.spent - a.spent);
    const usedCodes = new Set(results.map(r => r.code));
    pool.forEach(p => { if (!usedCodes.has(p)) results.push({ code: p, spent: 0 }); });
    return results.slice(0, limit);
}

window.renderHistoryTable = function(data) {
    let html = `<table><thead><tr><th>Ad Name</th><th>Product Base</th><th>Full Code</th><th>Spent</th></tr></thead><tbody>`;
    data.forEach(item => {
        html += `<tr><td style="text-align:left">${item.adName}</td><td>${item.productBase || 'N/A'}</td><td><span class="full-code-text" data-full="${item.elements}">${item.elements}</span></td><td>$${item.spent.toLocaleString()}</td></tr>`;
    });
    document.getElementById('historyTableWrapper').innerHTML = html + `</tbody></table>`;
}

window.renderMatrix = function(niche, limit, targetCode) {
    const e2List = window.getTopElements(niche, 'E2', limit);
    const e4List = window.getTopElements(niche, 'E4', limit);
    
    MANUAL_E2.forEach(code => {
        if (!e2List.find(e => e.code === code)) e2List.push({code, spent: 0, isManual: true});
    });
    MANUAL_E4.forEach(code => {
        if (!e4List.find(e => e.code === code)) e4List.push({code, spent: 0, isManual: true});
    });

    window.CURRENT_RENDERED_E2 = e2List.map(e => String(e.code).padStart(2, '0'));
    window.CURRENT_RENDERED_E4 = e4List.map(e => String(e.code).padStart(2, '0'));

    const container = document.getElementById('matrixContainer');

    if (!document.getElementById('canva-btn-style')) {
        document.head.insertAdjacentHTML('beforeend', `
        <style id="canva-btn-style">
            .matrix-scroll-area { width: 100%; overflow-x: auto; padding: 15px 25px 25px 15px; box-sizing: border-box; }
            .canva-matrix-wrapper { position: relative; display: inline-block; min-width: 100%; }
            .canva-matrix-wrapper table { width: 100%; border-collapse: collapse; margin: 0; }
            .canva-add-btn { width: 26px; height: 26px; border-radius: 50%; background: #ffffff; border: 1.5px solid #cbd5e1; color: #64748b; font-size: 18px; font-weight: 500; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.15); transition: all 0.2s ease; position: absolute; z-index: 10; user-select: none; padding-bottom: 2px; box-sizing: border-box; }
            .canva-add-btn:hover { background: #f8fafc; color: #f97316; border-color: #f97316; transform: scale(1.15); }
            .canva-add-btn.e2-btn { top: 50%; right: 0px; transform: translate(50%, -50%); }
            .canva-add-btn.e2-btn:hover { transform: translate(50%, -50%) scale(1.15); }
            .canva-add-btn.e4-btn { bottom: 0px; left: 50%; transform: translate(-50%, 50%); }
            .canva-add-btn.e4-btn:hover { transform: translate(-50%, 50%) scale(1.15); }
        </style>`);
    }

    let html = `<div class="matrix-scroll-area"><div class="canva-matrix-wrapper"><table><thead><tr><th style="min-width: 80px; text-align: center;">E4 \\ E2</th>`;
    e2List.forEach((e2) => { 
        html += `<th style="text-align: center;"><span class="code-box" data-type="E2" data-code="${e2.code}">${e2.code}</span><br><small>${e2.isManual ? '<span style="color:#f97316; font-weight:bold;">Custom</span>' : '$' + e2.spent.toLocaleString()}</small></th>`; 
    });
    
    html += `</tr></thead><tbody>`;

    e4List.forEach((e4) => {
        html += `<tr><td style="text-align: center;"><span class="code-box" data-type="E4" data-code="${e4.code}">${e4.code}</span><br><small>${e4.isManual ? '<span style="color:#f97316; font-weight:bold;">Custom</span>' : '$' + e4.spent.toLocaleString()}</small></td>`;
        e2List.forEach(e2 => {
            const pairKey = `${e2.code}-${e4.code}`;
            const isRan = RAW_DATA.some(s => s.adName.toUpperCase().includes(targetCode.toUpperCase()) && s.elements && s.elements.substring(2, 4) === e2.code && s.elements.substring(6, 8) === e4.code);
            const isChecked = SELECTED_PAIRS.has(pairKey) ? 'checked' : '';
            html += `<td class="${isRan ? 'cell-history' : ''}" style="text-align: center;"><input type="checkbox" id="mat_${GLOBAL_CACHE_KEY}_${e2.code}_${e4.code}" autocomplete="off" class="round-checkbox" ${isChecked} onchange="window.togglePair('${e2.code}', '${e4.code}', this)"></td>`;
        });
        html += `</tr>`;
    });

    html += `</tbody></table><div class="canva-add-btn e2-btn" title="Add E2 Column" onclick="window.openSearchModal('E2')">+</div><div class="canva-add-btn e4-btn" title="Add E4 Row" onclick="window.openSearchModal('E4')">+</div></div></div>`;

    container.innerHTML = html;
    window.injectSearchModal(); 
}

let currentSearchType = 'E2';

window.injectSearchModal = function() {
    if (document.getElementById('custom-element-modal')) return;
    const modalHtml = `
    <div id="custom-element-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:9999; align-items:center; justify-content:center; backdrop-filter: blur(2px);">
        <div style="background:white; padding:20px; border-radius:8px; width:90%; max-width:550px; display:flex; flex-direction:column; position:relative; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
            <button onclick="window.closeSearchModal()" style="position:absolute; top:15px; right:15px; background:none; border:none; font-size:20px; cursor:pointer; color:#64748b;">✖</button>
            <h3 id="custom-element-title" style="margin-top:0; color:#f97316; margin-bottom: 15px;">Add Custom Element</h3>
            <input type="text" id="custom-element-search" placeholder="Type keyword to search..." style="width:100%; padding:10px 12px; margin-bottom:15px; box-sizing:border-box; border:1px solid #cbd5e1; border-radius:6px; font-size: 14px; outline: none; transition: border-color 0.2s;" autocomplete="off" oninput="window.handleElementSearch(this.value)">
            <div id="custom-element-results" style="max-height:350px; overflow-y:auto; border:1px solid #f1f5f9; border-radius:6px; background: #f8fafc;"></div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

window.openSearchModal = function(type) {
    currentSearchType = type;
    document.getElementById('custom-element-title').innerHTML = `🔍 Search & Add <b>${type}</b>`;
    document.getElementById('custom-element-search').value = '';
    document.getElementById('custom-element-results').innerHTML = '';
    document.getElementById('custom-element-modal').style.display = 'flex';
    document.getElementById('custom-element-search').focus();
    window.handleElementSearch(''); 
};

window.closeSearchModal = function() {
    document.getElementById('custom-element-modal').style.display = 'none';
};

window.handleElementSearch = function(query) {
    query = query.toLowerCase().trim();
    const resultsDiv = document.getElementById('custom-element-results');
    const data = (typeof ELEMENTS_DATA !== 'undefined') ? ELEMENTS_DATA[currentSearchType] : [];
    
    if (!data || data.length === 0) {
        resultsDiv.innerHTML = '<div style="padding:15px; text-align:center; color:#94a3b8;">Element data not found.</div>';
        return;
    }

    const matched = data.filter(item => {
        const code = String(item.Code).padStart(2, '0');
        const detail = (item.Detail || item.Hook || item['Insights to niches'] || item.CTA || item['Source/Video Type'] || '').toLowerCase();
        const explanation = (item.Explanation || '').toLowerCase();
        return code.includes(query) || detail.includes(query) || explanation.includes(query);
    });

    if (matched.length === 0) {
        resultsDiv.innerHTML = '<div style="padding:20px; text-align:center; color:#94a3b8; font-style:italic;">No results found.</div>';
        return;
    }

    let html = '';
    matched.forEach(item => {
        const code = String(item.Code).padStart(2, '0');
        const detail = item.Detail || item.Hook || item['Insights to niches'] || item.CTA || item['Source/Video Type'] || 'N/A';
        const expl = item.Explanation || '';
        
        const isAdded = (currentSearchType === 'E2' && window.CURRENT_RENDERED_E2.includes(code)) || 
                        (currentSearchType === 'E4' && window.CURRENT_RENDERED_E4.includes(code));
        
        const btnHtml = isAdded 
            ? `<button disabled style="padding:6px 10px; background:#e2e8f0; color:#94a3b8; border:none; border-radius:4px; font-size:12px; cursor:not-allowed; font-weight:bold;">Added</button>`
            : `<button onclick="window.selectCustomElement('${code}')" style="padding:6px 12px; background:#10b981; color:white; border:none; border-radius:4px; font-size:12px; cursor:pointer; font-weight:bold; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">+ Add</button>`;

        html += `
            <div style="padding:12px 15px; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; background:white; transition:background 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='white'">
                <div style="flex:1; padding-right:15px;">
                    <div style="margin-bottom:4px;">
                        <strong style="color:#ea580c; background:#ffedd5; padding:2px 6px; border-radius:4px; margin-right:6px; font-size: 14px;">${code}</strong>
                        <span style="font-weight:600; color:#1e293b; font-size: 14px;">${detail}</span>
                    </div>
                    ${expl ? `<div style="font-size:12px; color:#64748b; line-height:1.4;">${expl}</div>` : ''}
                </div>
                <div>${btnHtml}</div>
            </div>
        `;
    });
    resultsDiv.innerHTML = html;
};

window.selectCustomElement = function(code) {
    if (currentSearchType === 'E2' && !MANUAL_E2.includes(code)) MANUAL_E2.push(code);
    else if (currentSearchType === 'E4' && !MANUAL_E4.includes(code)) MANUAL_E4.push(code);
    saveStateToCache(); 
    window.closeSearchModal();
    window.renderMatrix(CURRENT_NICHE, CURRENT_MATRIX_LIMIT, GLOBAL_TARGET_CODE);
};

window.togglePair = function(e2, e4, checkbox) {
    const key = `${e2}-${e4}`;
    if (checkbox.checked) { 
        if (!SELECTED_PAIRS.has(key)) SELECTED_PAIRS.set(key, { e2, e4 }); 
    } else { 
        SELECTED_PAIRS.delete(key); 
        Array.from(FINAL_SELECTED_CODES.entries()).forEach(([code, data]) => {
            if (data.pairKey === key) FINAL_SELECTED_CODES.delete(code);
        });
    }
    saveStateToCache(); 
    window.updateMixArea();
    window.renderReviewView(); 
}

window.updateMixArea = function() {
    const area = document.getElementById('mixArea');
    const headers = document.getElementById('tabHeaders');
    const contents = document.getElementById('tabContents');
    
    if (SELECTED_PAIRS.size === 0) { 
        area.style.display = 'none'; 
        window.renderReviewView();
        return; 
    }

    area.style.display = 'block';
    const currentActive = document.querySelector('#tabHeaders .tab-btn.active')?.dataset.key;

    headers.innerHTML = '';
    contents.innerHTML = ''; 

    SELECTED_PAIRS.forEach((val, key) => {
        headers.innerHTML += `<button class="tab-btn ${currentActive === key ? 'active' : ''}" data-key="${key}" onclick="window.switchTab('${key}', 'tabHeaders', 'tabContents')">Pair ${key}</button>`;
        const pane = document.createElement('div');
        pane.className = 'tab-pane'; pane.id = `pane-${key}`;
        pane.innerHTML = `<button class="btn-primary" onclick="window.forceRegenerateMixForTab('${key}')" style="margin-bottom:15px">Generate Mix E1 & E5</button><div class="table-container" id="mix-table-${key}"></div>`;
        contents.appendChild(pane);
        window.generateMixForTab(key);
    });
    
    const finalKey = currentActive && SELECTED_PAIRS.has(currentActive) ? currentActive : SELECTED_PAIRS.keys().next().value;
    window.switchTab(finalKey, 'tabHeaders', 'tabContents');
}

window.switchTab = function(key, headerId, contentId) {
    document.querySelectorAll(`#${headerId} .tab-btn`).forEach(b => b.classList.toggle('active', b.dataset.key === key));
    document.querySelectorAll(`#${contentId} .tab-pane`).forEach(p => p.classList.toggle('active', p.id.includes(key)));
}

window.forceRegenerateMixForTab = function(key) {
    MIX_OPTIONS_CACHE.delete(key);
    Array.from(FINAL_SELECTED_CODES.entries()).forEach(([code, data]) => {
        if (data.pairKey === key) FINAL_SELECTED_CODES.delete(code);
    });
    window.generateMixForTab(key);
    saveStateToCache();
    window.renderReviewView();
}

window.getSmartMix = function(niche, type, limit) {
    let pool = typeof ELEMENTS_DATA !== 'undefined' && ELEMENTS_DATA[type] ? ELEMENTS_DATA[type].map(i => i.Code.toString().padStart(2, '0')) : [];
    
    if (type === 'E1') pool = pool.filter(code => code !== '00' && code !== '01');
    else if (type === 'E5') pool = pool.filter(code => code !== '00');

    const history = RAW_DATA.filter(s => s.adName.toUpperCase().includes(niche.toUpperCase()) && s.elements);
    let map = {};
    history.forEach(s => {
        const code = type === 'E1' ? s.elements.substring(0, 2) : s.elements.substring(8, 10);
        if (pool.includes(code)) map[code] = (map[code] || 0) + s.spent;
    });
    
    const best = Object.keys(map).sort((a, b) => map[b] - map[a]);
    const numBest = Math.ceil(limit * 0.6);
    const selected = best.slice(0, numBest);
    const rand = pool.filter(c => !selected.includes(c)).sort(() => 0.5 - Math.random()).slice(0, limit - selected.length);
    return [...selected, ...rand];
}

window.generateMixForTab = function(key) {
    const pair = SELECTED_PAIRS.get(key);
    let options = [];

    if (MIX_OPTIONS_CACHE.has(key)) {
        options = MIX_OPTIONS_CACHE.get(key);
    } else {
        const e1Opts = window.getSmartMix(CURRENT_NICHE, 'E1', 5);
        const e5Opts = window.getSmartMix(CURRENT_NICHE, 'E5', 5);
        for (let i = 0; i < 5; i++) {
            const e1 = e1Opts[i] || "02", e5 = e5Opts[i] || "01";
            options.push(`${e1}${pair.e2}03${pair.e4}${e5}`);
        }
        MIX_OPTIONS_CACHE.set(key, options);
        saveStateToCache();
    }

    let html = `<table><thead><tr><th>Option</th><th>E1</th><th>E2</th><th>E3</th><th>E4</th><th>E5</th><th>Full Code</th><th>Select</th></tr></thead><tbody>`;
    options.forEach((full, i) => {
        const e1 = full.substring(0, 2), e5 = full.substring(8, 10);
        const isChecked = FINAL_SELECTED_CODES.has(full) ? 'checked' : '';
        html += `<tr>
                    <td>#${i + 1}</td>
                    <td><span class="code-box" data-type="E1" data-code="${e1}">${e1}</span></td>
                    <td>${pair.e2}</td><td>03</td><td>${pair.e4}</td>
                    <td><span class="code-box" data-type="E5" data-code="${e5}">${e5}</span></td>
                    <td><span class="full-code-text" data-full="${full}">${full}</span></td>
                    <td><input type="checkbox" id="mix_cb_${GLOBAL_CACHE_KEY}_${full}" autocomplete="off" class="round-checkbox" ${isChecked} onchange="window.toggleFinalCode('${full}', '${key}', this)"></td>
                 </tr>`;
    });
    document.getElementById(`mix-table-${key}`).innerHTML = html + `</tbody></table>`;
}

window.toggleFinalCode = function(fullCode, pairKey, checkbox) {
    if (checkbox.checked) FINAL_SELECTED_CODES.set(fullCode, { fullCode, pairKey });
    else FINAL_SELECTED_CODES.delete(fullCode);
    saveStateToCache(); 
    window.renderReviewView();
}

window.updateTokenDisplay = function() {
    const tokenDisplay = document.getElementById('bp-token-usage');
    if (tokenDisplay) {
        tokenDisplay.innerText = window.BYTEPLUS_TOTAL_TOKENS.toLocaleString();
    }
}

window.renderReviewView = function() {
    const headers = document.getElementById('reviewTabHeaders');
    const contents = document.getElementById('reviewTabContents');
    const msg = document.getElementById('no-selection-msg');

    const oldPb = document.getElementById('pb-container');
    if (oldPb) oldPb.remove();

    if (!headers || !contents) return;
    headers.innerHTML = ''; contents.innerHTML = '';

    if (FINAL_SELECTED_CODES.size === 0) { 
        if (msg) msg.style.display = 'block'; 
        return; 
    }
    if (msg) msg.style.display = 'none';

    let displayProductName = GLOBAL_PRODUCT_BASE;
    if (!displayProductName && GLOBAL_TARGET_CODE) {
        const historyMatch = RAW_DATA.find(i => i.adName.includes(GLOBAL_TARGET_CODE) && i.productBase);
        if (historyMatch) displayProductName = historyMatch.productBase;
    }
    if (!displayProductName) displayProductName = "Personalized Custom Gift";

    const linkBadgeHtml = GLOBAL_SCRAPED_DATA
        ? `<span style="background:#ecfdf5; color:#047857; padding:4px 8px; border-radius:4px; font-size:12px; font-weight:600; margin-left:15px; border: 1px solid #10b981;">✓ Data Connected</span>`
        : "";

    const imgPreviewHtml = GLOBAL_IMAGE_URL
        ? `<img src="${GLOBAL_IMAGE_URL}" style="height: 44px; width: 44px; border-radius: 6px; border: 1px solid #ccc; object-fit: cover; margin-right: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">`
        : "";

    const tokenDisplayHtml = `<div class="token-counter" title="Total tokens used in this session">🪙 BP Tokens: <span id="bp-token-usage" style="margin-left:4px; font-weight:800; color:#ea580c;">${window.BYTEPLUS_TOTAL_TOKENS.toLocaleString()}</span></div>`;

    const pbContainer = document.createElement('div');
    pbContainer.id = 'pb-container';
    pbContainer.style.cssText = 'position: relative; margin-bottom: 20px; padding: 15px; background: white; border: 1px solid var(--border); border-radius: 8px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap;';
    pbContainer.innerHTML = `
        <div style="display:flex; align-items:center;">
            ${imgPreviewHtml}
            <div style="display:flex; align-items:center; background: #fff3e0; padding: 8px 16px; border-radius: 8px; border: 1px solid #ffe0b2;">
                <span style="font-weight: 600; color: #e65100; margin-right: 8px;">Target Product Base:</span>
                <span style="font-weight: 800; font-size: 1.1rem; color: #bf360c; text-transform: uppercase;">${displayProductName}</span>
            </div>
            ${linkBadgeHtml}
        </div>
        ${tokenDisplayHtml}
    `;
    headers.parentNode.insertBefore(pbContainer, headers);

    const grouped = {};
    FINAL_SELECTED_CODES.forEach(item => {
        if (!grouped[item.pairKey]) grouped[item.pairKey] = [];
        grouped[item.pairKey].push(item.fullCode);
    });

    Object.keys(grouped).forEach((pairKey, idx) => {
        headers.innerHTML += `<button class="tab-btn ${idx === 0 ? 'active' : ''}" data-key="${pairKey}" onclick="window.switchTab('${pairKey}', 'reviewTabHeaders', 'reviewTabContents')">Pair ${pairKey}</button>`;
        const pane = document.createElement('div');
        pane.className = `tab-pane ${idx === 0 ? 'active' : ''}`;
        pane.id = `review-pane-${pairKey}`;

        let tableHtml = `<table><thead><tr><th>Full Code</th><th>E1</th><th>E2</th><th>E3</th><th>E4</th><th>E5</th><th style="min-width: 150px;">Action</th></tr></thead><tbody>`;

        grouped[pairKey].forEach(code => {
            const e1 = code.substring(0, 2), e2 = code.substring(2, 4), e3 = code.substring(4, 6), e4 = code.substring(6, 8), e5 = code.substring(8, 10);

            const cacheData = AI_CACHE.get(code) || {};
            const hasCache = !!cacheData.rawScript;
            const scriptText = hasCache ? cacheData.scriptHtml : '';
            const isExpanded = hasCache ? cacheData.expanded : true;
            
            const showPromptBuilder = hasCache ? (cacheData.showPromptBuilder || false) : false;
            const ugcRecipientVal = hasCache && cacheData.promptRecipient ? cacheData.promptRecipient : '';
            const ugcPromptResult = hasCache && cacheData.shootingPrompt ? cacheData.shootingPrompt : '';
            const promptResultDisplay = ugcPromptResult ? 'block' : 'none';

            const aiRowStyle = hasCache && isExpanded ? 'table-row' : 'none';
            const btnText = hasCache ? '✨ Redo' : '✨ Create';
            const toggleIcon = isExpanded ? '▼' : '▶';
            const toggleDisplay = hasCache ? 'inline-block' : 'none';

            const videoStatus = cacheData.videoGenStatus || '';
            const videoTime = cacheData.videoGenTime || 0;
            let videoBtnHtml = `<button onclick="window.generateVideo('${code}')" id="video-btn-${code}" style="padding: 6px 12px; border: 1px solid #c084fc; border-radius: 6px; cursor: pointer; background: #f5f3ff; font-weight: 600; color: #6d28d9; font-size: 12px; transition:all 0.2s;" onmouseover="this.style.background='#ede9fe'" onmouseout="this.style.background='#f5f3ff'">🎥 Generate Video</button>`;
            
            if (videoStatus === 'generating') {
                videoBtnHtml = `<button disabled id="video-btn-${code}" style="padding: 6px 12px; border: 1px solid #c084fc; border-radius: 6px; cursor: not-allowed; background: #f5f3ff; font-weight: 600; color: #6d28d9; font-size: 12px; opacity: 0.7;">⏳ Generating (${videoTime}s)...</button>`;
            } else if (videoStatus === 'succeeded') {
                videoBtnHtml = `<button disabled id="video-btn-${code}" style="padding: 6px 12px; border: 1px solid #10b981; border-radius: 6px; cursor: default; background: #10b981; font-weight: 600; color: white; font-size: 12px;">✅ Video Ready!</button>`;
            }

            const copyPromptStr = `navigator.clipboard.writeText(document.getElementById('prompt-text-${code}').innerText.trim()); this.innerText='✅ Copied!'; setTimeout(()=>this.innerText='📋 Copy Prompt', 2000);`;
            
            const ugcPromptResultContent = ugcPromptResult ? `
                <div style="display:flex; justify-content:flex-end; gap:8px; margin-bottom:12px;" id="prompt-actions-wrapper-${code}">
                    <button onclick="window.editPrompt('${code}')" id="edit-prompt-btn-${code}" style="padding: 6px 12px; border: 1px solid #bae6fd; border-radius: 6px; cursor: pointer; background: #f0f9ff; font-weight: 600; color: #0369a1; font-size: 12px; transition:all 0.2s;" onmouseover="this.style.background='#e0f2fe'" onmouseout="this.style.background='#f0f9ff'">✏️ Edit</button>
                    <button onclick="${copyPromptStr}" id="copy-prompt-btn-${code}" style="padding: 6px 12px; border: 1px solid #fed7aa; border-radius: 6px; cursor: pointer; background: #fff7ed; font-weight: 600; color: #c2410c; font-size: 12px; transition:all 0.2s;" onmouseover="this.style.background='#ffedd5'" onmouseout="this.style.background='#fff7ed'">📋 Copy Prompt</button>
                    ${videoBtnHtml}
                </div>
                <div id="prompt-text-${code}" class="prompt-view-box">${ugcPromptResult}</div>
            ` : '';

            const builderHtml = hasCache ? `
                <div id="prompt-builder-${code}" class="prompt-builder-wrapper" style="display:${showPromptBuilder ? 'block' : 'none'};">
                    <h4 style="margin:0 0 12px 0; color:#ea580c; font-size:15px; display:flex; align-items:center; gap:8px;">🎬 Generate Video Shooting Prompt</h4>
                    <div style="display:flex; gap:12px; margin-bottom:15px; align-items:stretch;">
                        <input type="text" id="prompt-recipient-${code}" value="${ugcRecipientVal}" placeholder="Mô tả đối tượng (VD: a woman in her mid 50s)..." style="flex:1; padding:10px 14px; border:1px solid #fdba74; border-radius:6px; font-size:14px; outline:none; box-sizing:border-box; transition:box-shadow 0.2s;" onfocus="this.style.boxShadow='0 0 0 3px rgba(251,146,60,0.2)'" onblur="this.style.boxShadow='none'" onkeypress="if(event.key === 'Enter') { event.preventDefault(); window.generateShootingPrompt('${code}'); }" autocomplete="off">
                        <button id="btn-gen-prompt-${code}" onclick="window.generateShootingPrompt('${code}')" style="background:#ea580c; color:white; border:none; padding:0 24px; border-radius:6px; font-weight:600; cursor:pointer; font-size:14px; transition:all 0.2s; box-shadow:0 2px 4px rgba(234,88,12,0.2);" onmouseover="this.style.background='#c2410c'" onmouseout="this.style.background='#ea580c'">✨ Generate</button>
                    </div>
                    <div id="prompt-result-${code}" style="display: ${promptResultDisplay};">${ugcPromptResultContent}</div>
                </div>
            ` : '';

            tableHtml += `<tr>
                <td><span class="full-code-text" data-full="${code}">${code}</span></td>
                <td><span class="code-box" data-type="E1" data-code="${e1}">${e1}</span></td>
                <td>${e2}</td><td>${e3}</td><td>${e4}</td>
                <td><span class="code-box" data-type="E5" data-code="${e5}">${e5}</span></td>
                <td style="white-space: nowrap;">
                    <button class="btn-primary" onclick="window.generateAIScript('${code}', this)" style="padding: 6px 12px; font-size: 0.8rem; background: #10a37f; border: none; cursor: pointer;">${btnText}</button>
                    <button id="toggle-btn-${code}" onclick="window.toggleAI('${code}')" style="display: ${toggleDisplay}; background: #f0f0f0; border: 1px solid #ccc; border-radius: 4px; padding: 5px 8px; cursor: pointer; margin-left: 5px; font-size: 0.8rem;">${toggleIcon}</button>
                </td>
            </tr>
            <tr id="ai-row-${code}" style="display: ${aiRowStyle}; background:#f8fafc;">
                <td colspan="7" style="padding: 15px; text-align: left; border-left: 3px solid #10a37f;">
                    <div id="ai-result-${code}">${scriptText}</div>
                    ${builderHtml}
                </td>
            </tr>`;
        });
        pane.innerHTML = tableHtml + `</tbody></table>`;
        contents.appendChild(pane);
    });
}

window.toggleAI = function(code) {
    const row = document.getElementById(`ai-row-${code}`);
    const btn = document.getElementById(`toggle-btn-${code}`);
    if (!row) return;

    let cacheData = AI_CACHE.get(code);
    if (!cacheData) return;

    if (row.style.display === 'none') {
        row.style.display = 'table-row';
        btn.innerText = '▼';
        cacheData.expanded = true;
    } else {
        row.style.display = 'none';
        btn.innerText = '▶';
        cacheData.expanded = false;
    }
    saveStateToCache(); 
}

window.togglePromptForm = function(fullCode) {
    const builder = document.getElementById(`prompt-builder-${fullCode}`);
    if (builder) {
        const isHidden = builder.style.display === 'none';
        builder.style.display = isHidden ? 'block' : 'none';
        
        const cacheData = AI_CACHE.get(fullCode) || {};
        cacheData.showPromptBuilder = isHidden;
        
        const aiResultHtml = document.getElementById(`ai-result-${fullCode}`).innerHTML;
        cacheData.scriptHtml = aiResultHtml; 

        AI_CACHE.set(fullCode, cacheData);
        saveStateToCache();
    }
}

window.generateAIScript = async function(fullCode, btn) {
    const pbElement = document.querySelector('#pb-container span[style*="color: #bf360c"]');
    const productBase = pbElement ? pbElement.innerText : (GLOBAL_PRODUCT_BASE || "Personalized Custom Gift");

    const row = document.getElementById(`ai-row-${fullCode}`);
    const resultBox = document.getElementById(`ai-result-${fullCode}`);
    const toggleBtn = document.getElementById(`toggle-btn-${fullCode}`);

    row.style.display = 'table-row';
    if (toggleBtn) { toggleBtn.style.display = 'inline-block'; toggleBtn.innerText = '▼'; }
    btn.disabled = true;

    let processText = GLOBAL_IMAGE_URL ? `<i>⏳ Loading...</i>` : `<i>⏳</i>`;
    resultBox.innerHTML = processText;

    try {
        const spentCodes = RAW_DATA.filter(i => i.adName.toUpperCase().includes(CURRENT_NICHE) && i.spent > 0 && i.elements).map(i => i.elements);
        const e1 = fullCode.substring(0, 2), e2 = fullCode.substring(2, 4), e3 = fullCode.substring(4, 6), e4 = fullCode.substring(6, 8), e5 = fullCode.substring(8, 10);
        
        const getEl = (type, code) => typeof ELEMENTS_DATA !== 'undefined' ? ELEMENTS_DATA[type]?.find(i => i.Code.toString().padStart(2, '0') === code) : null;
        
        const iE1 = getEl('E1', e1), iE2 = getEl('E2', e2), iE3 = getEl('E3', e3), iE4 = getEl('E4', e4), iE5 = getEl('E5', e5);
        const getName = (obj) => obj ? (obj.Hook || obj.Detail || obj['Source/Video Type'] || obj['Insights to niches'] || obj.CTA || '') : '';

        const eData = { 
            e1: { name: getName(iE1), exp: iE1?.Explanation || '' },
            e2: { name: getName(iE2), exp: iE2?.Explanation || '', group: iE2?.Group || '' },
            e3: { name: getName(iE3), exp: iE3?.Explanation || '' },
            e4: { name: getName(iE4), exp: iE4?.Explanation || '' }, 
            e5: { name: getName(iE5), exp: iE5?.Explanation || '' }
        };

        const res = await fetch(`${API_BASE_URL}/api/generate-script`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fullCode, niche: CURRENT_NICHE, productBase,
                scrapedData: GLOBAL_SCRAPED_DATA,
                imageUrl: GLOBAL_IMAGE_URL,
                spentCodes, eData
            })
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        let badges = [];
        if (data.hasImage) badges.push(`<span style="background:#fce7f3; color:#be185d; padding:2px 6px; border-radius:4px; font-size:12px; margin-left:5px;">👁️ AI OCR Vision</span>`);

        const badgesHtml = badges.join('');
        const rawScriptText = data.script;

        const promptBtnHtml = `<button onclick="window.togglePromptForm('${fullCode}')" id="prompt-btn-${fullCode}" class="modern-action-btn btn-prompt">🎬 Prompt</button>`;
        const copyBtnHtml = `<button onclick="window.copyScript('${fullCode}')" id="copy-btn-${fullCode}" class="modern-action-btn btn-copy">📋 Copy Script</button>`;
        const saveBtnHtml = `<button onclick="window.saveScript('${fullCode}')" id="save-btn-${fullCode}" class="modern-action-btn btn-save">💾 Save</button>`;

        const scriptHtml = `
            <div style="margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;background:#fff;padding:12px 16px;border-radius:8px;border:1px solid #e2e8f0;gap:10px;flex-wrap:wrap;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                <div style="font-size:14px; color:#1e293b;"><strong>🤖 Content Created For [${productBase}]:</strong> ${badgesHtml}</div>
                <div style="display:flex;gap:10px;align-items:center;">
                    ${promptBtnHtml}
                    ${copyBtnHtml}
                    ${saveBtnHtml}
                </div>
            </div>
            <div style="white-space:pre-wrap; padding:0 8px; font-size:14.5px; color:#334155; line-height:1.7;">${data.script}</div>
        `;

        resultBox.innerHTML = scriptHtml;
        AI_CACHE.set(fullCode, { scriptHtml, rawScript: rawScriptText, expanded: true });
        saveStateToCache(); 
        
        window.renderReviewView();

    } catch (err) {
        resultBox.innerHTML = `<span style="color:red;">❌ Lỗi: ${err.message}</span>`;
    } finally {
        btn.disabled = false;
        btn.innerText = "✨ Redo";
    }
}

window.generateShootingPrompt = async function(fullCode) {
    const cacheData = AI_CACHE.get(fullCode);
    if (!cacheData || !cacheData.rawScript) return alert("Please generate Content first!");

    const recipientInput = document.getElementById(`prompt-recipient-${fullCode}`);
    const resultBox = document.getElementById(`prompt-result-${fullCode}`);
    const btn = document.getElementById(`btn-gen-prompt-${fullCode}`);

    const recipientDesc = recipientInput.value.trim();

    if (!recipientDesc) return alert("Vui lòng điền thông tin nhân vật và đối tượng nhận quà.");

    recipientInput.setAttribute('value', recipientDesc);

    btn.innerText = "⏳...";
    btn.disabled = true;
    resultBox.style.display = 'block';
    resultBox.innerHTML = `<i>⏳ Generating Shooting Prompt...</i>`;

    try {
        const res = await fetch(`${API_BASE_URL}/api/generate-ugc-prompt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                script: cacheData.rawScript,
                recipientDesc: recipientDesc
            })
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Server error (${res.status}): ${errText.substring(0, 100)}`);
        }

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        const copyPromptStr = `navigator.clipboard.writeText(document.getElementById('prompt-text-${fullCode}').innerText.trim()); this.innerText='✅ Copied!'; setTimeout(()=>this.innerText='📋 Copy Prompt', 2000);`;
        
        resultBox.innerHTML = `
            <div style="display:flex; justify-content:flex-end; gap:8px; margin-bottom:12px;" id="prompt-actions-wrapper-${fullCode}">
                <button onclick="window.editPrompt('${fullCode}')" id="edit-prompt-btn-${fullCode}" style="padding: 6px 12px; border: 1px solid #bae6fd; border-radius: 6px; cursor: pointer; background: #f0f9ff; font-weight: 600; color: #0369a1; font-size: 12px; transition:all 0.2s;" onmouseover="this.style.background='#e0f2fe'" onmouseout="this.style.background='#f0f9ff'">✏️ Edit</button>
                <button onclick="${copyPromptStr}" id="copy-prompt-btn-${fullCode}" style="padding: 6px 12px; border: 1px solid #fed7aa; border-radius: 6px; cursor: pointer; background: #fff7ed; font-weight: 600; color: #c2410c; font-size: 12px; transition:all 0.2s;" onmouseover="this.style.background='#ffedd5'" onmouseout="this.style.background='#fff7ed'">📋 Copy Prompt</button>
                <button onclick="window.generateVideo('${fullCode}')" id="video-btn-${fullCode}" style="padding: 6px 12px; border: 1px solid #c084fc; border-radius: 6px; cursor: pointer; background: #f5f3ff; font-weight: 600; color: #6d28d9; font-size: 12px; transition:all 0.2s;" onmouseover="this.style.background='#ede9fe'" onmouseout="this.style.background='#f5f3ff'">🎥 Generate Video</button>
            </div>
            <div id="prompt-text-${fullCode}" class="prompt-view-box">${data.prompt}</div>
        `;

        cacheData.promptRecipient = recipientDesc;
        cacheData.shootingPrompt = data.prompt;
        cacheData.videoGenStatus = '';
        cacheData.videoGenTime = 0;
        
        AI_CACHE.set(fullCode, cacheData);
        saveStateToCache();
    } catch (err) {
        resultBox.innerHTML = `<span style="color:red;">❌ Error: ${err.message}</span>`;
    } finally {
        btn.innerText = "✨ Generate";
        btn.disabled = false;
    }
}

window.editPrompt = function(code) {
    const textDiv = document.getElementById(`prompt-text-${code}`);
    const currentText = textDiv.innerText;
    
    const actionWrapper = document.getElementById(`prompt-actions-wrapper-${code}`);
    if (actionWrapper) actionWrapper.style.display = 'none';
    
    textDiv.classList.remove('prompt-view-box');
    
    textDiv.innerHTML = `
    <textarea id="prompt-textarea-${code}" style="width:100%; min-height:450px; padding:15px; font-family:inherit; font-size:14px; border:1px solid #cbd5e1; border-radius:6px; outline:none; transition:border 0.2s; box-sizing:border-box; resize:vertical; line-height:1.6;" onfocus="this.style.borderColor='#ea580c'">${currentText}</textarea>
    <div style="margin-top:12px; display:flex; gap:10px; justify-content:flex-end;">
        <button onclick="window.cancelPromptEdit('${code}')" style="background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; padding:8px 16px; border-radius:6px; font-weight:600; cursor:pointer; font-size:13px; transition:0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">✖ Cancel</button>
        <button onclick="window.savePromptEdit('${code}')" style="background:#10b981; color:white; border:none; padding:8px 16px; border-radius:6px; font-weight:600; cursor:pointer; font-size:13px; transition:0.2s;" onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'">💾 Save Edit</button>
    </div>`;
};

window.savePromptEdit = function(code) {
    const textarea = document.getElementById(`prompt-textarea-${code}`);
    if(!textarea) return;
    const newText = textarea.value;
    const textDiv = document.getElementById(`prompt-text-${code}`);
    
    textDiv.innerHTML = '';
    textDiv.classList.add('prompt-view-box');
    textDiv.innerText = newText; 
    
    const cacheData = AI_CACHE.get(code);
    if(cacheData) {
        cacheData.shootingPrompt = newText;
        AI_CACHE.set(code, cacheData);
        saveStateToCache();
    }
    
    const actionWrapper = document.getElementById(`prompt-actions-wrapper-${code}`);
    if (actionWrapper) actionWrapper.style.display = 'flex';
};

window.cancelPromptEdit = function(code) {
    const cacheData = AI_CACHE.get(code);
    const originalText = cacheData ? cacheData.shootingPrompt : '';
    const textDiv = document.getElementById(`prompt-text-${code}`);
    
    textDiv.innerHTML = '';
    textDiv.classList.add('prompt-view-box');
    textDiv.innerText = originalText;
    
    const actionWrapper = document.getElementById(`prompt-actions-wrapper-${code}`);
    if (actionWrapper) actionWrapper.style.display = 'flex';
};

// =====================================================================
// LUỒNG: GỌI API BYTEPLUS (SEEDANCE) TRONG NỀN MƯỢT MÀ
// =====================================================================

window.generateVideo = async function(fullCode) {
    const cacheData = AI_CACHE.get(fullCode);
    if (!cacheData || !cacheData.shootingPrompt) return alert("Không tìm thấy Prompt!");

    // Cập nhật trạng thái Cache ngay lập tức
    cacheData.videoGenStatus = 'generating';
    cacheData.videoGenTime = 0;
    AI_CACHE.set(fullCode, cacheData);
    saveStateToCache();

    // Cập nhật UI ngay nếu DOM đang tồn tại
    const initialBtn = document.getElementById(`video-btn-${fullCode}`);
    if (initialBtn) {
        initialBtn.innerText = "⏳ Requesting...";
        initialBtn.disabled = true;
        initialBtn.style.opacity = "0.7";
        initialBtn.style.cursor = "not-allowed";
    }

    try {
        const res = await fetch(`${API_BASE_URL}/api/generate-video`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: cacheData.shootingPrompt,
                imageUrl: GLOBAL_IMAGE_URL
            })
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);
        if (!data.taskId) throw new Error("Không nhận được Task ID từ hệ thống.");

        const taskId = data.taskId;

        // Vòng lặp đếm giờ độc lập, tự tìm DOM mỗi lần chạy
        const pollInterval = setInterval(async () => {
            const cData = AI_CACHE.get(fullCode);
            if(!cData) { clearInterval(pollInterval); return; }

            cData.videoGenTime = (cData.videoGenTime || 0) + 5;
            AI_CACHE.set(fullCode, cData);
            
            // Tìm nút hiện tại (đề phòng user đổi tab về lại sinh ra DOM mới)
            const currentBtn = document.getElementById(`video-btn-${fullCode}`);
            if (currentBtn && cData.videoGenStatus === 'generating') {
                currentBtn.innerText = `⏳ Generating (${cData.videoGenTime}s)...`;
            }

            try {
                const statusRes = await fetch(`${API_BASE_URL}/api/check-video/${taskId}`);
                const statusData = await statusRes.json();

                if (statusData.status === 'succeeded' || statusData.status === 'SUCCEEDED') {
                    clearInterval(pollInterval);
                    cData.videoGenStatus = 'succeeded';
                    AI_CACHE.set(fullCode, cData);
                    
                    // Cập nhật Token UI
                    if (statusData.usage && statusData.usage > 0) {
                        window.BYTEPLUS_TOTAL_TOKENS += statusData.usage;
                        localStorage.setItem('bp_total_tokens', window.BYTEPLUS_TOTAL_TOKENS);
                        window.updateTokenDisplay();
                    }

                    saveStateToCache();

                    if (currentBtn) {
                        currentBtn.innerText = "✅ Video Ready!";
                        currentBtn.style.background = "#10b981";
                        currentBtn.style.color = "white";
                        currentBtn.style.opacity = "1";
                        currentBtn.style.cursor = "default";
                    }

                    const pbElement = document.querySelector('#pb-container span[style*="color: #bf360c"]');
                    const productBase = pbElement ? pbElement.innerText : (GLOBAL_PRODUCT_BASE || "Product");

                    // Đẩy dữ liệu mới sinh lên thẳng Lark Base Gallery
                    try {
                        await fetch(`${API_BASE_URL}/api/gallery`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                code: fullCode,
                                productBase: productBase,
                                targetCode: GLOBAL_TARGET_CODE || fullCode.substring(0,3),
                                videoUrl: statusData.videoUrl,
                                imageUrl: GLOBAL_IMAGE_URL,
                                prompt: cData.shootingPrompt
                            })
                        });
                        alert(`✅ Video cho mã [${fullCode}] đã tạo xong và lưu vào Cloud Gallery!`);
                    } catch(errGal) {
                        console.error("Lưu Gallery Cloud thất bại:", errGal);
                    }
                    
                } else if (statusData.status === 'failed' || statusData.status === 'FAILED') {
                    clearInterval(pollInterval);
                    throw new Error(statusData.error || "Video generation failed.");
                }
            } catch (pollErr) {
                clearInterval(pollInterval);
                cData.videoGenStatus = 'failed';
                AI_CACHE.set(fullCode, cData);
                saveStateToCache();
                
                const errBtn = document.getElementById(`video-btn-${fullCode}`);
                if (errBtn) {
                    errBtn.innerText = "🎥 Generate Video";
                    errBtn.disabled = false;
                    errBtn.style.opacity = "1";
                    errBtn.style.cursor = "pointer";
                }
                console.error("Lỗi kiểm tra video:", pollErr.message);
            }

            if (cData.videoGenTime >= 600) { // Giới hạn 10 phút
                clearInterval(pollInterval);
                cData.videoGenStatus = 'failed';
                AI_CACHE.set(fullCode, cData);
                saveStateToCache();
                
                const timeoutBtn = document.getElementById(`video-btn-${fullCode}`);
                if (timeoutBtn) {
                    timeoutBtn.innerText = "🎥 Generate Video";
                    timeoutBtn.disabled = false;
                    timeoutBtn.style.opacity = "1";
                    timeoutBtn.style.cursor = "pointer";
                }
                alert(`⏳ Quá thời gian chờ (10 phút) tạo video cho mã [${fullCode}].`);
            }
        }, 5000);

    } catch (err) {
        cacheData.videoGenStatus = 'failed';
        AI_CACHE.set(fullCode, cacheData);
        saveStateToCache();
        
        const errBtn = document.getElementById(`video-btn-${fullCode}`);
        if(errBtn) {
            errBtn.innerText = "🎥 Generate Video";
            errBtn.disabled = false;
            errBtn.style.opacity = "1";
            errBtn.style.cursor = "pointer";
        }
        alert(`❌ Lỗi tạo video: ${err.message}`);
    }
};

function adjustTooltip(e, tooltip) {
    const gap = 15; let x = e.pageX + gap; let y = e.pageY + gap;
    const ttWidth = tooltip.offsetWidth; const ttHeight = tooltip.offsetHeight;
    if (x + ttWidth > window.innerWidth + window.scrollX - 20) x = e.pageX - ttWidth - gap;
    if (y + ttHeight > window.innerHeight + window.scrollY - 20) y = e.pageY - ttHeight - gap;
    tooltip.style.left = x + 'px'; tooltip.style.top = y + 'px';
}

document.addEventListener('mouseover', (e) => {
    const box = e.target.closest('.code-box');
    if (box && box.dataset.code) {
        const { type, code } = box.dataset;
        const info = typeof ELEMENTS_DATA !== 'undefined' ? ELEMENTS_DATA[type]?.find(i => i.Code.toString().padStart(2, '0') == code.padStart(2, '0')) : null;
        if (info) {
            const tt = document.getElementById('tooltip');
            const name = info.Detail || info.Hook || info['Insights to niches'] || info.CTA || info['Source/Video Type'] || "N/A";
            tt.innerHTML = `<b>${name}</b><i>${info.Explanation || ''}</i>`;
            tt.style.display = 'block';
        }
    }

    const fullCodeElem = e.target.closest('.full-code-text');
    if (fullCodeElem && fullCodeElem.dataset.full && typeof ELEMENTS_DATA !== 'undefined') {
        const full = fullCodeElem.dataset.full;
        const tt = document.getElementById('fullcode-tooltip');
        const parts = [
            { t: 'E1', c: full.substring(0, 2), l: 'Hook' }, { t: 'E2', c: full.substring(2, 4), l: 'Angle' },
            { t: 'E3', c: full.substring(4, 6), l: 'Source' }, { t: 'E4', c: full.substring(6, 8), l: 'Insight' },
            { t: 'E5', c: full.substring(8, 10), l: 'CTA' }
        ];
        let html = `<b style="margin-bottom:8px">Chain: ${full}</b><table class="preview-table"><tr><th>Type</th><th>Code</th><th>Name</th></tr>`;
        parts.forEach(p => {
            const info = ELEMENTS_DATA[p.t]?.find(i => i.Code.toString().padStart(2, '0') == p.c);
            const name = info ? (info.Detail || info.Hook || info['Insights to niches'] || info.CTA || info['Source/Video Type'] || 'N/A') : 'Unknown';
            html += `<tr><td>${p.l}</td><td>${p.c}</td><td>${name}</td></tr>`;
        });
        tt.innerHTML = html + `</table>`;
        tt.style.display = 'block';
    }
});

document.addEventListener('mousemove', (e) => {
    const tt1 = document.getElementById('tooltip'); const tt2 = document.getElementById('fullcode-tooltip');
    if (tt1 && tt1.style.display === 'block') adjustTooltip(e, tt1);
    if (tt2 && tt2.style.display === 'block') adjustTooltip(e, tt2);
});

document.addEventListener('mouseout', (e) => {
    if (e.target.closest('.code-box')) document.getElementById('tooltip').style.display = 'none';
    if (e.target.closest('.full-code-text')) document.getElementById('fullcode-tooltip').style.display = 'none';
});

window.copyScript = function(fullCode) {
    const cacheData = AI_CACHE.get(fullCode);
    if (!cacheData || !cacheData.rawScript) return;
    
    const contentToCopy = cacheData.rawScript; 
    
    const cleanedScript = contentToCopy
        .split('\n')
        .map(line => line.replace(/^\[\d+:\d+-\d+:\d+\]\s*/, ''))
        .join('\n');

    navigator.clipboard.writeText(cleanedScript).then(() => {
        const copyBtn = document.getElementById(`copy-btn-${fullCode}`);
        if (copyBtn) {
            copyBtn.innerText = '✅ Copied!';
            setTimeout(() => { copyBtn.innerText = '📋 Copy Script'; }, 2000);
        }
    }).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = cleanedScript;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
    });
};

// ==========================================
// STORE DATA LARK BASE
// ==========================================
window.buildStoreUI = function() {
    const storePane = document.getElementById('view-store');
    if (!storePane) return; 

    let listContainer = document.getElementById('store-container-wrap');
    if (!listContainer) {
        storePane.innerHTML = `
            <header class="top-nav">
                <h2>Cloud Script Store</h2>
                <button class="btn-danger" onclick="window.clearStore()" style="font-size:13px; padding:6px 14px;">🗑️ Clear All</button>
            </header>
            <section class="card" id="store-container-wrap">
                <div id="store-toolbar" style="display:flex; gap:10px; margin-bottom:16px; flex-wrap:wrap; align-items:center;">
                    <input type="text" id="store-search" placeholder="Search by code or product..." oninput="window.updateStoreUI()" style="flex:1; min-width:200px; padding:8px; border:1px solid #cbd5e1; border-radius:6px; outline:none;">
                    <select id="store-sort" onchange="window.updateStoreUI()" style="padding:8px 10px; border-radius:6px; border:1px solid #cbd5e1; font-size:13px; outline:none;">
                        <option value="newest">Newest first</option>
                        <option value="oldest">Oldest first</option>
                        <option value="code">By code A–Z</option>
                    </select>
                    <label style="display:flex; align-items:center; gap:5px; cursor:pointer; font-size:13px; font-weight:bold; color:#d97706; background:#fef3c7; padding:6px 12px; border-radius:6px; border:1px solid #fde68a;">
                        <input type="checkbox" id="check-fav-only" onchange="window.updateStoreUI()" style="cursor:pointer; accent-color: #ea580c;">
                        ⭐ Favorites Only
                    </label>
                </div>
                <div id="store-count" style="font-size:13px; color:#64748b; margin-bottom:12px;"></div>
                <div id="store-list" style="min-height: 100px;"></div>
                <div id="store-empty" style="padding:40px; text-align:center; color:#94a3b8; display:none;">No scripts saved yet.</div>
            </section>
        `;
    }
};

window.renderStore = async function() {
    window.buildStoreUI();
    const listDiv = document.getElementById('store-list');
    if(!listDiv) return;

    listDiv.innerHTML = "<p style='text-align:center; color:#999; padding:40px;'>⏳ Đang tải dữ liệu từ máy chủ đám mây...</p>";
    
    try {
        const res = await fetch(`${API_BASE_URL}/api/store?t=${Date.now()}`);
        let store = await res.json();
        window.STORE_DATA_CACHE = store;
        window.currentStoreFilter = 'all'; 
        window.updateStoreUI();
    } catch (e) {
        listDiv.innerHTML = `<span style="color:red; display:block; padding:40px; text-align:center;">Lỗi kết nối Server: ${e.message}</span>`;
    }
}

window.updateStoreUI = function() {
    const listDiv = document.getElementById('store-list');
    const emptyDiv = document.getElementById('store-empty');
    const countDiv = document.getElementById('store-count');
    
    const searchVal = document.getElementById('store-search')?.value.toLowerCase() || "";
    const sortVal = document.getElementById('store-sort')?.value || "newest";
    const isFavOnly = document.getElementById('check-fav-only')?.checked || false;

    if(!listDiv) return;

    let filtered = window.STORE_DATA_CACHE.filter(s => {
        if (window.currentStoreFilter !== 'all' && s.targetCode !== window.currentStoreFilter) return false;
        if (isFavOnly && !s.isFavorite) return false;
        
        return s.code.toLowerCase().includes(searchVal) || 
               (s.productBase && s.productBase.toLowerCase().includes(searchVal)) ||
               (s.targetCode && s.targetCode.toLowerCase().includes(searchVal));
    });

    if (sortVal === 'oldest') filtered.sort((a,b) => new Date(a.date) - new Date(b.date));
    else if (sortVal === 'code') filtered.sort((a,b) => a.code.localeCompare(b.code));
    else filtered.sort((a,b) => new Date(b.date) - new Date(a.date));

    if(countDiv) countDiv.innerText = `${filtered.length} SCRIPT(S) FOUND ON CLOUD`;

    if (filtered.length === 0) {
        listDiv.innerHTML = '';
        if(emptyDiv) emptyDiv.style.display = 'block';
        return;
    }

    if(emptyDiv) emptyDiv.style.display = 'none';

    let groupCounts = { 'ALL': window.STORE_DATA_CACHE.length };
    window.STORE_DATA_CACHE.forEach(s => {
        const tc = s.targetCode || 'OTHER';
        groupCounts[tc] = (groupCounts[tc] || 0) + 1;
    });

    let sidebarHtml = `<div style="min-width: 140px; border-right: 1px solid #e2e8f0; padding-right: 15px; display: flex; flex-direction: column; gap: 8px;">
            <div onclick="window.currentStoreFilter='all'; window.updateStoreUI()" style="padding: 10px; border-radius: 6px; cursor: pointer; text-align: center; font-weight: bold; transition: 0.2s; ${window.currentStoreFilter === 'all' ? 'background: #ea580c; color: white;' : 'background: #f8fafc; color: #64748b;'}">
                ALL <br><span style="font-size:12px; opacity:0.8;">${groupCounts['ALL']}</span>
            </div>`;

    Object.keys(groupCounts).forEach(tc => {
        if (tc === 'ALL') return;
        const shortTc = tc.length > 5 ? tc.substring(tc.length - 2) : tc; 
        sidebarHtml += `
            <div onclick="window.currentStoreFilter='${tc}'; window.updateStoreUI()" style="padding: 10px; border-radius: 6px; cursor: pointer; text-align: center; font-weight: bold; font-size: 13px; transition: 0.2s; ${window.currentStoreFilter === tc ? 'background: #ffedd5; border-left: 4px solid #ea580c; color: #ea580c;' : 'color: #94a3b8;'}">
                ${shortTc} <br><span style="font-size:11px; opacity:0.8;">${groupCounts[tc]}</span>
            </div>
        `;
    });
    sidebarHtml += `</div>`;

    let cardsHtml = `<div style="flex: 1; display: flex; flex-direction: column; gap: 15px;">`;
    
    filtered.forEach(s => {
        const cleanContent = s.content.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const dateStr = new Date(s.date).toLocaleString();
        
        const starColor = s.isFavorite ? '#eab308' : '#cbd5e1';
        const starFill = s.isFavorite ? '★' : '☆';
        
        cardsHtml += `
            <div style="background:#fff; border:1px solid ${s.isFavorite ? '#fde68a' : '#e2e8f0'}; border-radius:8px; padding:15px; box-shadow:0 1px 3px rgba(0,0,0,0.05); position:relative;">
                <div style="position:absolute; top:15px; left:15px;">
                    <button onclick="window.toggleFavorite('${s.id}')" title="Toggle Favorite" style="background:none; border:none; cursor:pointer; font-size:24px; color:${starColor}; padding:0; line-height:1; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">${starFill}</button>
                </div>
                <div style="margin-left: 35px;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px; flex-wrap:wrap; gap:10px;">
                        <div>
                            <div style="display:flex; align-items:center; gap:10px; margin-bottom:5px;">
                                <span style="font-size:16px; font-weight:800; color:#ea580c;">${s.code}</span>
                                <span style="font-size:11px; background:#fff7ed; padding:3px 8px; border-radius:12px; color:#c2410c; border: 1px solid #ffedd5; font-weight: bold;">${s.productBase}</span>
                            </div>
                            <div style="font-size:12px; color:#94a3b8; font-weight:500;">
                                Ref: ${s.targetCode || 'N/A'} • ${dateStr}
                            </div>
                        </div>
                        <div style="display:flex; gap:8px;">
                            <button onclick="navigator.clipboard.writeText(\`${cleanContent}\`); this.innerText='✅ Copied!'; setTimeout(()=>this.innerText='📋 Copy', 2000);" style="background:#f8fafc; border:1px solid #cbd5e1; padding:5px 12px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:600; color:#475569;">📋 Copy</button>
                            <button onclick="window.downloadText(\`${s.code}\`, \`${cleanContent}\`)" style="background:#f0fdf4; border:1px solid #bbf7d0; padding:5px 12px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:600; color:#166534;">⬇ Download</button>
                            <button onclick="window.deleteScript('${s.id}')" style="background:#fef2f2; border:1px solid #fca5a5; padding:5px 12px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:600; color:#dc2626;" title="Xóa khỏi Server">🗑️</button>
                        </div>
                    </div>
                    <div style="background:#f8fafc; padding:12px; border-radius:6px; font-size:13px; line-height:1.6; color:#475569; max-height:200px; overflow-y:auto; border:1px solid #f1f5f9; white-space:pre-wrap;">${s.content}</div>
                </div>
            </div>
        `;
    });
    cardsHtml += `</div>`;

    listDiv.innerHTML = `<div style="display: flex; gap: 20px; align-items: flex-start;">${sidebarHtml}${cardsHtml}</div>`;
}

window.toggleFavorite = async function(id) {
    try {
        const item = window.STORE_DATA_CACHE.find(s => s.id === id);
        if(item) {
            item.isFavorite = !item.isFavorite;
            window.updateStoreUI();
        }
        await fetch(`${API_BASE_URL}/api/store/${id}/favorite`, { method: 'PATCH' });
    } catch(e) {
        alert("Lỗi khi cập nhật Cloud!");
    }
}

window.saveScript = async function(fullCode) {
    const cacheData = AI_CACHE.get(fullCode);
    if (!cacheData || !cacheData.rawScript) return;
    
    const productBase = GLOBAL_PRODUCT_BASE || "Personalized Custom Gift";
    let finalContent = cacheData.rawScript;
    
    if (cacheData.shootingPrompt) {
        finalContent += "\n\n=== 🎬 VIDEO SHOOTING PROMPT ===\n\n" + cacheData.shootingPrompt;
    }

    const btn = document.getElementById(`save-btn-${fullCode}`);
    if (btn) {
        btn.innerText = "⏳ Saving...";
        btn.disabled = true;
    }

    try {
        const payload = {
            code: fullCode,
            productBase: productBase,
            targetCode: GLOBAL_TARGET_CODE || fullCode,
            content: finalContent
        };

        const res = await fetch(`${API_BASE_URL}/api/store`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error("Failed to save");
        
        if (btn) {
            btn.innerText = "✅ Saved!";
            setTimeout(() => { btn.innerText = "💾 Save"; btn.disabled = false; }, 2000);
        }
        
        if (document.getElementById('view-store') && document.getElementById('view-store').classList.contains('active')) {
            window.renderStore();
        }
    } catch (e) {
        console.error("Lỗi:", e);
        alert("Có lỗi khi lưu lên Cloud. Vui lòng thử lại!");
        if (btn) { btn.innerText = "💾 Save"; btn.disabled = false; }
    }
};

window.deleteScript = async function(id) {
    if(!confirm("Xóa kịch bản này khỏi đám mây chung?")) return;
    try {
        window.STORE_DATA_CACHE = window.STORE_DATA_CACHE.filter(s => s.id !== id);
        window.updateStoreUI();
        await fetch(`${API_BASE_URL}/api/store/${id}`, { method: 'DELETE' });
    } catch(e) { alert("Lỗi khi xóa!"); }
}

window.clearStore = async function() {
    if(!confirm("⚠️ CẢNH BÁO: Xóa TẤT CẢ kịch bản? Dữ liệu toàn cầu sẽ biến mất!")) return;
    try {
        window.STORE_DATA_CACHE = [];
        window.updateStoreUI();
        await fetch(`${API_BASE_URL}/api/store`, { method: 'DELETE' });
    } catch(e) { alert("Lỗi khi xóa!"); }
}

window.downloadText = function(code, content) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${code}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// =====================================================================
// MỚI: SCENE GALLERY ĐỒNG BỘ CLOUD VỚI MULTI-FILTER VÀ SIDEBAR
// =====================================================================
window.GALLERY_DATA_CACHE = [];
window.galleryFilters = { pb: 'all', niche: 'all', idea: 'all' };

window.buildGalleryUI = function() {
    const galleryPane = document.getElementById('view-gallery');
    if (!galleryPane) return;

    let wrap = document.getElementById('gallery-container-wrap');
    if (!wrap) {
        galleryPane.innerHTML = `
            <header class="top-nav">
                <h2>Cloud Scene Gallery</h2>
            </header>
            <section class="card" id="gallery-container-wrap">
                <div id="gallery-toolbar" style="display:flex; gap:10px; margin-bottom:16px; flex-wrap:wrap; align-items:center; background:#f8fafc; padding:10px; border-radius:6px; border:1px solid #e2e8f0;">
                    <strong style="color:#64748b; font-size:13px; margin-right:10px;">LỌC:</strong>
                    <select id="gal-pb-filter" onchange="window.updateGalleryUI(true)" style="padding:6px; border-radius:4px; border:1px solid #cbd5e1; font-size:13px; min-width:150px;"><option value="all">All Product Bases</option></select>
                    <select id="gal-niche-filter" onchange="window.updateGalleryUI(true)" style="padding:6px; border-radius:4px; border:1px solid #cbd5e1; font-size:13px; min-width:120px;"><option value="all">All Niches</option></select>
                    <select id="gal-idea-filter" onchange="window.updateGalleryUI(true)" style="padding:6px; border-radius:4px; border:1px solid #cbd5e1; font-size:13px; min-width:120px;"><option value="all">All Ideas (E5)</option></select>
                </div>
                <div style="display:flex; gap:20px; align-items:flex-start;">
                    <div id="gallery-sidebar" style="min-width:140px; border-right:1px solid #e2e8f0; padding-right:15px; display:flex; flex-direction:column; gap:8px;"></div>
                    <div id="gallery-grid" class="gallery-grid"></div>
                </div>
                <div id="gallery-empty" style="padding:40px; text-align:center; color:#94a3b8; display:none; width:100%;">No videos in Cloud Gallery yet.</div>
            </section>
        `;
    }
};

window.renderGalleryView = async function() {
    window.buildGalleryUI();
    const gridDiv = document.getElementById('gallery-grid');
    if(!gridDiv) return;

    gridDiv.innerHTML = "<p style='color:#999; padding:40px; width:100%; text-align:center;'>⏳ Đang tải dữ liệu Gallery từ Cloud...</p>";
    
    try {
        const res = await fetch(`${API_BASE_URL}/api/gallery?t=${Date.now()}`);
        let gallery = await res.json();
        window.GALLERY_DATA_CACHE = gallery;
        window.currentGalleryTarget = 'all'; // Biến dùng cho Sidebar
        window.updateGalleryUI(false);
    } catch (e) {
        gridDiv.innerHTML = `<span style="color:red; display:block; padding:40px; text-align:center;">Lỗi kết nối Gallery: ${e.message}</span>`;
    }
};

window.updateGalleryUI = function(isFromDropdown = false) {
    const gridDiv = document.getElementById('gallery-grid');
    const sidebarDiv = document.getElementById('gallery-sidebar');
    const emptyDiv = document.getElementById('gallery-empty');
    
    // Nếu có tác động từ Select box thì lấy giá trị lọc mới
    if (isFromDropdown) {
        window.galleryFilters.pb = document.getElementById('gal-pb-filter')?.value || 'all';
        window.galleryFilters.niche = document.getElementById('gal-niche-filter')?.value || 'all';
        window.galleryFilters.idea = document.getElementById('gal-idea-filter')?.value || 'all';
    }

    // Tiến hành lọc dữ liệu
    let filtered = window.GALLERY_DATA_CACHE.filter(item => {
        const code = item.code || item.fullCode || "";
        const niche = code.length >= 3 ? code.substring(0,3) : "";
        const idea = code.length >= 10 ? code.substring(8,10) : "";
        const pb = item.productBase || "";

        if (window.currentGalleryTarget !== 'all' && item.targetCode !== window.currentGalleryTarget) return false;
        if (window.galleryFilters.pb !== 'all' && pb !== window.galleryFilters.pb) return false;
        if (window.galleryFilters.niche !== 'all' && niche !== window.galleryFilters.niche) return false;
        if (window.galleryFilters.idea !== 'all' && idea !== window.galleryFilters.idea) return false;

        return true;
    });

    // Tạo Dropdown cho lần chạy đầu tiên (isFromDropdown = false)
    if (!isFromDropdown) {
        let pbSet = new Set(), nicheSet = new Set(), ideaSet = new Set();
        window.GALLERY_DATA_CACHE.forEach(item => {
            const code = item.code || item.fullCode || "";
            if(item.productBase) pbSet.add(item.productBase);
            if(code.length >= 3) nicheSet.add(code.substring(0,3));
            if(code.length >= 10) ideaSet.add(code.substring(8,10));
        });

        const popSelect = (id, set, def) => {
            const el = document.getElementById(id);
            if(!el) return;
            el.innerHTML = `<option value="all">${def}</option>` + Array.from(set).sort().map(val => `<option value="${val}">${val}</option>`).join('');
            el.value = 'all';
        };
        popSelect('gal-pb-filter', pbSet, 'All Product Bases');
        popSelect('gal-niche-filter', nicheSet, 'All Niches');
        popSelect('gal-idea-filter', ideaSet, 'All Ideas (E5)');
    }

    // Render Sidebar Group By Target Code
    let preFiltered = window.GALLERY_DATA_CACHE.filter(item => {
        const code = item.code || item.fullCode || "";
        const niche = code.length >= 3 ? code.substring(0,3) : "";
        const idea = code.length >= 10 ? code.substring(8,10) : "";
        const pb = item.productBase || "";
        if (window.galleryFilters.pb !== 'all' && pb !== window.galleryFilters.pb) return false;
        if (window.galleryFilters.niche !== 'all' && niche !== window.galleryFilters.niche) return false;
        if (window.galleryFilters.idea !== 'all' && idea !== window.galleryFilters.idea) return false;
        return true;
    });

    let groupCounts = { 'ALL': preFiltered.length };
    preFiltered.forEach(s => {
        const tc = s.targetCode || 'OTHER';
        groupCounts[tc] = (groupCounts[tc] || 0) + 1;
    });

    let sidebarHtml = `
        <div onclick="window.currentGalleryTarget='all'; window.updateGalleryUI(false)" style="padding: 10px; border-radius: 6px; cursor: pointer; text-align: center; font-weight: bold; transition: 0.2s; ${window.currentGalleryTarget === 'all' ? 'background: #0ea5e9; color: white;' : 'background: #f8fafc; color: #64748b;'}">
            ALL <br><span style="font-size:12px; opacity:0.8;">${groupCounts['ALL']}</span>
        </div>`;
    
    Object.keys(groupCounts).forEach(tc => {
        if (tc === 'ALL') return;
        const shortTc = tc.length > 5 ? tc.substring(tc.length - 2) : tc; 
        sidebarHtml += `
            <div onclick="window.currentGalleryTarget='${tc}'; window.updateGalleryUI(false)" style="padding: 10px; border-radius: 6px; cursor: pointer; text-align: center; font-weight: bold; font-size: 13px; transition: 0.2s; ${window.currentGalleryTarget === tc ? 'background: #e0f2fe; border-left: 4px solid #0ea5e9; color: #0ea5e9;' : 'color: #94a3b8;'}">
                ${shortTc} <br><span style="font-size:11px; opacity:0.8;">${groupCounts[tc]}</span>
            </div>
        `;
    });
    if(sidebarDiv) sidebarDiv.innerHTML = sidebarHtml;

    // Hiển thị Grid Thẻ Video
    if (filtered.length === 0) {
        if (gridDiv) gridDiv.innerHTML = '';
        if(emptyDiv) emptyDiv.style.display = 'block';
        return;
    }
    if(emptyDiv) emptyDiv.style.display = 'none';

    let cardsHtml = '';
    filtered.forEach(data => {
        const fullC = data.code || data.fullCode;
        const mediaHtml = data.videoUrl
            ? `<video class="gallery-video" src="${data.videoUrl}" controls controlsList="nodownload" preload="metadata" poster="${data.imageUrl || ''}"></video>`
            : `<a href="${data.imageUrl}" target="_blank"><img src="${data.imageUrl}" style="width: 100%; height: 100%; object-fit: contain; background:#000;"></a>`;

        cardsHtml += `
            <div class="gallery-card">
                <div style="width: 100%; aspect-ratio: 9 / 16; background: #000; overflow: hidden; display: flex; justify-content: center; align-items: center; position:relative;">
                    <button onclick="window.deleteGalleryItem('${data.id}')" style="position:absolute; top:8px; right:8px; background:rgba(255,255,255,0.9); border:1px solid #fca5a5; border-radius:4px; color:#dc2626; cursor:pointer; font-size:14px; padding:4px 6px; z-index:10;" title="Xóa khỏi Cloud">🗑️</button>
                    ${mediaHtml}
                </div>
                <div style="padding: 15px; border-top: 1px solid #e2e8f0; flex-grow: 1; display: flex; flex-direction: column;">
                    <h4 style="margin: 0 0 5px 0; font-size: 14px; color: #0ea5e9;">Code: ${fullC}</h4>
                    <p style="margin: 0 0 10px 0; font-size: 12px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-transform: uppercase; font-weight: 600;" title="${data.productBase}">${data.productBase}</p>
                    <button onclick="window.showCloudGalScriptModal('${data.id}')" style="width: 100%; padding: 8px; font-weight: bold; color: #334155; font-size: 12px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; cursor: pointer; margin-top: auto;">📝 Check Prompt</button>
                </div>
            </div>
        `;
    });
    if(gridDiv) gridDiv.innerHTML = cardsHtml;
};

window.showCloudGalScriptModal = function(id) {
    const data = window.GALLERY_DATA_CACHE.find(i => i.id === id);
    if (!data) return;
    
    const promptText = data.prompt || data.script || data.content || '';
    const safePrompt = promptText.replace(/"/g, '&quot;').replace(/`/g, '\\`');
    const copyPromptStr = `navigator.clipboard.writeText(\`${safePrompt}\`); this.innerText='✅ Copied!'; setTimeout(()=>this.innerText='📋 Copy Prompt', 2000);`;
    
    const content = document.getElementById('script-modal-content');
    content.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
            <h3 style="margin:0; color:#0ea5e9;">Prompt for [${data.code || data.fullCode}]</h3>
            <button onclick="${copyPromptStr}" style="padding: 6px 12px; border: 1px solid #bae6fd; border-radius: 6px; cursor: pointer; background: #f0f9ff; font-weight: 600; color: #0369a1; font-size: 12px;">📋 Copy Prompt</button>
        </div>
        <div style="color:#333; white-space:pre-wrap; background:#f8fafc; border:1px solid #e2e8f0; padding:15px; border-radius:6px; font-size:14px; line-height:1.6; max-height: 60vh; overflow-y: auto;">${promptText}</div>
    `;
    document.getElementById('script-modal').style.display = 'flex';
};

window.deleteGalleryItem = async function(id) {
    if(!confirm("Xóa video này khỏi Cloud Gallery?")) return;
    try {
        window.GALLERY_DATA_CACHE = window.GALLERY_DATA_CACHE.filter(s => s.id !== id);
        window.updateGalleryUI(false);
        await fetch(`${API_BASE_URL}/api/gallery/${id}`, { method: 'DELETE' });
    } catch(e) { alert("Lỗi khi xóa!"); }
};
