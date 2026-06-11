/**
 * MACORNER STRATEGY BUILDER
 * FULL AUTO V65 (Fix Tab Jumping, Modal Outside Click, Close Button Overlap)
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
        
        /* CSS Fix Fullscreen Video 9:16 */
        .gallery-video { width: 100%; height: 100%; object-fit: cover; background: #000; }
        .gallery-video::-webkit-media-controls-enclosure { object-fit: contain !important; }
        .gallery-video:-webkit-full-screen { width: 100% !important; height: 100% !important; object-fit: contain !important; background: #000 !important; }
        .gallery-video:-moz-full-screen { width: 100% !important; height: 100% !important; object-fit: contain !important; background: #000 !important; }
        .gallery-video:fullscreen { width: 100% !important; height: 100% !important; object-fit: contain !important; background: #000 !important; }
        
        /* Box Upload Image */
        .custom-upload-area { display: flex; gap: 8px; align-items: center; }
        .upload-thumb-wrap { position: relative; width: 44px; height: 44px; border-radius: 6px; border: 1px solid #cbd5e1; overflow: hidden; background: #f1f5f9; }
        .upload-thumb-wrap img { width: 100%; height: 100%; object-fit: cover; }
        .upload-thumb-del { position: absolute; top: 0; right: 0; background: rgba(220,38,38,0.9); color: white; border: none; font-size: 10px; width: 14px; height: 14px; display: flex; align-items: center; justify-content: center; cursor: pointer; border-bottom-left-radius: 4px; }
        
        .smart-dropdown-item { padding: 8px 12px; cursor: pointer; transition: 0.2s; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #334155; display: flex; align-items: center; gap: 8px; font-weight: 500;}
        .smart-dropdown-item:hover { background: #fef3c7; color: #ea580c; font-weight: bold; }
    </style>`);
}

window.RAW_DATA = [];
window.SELECTED_PAIRS = new Map();
window.FINAL_SELECTED_CODES = new Map();

window.CSV_HEADERS = [];
window.PB_INDEX = -1;

window.GLOBAL_TARGET_CODE = "";
window.GLOBAL_PRODUCT_BASE = "";
window.GLOBAL_SCRAPED_DATA = "";
window.GLOBAL_IMAGE_URL = "";
window.CURRENT_NICHE = "";

window.AI_CACHE = new Map();
window.MIX_OPTIONS_CACHE = new Map(); 

window.MANUAL_E2 = [];
window.MANUAL_E4 = [];
window.CURRENT_MATRIX_LIMIT = 5;

window.CURRENT_RENDERED_E2 = [];
window.CURRENT_RENDERED_E4 = [];
window.CUSTOM_IMAGES = []; 

window.GLOBAL_CACHE_KEY = ""; 

window.BYTEPLUS_TOTAL_TOKENS = parseInt(localStorage.getItem('bp_total_tokens')) || 0;
const API_BASE_URL = 'https://only-breanne-dzt-b25e098f.koyeb.app'; 

window.saveStateToCache = function() {
    if (!window.GLOBAL_CACHE_KEY) return;
    const state = {
        pairs: Array.from(window.SELECTED_PAIRS.entries()),
        finals: Array.from(window.FINAL_SELECTED_CODES.entries()),
        ai: Array.from(window.AI_CACHE.entries()),
        mixes: Array.from(window.MIX_OPTIONS_CACHE.entries()),
        pb: window.GLOBAL_PRODUCT_BASE,
        sd: window.GLOBAL_SCRAPED_DATA,
        img: window.GLOBAL_IMAGE_URL,
        mE2: window.MANUAL_E2,
        mE4: window.MANUAL_E4,
        limit: window.CURRENT_MATRIX_LIMIT,
        customImages: window.CUSTOM_IMAGES
    };
    localStorage.setItem(`macorner_state_${window.GLOBAL_CACHE_KEY}`, JSON.stringify(state));
}

window.loadStateFromCache = function(key) {
    const raw = localStorage.getItem(`macorner_state_${key}`);
    window.SELECTED_PAIRS.clear();
    window.FINAL_SELECTED_CODES.clear();
    window.AI_CACHE.clear();
    window.MIX_OPTIONS_CACHE.clear();
    window.MANUAL_E2 = [];
    window.MANUAL_E4 = [];
    window.CUSTOM_IMAGES = [];

    if (raw) {
        try {
            const state = JSON.parse(raw);
            window.SELECTED_PAIRS = new Map(state.pairs || []);
            window.FINAL_SELECTED_CODES = new Map(state.finals || []);
            window.AI_CACHE = new Map(state.ai || []);
            window.MIX_OPTIONS_CACHE = new Map(state.mixes || []);
            
            if (state.pb) window.GLOBAL_PRODUCT_BASE = state.pb;
            if (state.sd) window.GLOBAL_SCRAPED_DATA = state.sd;
            if (state.img) window.GLOBAL_IMAGE_URL = state.img;
            if (state.mE2) window.MANUAL_E2 = state.mE2 || [];
            if (state.mE4) window.MANUAL_E4 = state.mE4 || [];
            if (state.limit) window.CURRENT_MATRIX_LIMIT = state.limit;
            if (state.customImages) window.CUSTOM_IMAGES = state.customImages || [];
            
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

window.extractNiche = function(adName) {
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

        window.CSV_HEADERS = rows[0].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
        window.PB_INDEX = window.CSV_HEADERS.findIndex(h => h.includes('product base') || h.includes('product'));

        window.RAW_DATA = rows.slice(1).map(line => {
            const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            if (cols.length < 3) return null;

            let cleanAdName = cols[0] ? cols[0].replace(/^"|"$/g, '').trim() : "";
            let rawSpent = cols[2] ? cols[2].replace(/[^0-9.-]+/g, "") : "0";
            let productBase = (window.PB_INDEX !== -1 && cols[window.PB_INDEX]) ? cols[window.PB_INDEX].replace(/^"|"$/g, '').trim() : "";

            return {
                adName: cleanAdName,
                productBase: productBase,
                spent: parseFloat(rawSpent) || 0,
                elements: cleanAdName.match(/\d{10}/) ? cleanAdName.match(/\d{10}/)[0] : null
            };
        }).filter(i => i);
        document.getElementById('fileStatus').innerHTML = `<i class="ph ph-database"></i> Loaded: ${window.RAW_DATA.length}`;
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

    window.CUSTOM_IMAGES = []; 

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

    window.GLOBAL_TARGET_CODE = tempTargetCode;
    window.GLOBAL_CACHE_KEY = asin ? `ASIN_${asin}` : `CODE_${tempTargetCode}`;

    const history = window.RAW_DATA.filter(i => i.adName.includes(window.GLOBAL_TARGET_CODE) && i.elements);
    window.CURRENT_NICHE = history.length > 0 ? window.extractNiche(history[0].adName) : window.extractNiche(window.GLOBAL_TARGET_CODE);
    
    const hasCache = window.loadStateFromCache(window.GLOBAL_CACHE_KEY);
    if (!hasCache) {
        window.CURRENT_MATRIX_LIMIT = history.length > 0 ? 9 : 5;
    }
    
    if (tempProductBase) window.GLOBAL_PRODUCT_BASE = tempProductBase;
    if (tempScrapedData) window.GLOBAL_SCRAPED_DATA = tempScrapedData;
    if (tempImageUrl) window.GLOBAL_IMAGE_URL = tempImageUrl;

    analysisSec.style.display = 'block';
    window.saveStateToCache();

    const hContainer = document.getElementById('historyContainer');
    if (history.length > 0) {
        hContainer.style.display = 'block';
        window.renderHistoryTable(history);
    } else {
        hContainer.style.display = 'none';
    }

    window.renderMatrix(window.CURRENT_NICHE, window.CURRENT_MATRIX_LIMIT, window.GLOBAL_TARGET_CODE);
    
    if (window.SELECTED_PAIRS.size > 0) window.updateMixArea();
    if (window.FINAL_SELECTED_CODES.size > 0) window.renderReviewView();
};

window.getTopElements = function(niche, type, limit) {
    let pool = typeof ELEMENTS_DATA !== 'undefined' && ELEMENTS_DATA[type] ? ELEMENTS_DATA[type].map(i => i.Code.toString().padStart(2, '0')) : [];
    if (type === 'E4' && typeof NICHE_E4_MAP !== 'undefined') {
        const allowedE4s = NICHE_E4_MAP[niche.toUpperCase()];
        if (allowedE4s && allowedE4s.length > 0) pool = pool.filter(code => allowedE4s.includes(code));
        else pool.sort(() => 0.5 - Math.random());
    }

    const nicheData = window.RAW_DATA.filter(i => i.adName.toUpperCase().includes(niche.toUpperCase()) && i.elements);
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
    
    window.MANUAL_E2.forEach(code => {
        if (!e2List.find(e => e.code === code)) e2List.push({code, spent: 0, isManual: true});
    });
    window.MANUAL_E4.forEach(code => {
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
            const isRan = window.RAW_DATA.some(s => s.adName.toUpperCase().includes(targetCode.toUpperCase()) && s.elements && s.elements.substring(2, 4) === e2.code && s.elements.substring(6, 8) === e4.code);
            const isChecked = window.SELECTED_PAIRS.has(pairKey) ? 'checked' : '';
            html += `<td class="${isRan ? 'cell-history' : ''}" style="text-align: center;"><input type="checkbox" id="mat_${window.GLOBAL_CACHE_KEY}_${e2.code}_${e4.code}" autocomplete="off" class="round-checkbox" ${isChecked} onchange="window.togglePair('${e2.code}', '${e4.code}', this)"></td>`;
        });
        html += `</tr>`;
    });

    html += `</tbody></table><div class="canva-add-btn e2-btn" title="Add E2 Column" onclick="window.openSearchModal('E2')">+</div><div class="canva-add-btn e4-btn" title="Add E4 Row" onclick="window.openSearchModal('E4')">+</div></div></div>`;

    container.innerHTML = html;
    window.injectSearchModal(); 
}

window.currentSearchType = 'E2';

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
    window.currentSearchType = type;
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
    const data = (typeof ELEMENTS_DATA !== 'undefined') ? ELEMENTS_DATA[window.currentSearchType] : [];
    
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
        
        const isAdded = (window.currentSearchType === 'E2' && window.CURRENT_RENDERED_E2.includes(code)) || 
                        (window.currentSearchType === 'E4' && window.CURRENT_RENDERED_E4.includes(code));
        
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
    if (window.currentSearchType === 'E2' && !window.MANUAL_E2.includes(code)) window.MANUAL_E2.push(code);
    else if (window.currentSearchType === 'E4' && !window.MANUAL_E4.includes(code)) window.MANUAL_E4.push(code);
    window.saveStateToCache(); 
    window.closeSearchModal();
    window.renderMatrix(window.CURRENT_NICHE, window.CURRENT_MATRIX_LIMIT, window.GLOBAL_TARGET_CODE);
};

window.togglePair = function(e2, e4, checkbox) {
    const key = `${e2}-${e4}`;
    if (checkbox.checked) { 
        if (!window.SELECTED_PAIRS.has(key)) window.SELECTED_PAIRS.set(key, { e2, e4 }); 
    } else { 
        window.SELECTED_PAIRS.delete(key); 
        Array.from(window.FINAL_SELECTED_CODES.entries()).forEach(([code, data]) => {
            if (data.pairKey === key) window.FINAL_SELECTED_CODES.delete(code);
        });
    }
    window.saveStateToCache(); 
    window.updateMixArea();
    window.renderReviewView(); 
}

window.updateMixArea = function() {
    const area = document.getElementById('mixArea');
    const headers = document.getElementById('tabHeaders');
    const contents = document.getElementById('tabContents');
    
    if (window.SELECTED_PAIRS.size === 0) { 
        area.style.display = 'none'; 
        window.renderReviewView();
        return; 
    }

    area.style.display = 'block';
    const currentActive = document.querySelector('#tabHeaders .tab-btn.active')?.dataset.key;

    headers.innerHTML = '';
    contents.innerHTML = ''; 

    window.SELECTED_PAIRS.forEach((val, key) => {
        headers.innerHTML += `<button class="tab-btn ${currentActive === key ? 'active' : ''}" data-key="${key}" onclick="window.switchTab('${key}', 'tabHeaders', 'tabContents')">Pair ${key}</button>`;
        const pane = document.createElement('div');
        pane.className = 'tab-pane'; pane.id = `pane-${key}`;
        pane.innerHTML = `<button class="btn-primary" onclick="window.forceRegenerateMixForTab('${key}')" style="margin-bottom:15px">Generate Mix E1 & E5</button><div class="table-container no-border" id="mix-table-${key}"></div>`;
        contents.appendChild(pane);
        window.generateMixForTab(key);
    });
    
    const finalKey = currentActive && window.SELECTED_PAIRS.has(currentActive) ? currentActive : window.SELECTED_PAIRS.keys().next().value;
    window.switchTab(finalKey, 'tabHeaders', 'tabContents');
}

window.switchTab = function(key, headerId, contentId) {
    document.querySelectorAll(`#${headerId} .tab-btn`).forEach(b => b.classList.toggle('active', b.dataset.key === key));
    document.querySelectorAll(`#${contentId} .tab-pane`).forEach(p => p.classList.toggle('active', p.id.includes(key)));
}

window.forceRegenerateMixForTab = function(key) {
    window.MIX_OPTIONS_CACHE.delete(key);
    Array.from(window.FINAL_SELECTED_CODES.entries()).forEach(([code, data]) => {
        if (data.pairKey === key) window.FINAL_SELECTED_CODES.delete(code);
    });
    window.generateMixForTab(key);
    window.saveStateToCache();
    window.renderReviewView();
}

window.getSmartMix = function(niche, type, limit) {
    let pool = typeof ELEMENTS_DATA !== 'undefined' && ELEMENTS_DATA[type] ? ELEMENTS_DATA[type].map(i => i.Code.toString().padStart(2, '0')) : [];
    
    if (type === 'E1') pool = pool.filter(code => code !== '00' && code !== '01');
    else if (type === 'E5') pool = pool.filter(code => code !== '00');

    const history = window.RAW_DATA.filter(s => s.adName.toUpperCase().includes(niche.toUpperCase()) && s.elements);
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
    const pair = window.SELECTED_PAIRS.get(key);
    let options = [];

    if (window.MIX_OPTIONS_CACHE.has(key)) {
        options = window.MIX_OPTIONS_CACHE.get(key);
    } else {
        const e1Opts = window.getSmartMix(window.CURRENT_NICHE, 'E1', 5);
        const e5Opts = window.getSmartMix(window.CURRENT_NICHE, 'E5', 5);
        for (let i = 0; i < 5; i++) {
            const e1 = e1Opts[i] || "02", e5 = e5Opts[i] || "01";
            options.push(`${e1}${pair.e2}03${pair.e4}${e5}`);
        }
        window.MIX_OPTIONS_CACHE.set(key, options);
        window.saveStateToCache();
    }

    let html = `<table><thead><tr><th>Option</th><th>E1</th><th>E2</th><th>E3</th><th>E4</th><th>E5</th><th>Full Code</th><th>Select</th></tr></thead><tbody>`;
    options.forEach((full, i) => {
        const e1 = full.substring(0, 2), e5 = full.substring(8, 10);
        const isChecked = window.FINAL_SELECTED_CODES.has(full) ? 'checked' : '';
        html += `<tr>
                    <td>#${i + 1}</td>
                    <td><span class="code-box" data-type="E1" data-code="${e1}">${e1}</span></td>
                    <td>${pair.e2}</td><td>03</td><td>${pair.e4}</td>
                    <td><span class="code-box" data-type="E5" data-code="${e5}">${e5}</span></td>
                    <td><span class="full-code-text" data-full="${full}">${full}</span></td>
                    <td><input type="checkbox" id="mix_cb_${window.GLOBAL_CACHE_KEY}_${full}" autocomplete="off" class="round-checkbox" ${isChecked} onchange="window.toggleFinalCode('${full}', '${key}', this)"></td>
                 </tr>`;
    });
    document.getElementById(`mix-table-${key}`).innerHTML = html + `</tbody></table>`;
}

window.toggleFinalCode = function(fullCode, pairKey, checkbox) {
    if (checkbox.checked) window.FINAL_SELECTED_CODES.set(fullCode, { fullCode, pairKey });
    else window.FINAL_SELECTED_CODES.delete(fullCode);
    window.saveStateToCache(); 
    window.renderReviewView();
}

// XỬ LÝ UPLOAD ẢNH CUSTOM THEO DẠNG COLLAPSE STACK
window.resizeImageBase64 = function(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                let scaleSize = 1;
                if (img.width > MAX_WIDTH) scaleSize = MAX_WIDTH / img.width;
                canvas.width = img.width * scaleSize;
                canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            }
        }
    });
}

window.handleUploadImages = async function(e, code) {
    const files = Array.from(e.target.files);
    let cacheData = window.AI_CACHE.get(code) || {};
    if (!cacheData.customImages) cacheData.customImages = [];

    for (let f of files) {
        if (f.type.startsWith('image/')) {
            const b64 = await window.resizeImageBase64(f);
            cacheData.customImages.push(b64);
        }
    }
    window.AI_CACHE.set(code, cacheData);
    window.saveStateToCache();
    window.renderCustomImagesPreview(code);
};

window.removeCustomImage = function(code, index) {
    let cacheData = window.AI_CACHE.get(code);
    if (cacheData && cacheData.customImages) {
        cacheData.customImages.splice(index, 1);
        window.AI_CACHE.set(code, cacheData);
        window.saveStateToCache();
        window.renderCustomImagesPreview(code);
    }
};

window.renderCustomImagesPreview = function(code) {
    const container = document.getElementById(`custom-upload-wrapper-${code}`);
    if(!container) return;

    let cacheData = window.AI_CACHE.get(code) || {};
    let customImages = cacheData.customImages || [];

    // Cập nhật mượt mà thanh chèn tag @image mà không làm vỡ form đang edit
    const actionWrapper = document.getElementById(`prompt-actions-wrapper-${code}`);
    if (actionWrapper) {
        const toolbar = actionWrapper.querySelector('.insert-img-toolbar');
        if (toolbar) {
            toolbar.innerHTML = customImages.map((_, i) => `<button onclick="window.insertTextToPrompt(this, '@image${i+1}')" style="font-size:11px; padding:4px 8px; border-radius:4px; border:1px solid #cbd5e1; cursor:pointer; background:#f8fafc; font-weight:600; color:#475569; transition:0.2s;">+ @image${i+1}</button>`).join('');
        }
    }

    if (customImages.length === 0) {
        container.innerHTML = `
            <label style="cursor:pointer; background:#f8fafc; border:1px dashed #cbd5e1; padding:6px 12px; border-radius:6px; font-size:12px; font-weight:600; color:#475569; transition: 0.2s; display:flex; align-items:center; gap:6px;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='#f8fafc'">
                <i class="ph ph-plus"></i> Add Reference
                <input type="file" multiple accept="image/*" style="display:none;" onchange="window.handleUploadImages(event, '${code}')">
            </label>
        `;
        return;
    }

    let stackHtml = '';
    const displayImgs = customImages.slice(0, 3);
    displayImgs.forEach((img, i) => {
        let rotation = 0;
        if (i === 0 && displayImgs.length > 1) rotation = -5;
        if (i === 2) rotation = 5;
        stackHtml += `<img src="${img}" class="ref-stack-img" style="z-index: ${5 - i}; transform: rotate(${rotation}deg);">`;
    });

    let expandedListHtml = customImages.map((img, i) => `
        <div class="ref-expanded-thumb">
            <img src="${img}">
            <button class="ref-expanded-del" onclick="window.removeCustomImage('${code}', ${i})"><i class="ph ph-trash"></i></button>
        </div>
    `).join('');

    container.innerHTML = `
        <div class="ref-gallery-module">
            <div class="ref-stack-trigger">
                ${stackHtml}
                <div class="ref-stack-badge"><i class="ph ph-plus"></i></div>
            </div>
            <div class="ref-expanded-dropdown">
                <label class="ref-expanded-add">
                    <i class="ph ph-plus"></i> local upload
                    <input type="file" multiple accept="image/*" style="display:none;" onchange="window.handleUploadImages(event, '${code}')">
                </label>
                <div class="ref-expanded-scroll">
                    ${expandedListHtml}
                </div>
            </div>
        </div>
    `;
};

// HÀM TÍNH TOẠ ĐỘ CON TRỎ ĐỂ ĐẶT MENU @IMAGE
window.getCaretCoordinates = function(element, position) {
    const div = document.createElement('div');
    const style = window.getComputedStyle(element);
    for (let prop of style) { div.style[prop] = style.getPropertyValue(prop); }
    div.style.position = 'absolute';
    div.style.visibility = 'hidden';
    div.style.whiteSpace = 'pre-wrap';
    div.style.wordWrap = 'break-word';
    div.style.overflow = 'hidden';
    div.style.width = element.offsetWidth + 'px';
    div.style.height = element.offsetHeight + 'px';
    
    div.textContent = element.value.substring(0, position);
    const span = document.createElement('span');
    span.textContent = element.value.substring(position) || '.';
    div.appendChild(span);
    document.body.appendChild(div);
    
    const coords = {
        top: span.offsetTop + parseInt(style.borderTopWidth || 0),
        left: span.offsetLeft + parseInt(style.borderLeftWidth || 0)
    };
    document.body.removeChild(div);
    return coords;
}

window.handlePromptInput = function(code, textarea) {
    const val = textarea.value;
    const cursor = textarea.selectionEnd;
    const suggestBox = document.getElementById(`suggest-box-${code}`);
    if (!suggestBox) return;

    const textBefore = val.substring(0, cursor);
    const words = textBefore.split(/[\s\n]+/);
    const lastWord = words[words.length - 1];

    let cacheData = window.AI_CACHE.get(code) || {};
    let customImages = cacheData.customImages || [];

    if (lastWord.startsWith('@') && customImages.length > 0) {
        let html = '<div style="font-size:11px; color:#64748b; margin-bottom:4px; padding:0 4px; font-weight:bold;">Select Reference:</div>';
        const query = lastWord.substring(1).toLowerCase().replace(/\s/g, ''); 
        
        let hasMatch = false;
        customImages.forEach((img, idx) => {
            const imgId = `image${idx+1}`;
            if (imgId.includes(query)) {
                hasMatch = true;
                html += `<div onclick="window.insertMention('${code}', '@${imgId}')" class="smart-dropdown-item">
                    <img src="${img}" style="width:24px; height:24px; object-fit:cover; border-radius:4px; border:1px solid #cbd5e1;">
                    @${imgId}
                </div>`;
            }
        });
        
        if (hasMatch) {
            const coords = window.getCaretCoordinates(textarea, cursor);
            suggestBox.style.bottom = 'auto'; 
            suggestBox.style.top = (coords.top - textarea.scrollTop + 30) + 'px'; 
            suggestBox.style.left = Math.min(coords.left - textarea.scrollLeft + 15, textarea.offsetWidth - 160) + 'px'; 
            
            suggestBox.innerHTML = html;
            suggestBox.style.display = 'block';
        } else {
            suggestBox.style.display = 'none';
        }
    } else {
        suggestBox.style.display = 'none';
    }
};

window.insertMention = function(code, text) {
    const textarea = document.getElementById(`prompt-textarea-${code}`);
    if (!textarea) return;
    const val = textarea.value;
    const cursor = textarea.selectionEnd;
    const textBefore = val.substring(0, cursor);
    const lastAtPos = textBefore.lastIndexOf('@');
    
    const before = val.substring(0, lastAtPos); 
    const after = val.substring(cursor);
    
    textarea.value = before + text + ' ' + after;
    document.getElementById(`suggest-box-${code}`).style.display = 'none';
    textarea.focus();
};

window.insertTextToPrompt = function(btn, text) {
    const wrapper = btn.closest('.prompt-builder-wrapper');
    const textarea = wrapper.querySelector('textarea');
    if(textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        textarea.value = textarea.value.substring(0, start) + text + " " + textarea.value.substring(end);
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + text.length + 1;
    }
};

window.renderReviewView = function() {
    const headers = document.getElementById('reviewTabHeaders');
    const contents = document.getElementById('reviewTabContents');
    const msg = document.getElementById('no-selection-msg');

    const currentActiveBtn = document.querySelector('#reviewTabHeaders .tab-btn.active');
    const activeTabKey = currentActiveBtn ? currentActiveBtn.dataset.key : null;

    const oldPb = document.getElementById('pb-container');
    if (oldPb) oldPb.remove();

    if (!headers || !contents) return;
    headers.innerHTML = ''; contents.innerHTML = '';

    if (window.FINAL_SELECTED_CODES.size === 0) { 
        if (msg) msg.style.display = 'block'; 
        return; 
    }
    if (msg) msg.style.display = 'none';

    let displayProductName = window.GLOBAL_PRODUCT_BASE;
    if (!displayProductName && window.GLOBAL_TARGET_CODE) {
        const historyMatch = window.RAW_DATA.find(i => i.adName.includes(window.GLOBAL_TARGET_CODE) && i.productBase);
        if (historyMatch) displayProductName = historyMatch.productBase;
    }
    if (!displayProductName) displayProductName = "Personalized Custom Gift";

    const linkBadgeHtml = window.GLOBAL_SCRAPED_DATA
        ? `<span style="background:#ecfdf5; color:#047857; padding:4px 8px; border-radius:4px; font-size:12px; font-weight:600; margin-left:15px; border: 1px solid #10b981;"><i class="ph ph-check-circle"></i> Data Connected</span>`
        : "";

    const imgPreviewHtml = window.GLOBAL_IMAGE_URL
        ? `<img src="${window.GLOBAL_IMAGE_URL}" style="height: 44px; width: 44px; border-radius: 6px; border: 1px solid #ccc; object-fit: cover; margin-right: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">`
        : "";

    const tokenDisplayHtml = `<div class="token-counter" title="Total tokens used in this session" style="margin-right:15px; font-size:13px; color:#475569; background:#f8fafc; border:1px solid #e2e8f0; padding:6px 12px; border-radius:6px; font-weight:600;"><i class="ph ph-coins"></i> BP Tokens: <span id="bp-token-usage" style="margin-left:4px; font-weight:800; color:#ea580c;">${window.BYTEPLUS_TOTAL_TOKENS.toLocaleString()}</span></div>`;
    
    // Đã gỡ bỏ vùng Upload Ảnh khỏi thanh ngang Tổng
    const pbContainer = document.createElement('div');
    pbContainer.id = 'pb-container';
    pbContainer.style.cssText = 'position: relative; margin-bottom: 20px; padding: 15px; background: white; border: 1px solid var(--border-light); border-radius: 8px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap:15px;';
    pbContainer.innerHTML = `
        <div style="display:flex; align-items:center;">
            ${imgPreviewHtml}
            <div style="display:flex; align-items:center; background: #fff3e0; padding: 8px 16px; border-radius: 8px; border: 1px solid #ffe0b2;">
                <span style="font-weight: 600; color: #e65100; margin-right: 8px;">Target Product Base:</span>
                <span style="font-weight: 800; font-size: 1.1rem; color: #bf360c; text-transform: uppercase;">${displayProductName}</span>
            </div>
            ${linkBadgeHtml}
        </div>
        <div style="display:flex; align-items:center;">
            ${tokenDisplayHtml}
        </div>
    `;
    headers.parentNode.insertBefore(pbContainer, headers);

    const grouped = {};
    window.FINAL_SELECTED_CODES.forEach(item => {
        if (!grouped[item.pairKey]) grouped[item.pairKey] = [];
        grouped[item.pairKey].push(item.fullCode);
    });

    Object.keys(grouped).forEach((pairKey, idx) => {
        let isActive = activeTabKey ? (pairKey === activeTabKey) : (idx === 0);

        headers.innerHTML += `<button class="tab-btn ${isActive ? 'active' : ''}" data-key="${pairKey}" onclick="window.switchTab('${pairKey}', 'reviewTabHeaders', 'reviewTabContents')">Pair ${pairKey}</button>`;
        const pane = document.createElement('div');
        pane.className = `tab-pane ${isActive ? 'active' : ''}`;
        pane.id = `review-pane-${pairKey}`;

        let tableHtml = `<table><thead><tr><th>Full Code</th><th>E1</th><th>E2</th><th>E3</th><th>E4</th><th>E5</th><th style="min-width: 150px;">Action</th></tr></thead><tbody>`;

        grouped[pairKey].forEach(code => {
            const e1 = code.substring(0, 2), e2 = code.substring(2, 4), e3 = code.substring(4, 6), e4 = code.substring(6, 8), e5 = code.substring(8, 10);

            const cacheData = window.AI_CACHE.get(code) || {};
            const hasCache = !!cacheData.rawScript;
            const scriptText = hasCache ? cacheData.scriptHtml : '';
            const isExpanded = hasCache ? cacheData.expanded : true;
            
            const showPromptBuilder = hasCache ? (cacheData.showPromptBuilder || false) : false;
            const ugcRecipientVal = hasCache && cacheData.promptRecipient ? cacheData.promptRecipient : '';
            const ugcPromptResult = hasCache && cacheData.shootingPrompt ? cacheData.shootingPrompt : '';
            const promptResultDisplay = ugcPromptResult ? 'block' : 'none';

            const aiRowStyle = hasCache && isExpanded ? 'table-row' : 'none';
            const btnText = hasCache ? '<i class="ph ph-sparkle"></i> Redo' : '<i class="ph ph-sparkle"></i> Create';
            const toggleIcon = isExpanded ? '<i class="ph ph-caret-down"></i>' : '<i class="ph ph-caret-right"></i>';
            const toggleDisplay = hasCache ? 'inline-block' : 'none';

            const videoStatus = cacheData.videoGenStatus || '';
            const videoTime = cacheData.videoGenTime || 0;
            let videoBtnHtml = `<button onclick="window.generateVideo('${code}')" id="video-btn-${code}" style="padding: 6px 12px; border: 1px solid #c084fc; border-radius: 6px; cursor: pointer; background: #f5f3ff; font-weight: 600; color: #6d28d9; font-size: 12px; transition:all 0.2s;" onmouseover="this.style.background='#ede9fe'" onmouseout="this.style.background='#f5f3ff'"><i class="ph ph-video-camera"></i> Generate Video</button>`;
            
            if (videoStatus === 'generating') {
                videoBtnHtml = `<button disabled id="video-btn-${code}" style="padding: 6px 12px; border: 1px solid #c084fc; border-radius: 6px; cursor: not-allowed; background: #f5f3ff; font-weight: 600; color: #6d28d9; font-size: 12px; opacity: 0.7;"><i class="ph ph-spinner"></i> Generating (${videoTime}s)...</button>`;
            } else if (videoStatus === 'succeeded') {
                videoBtnHtml = `<button disabled id="video-btn-${code}" style="padding: 6px 12px; border: 1px solid #10b981; border-radius: 6px; cursor: default; background: #10b981; font-weight: 600; color: white; font-size: 12px;"><i class="ph ph-check-circle"></i> Video Ready!</button>`;
            }

            const copyPromptStr = `navigator.clipboard.writeText(document.getElementById('prompt-text-${code}').innerText.trim()); this.innerHTML='<i class=\\'ph ph-check\\'></i> Copied!'; setTimeout(()=>this.innerHTML='<i class=\\'ph ph-copy\\'></i> Copy Prompt', 2000);`;
            
            const localCustomImages = cacheData.customImages || [];
            const insertTagsHtml = localCustomImages.map((_, i) => `<button onclick="window.insertTextToPrompt(this, '@image${i+1}')" style="font-size:11px; padding:4px 8px; border-radius:4px; border:1px solid #cbd5e1; cursor:pointer; background:#f8fafc; font-weight:600; color:#475569; transition:0.2s;">+ @image${i+1}</button>`).join('');

            const ugcPromptResultContent = ugcPromptResult ? `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;" id="prompt-actions-wrapper-${code}">
                    <div class="insert-img-toolbar" style="display:none; gap:6px;">${insertTagsHtml}</div>
                    <div style="display:flex; gap:8px; margin-left:auto;">
                        <button onclick="window.editPrompt('${code}')" id="edit-prompt-btn-${code}" style="padding: 6px 12px; border: 1px solid #bae6fd; border-radius: 6px; cursor: pointer; background: #f0f9ff; font-weight: 600; color: #0369a1; font-size: 12px; transition:all 0.2s;"><i class="ph ph-note-pencil"></i> Edit</button>
                        <button onclick="${copyPromptStr}" id="copy-prompt-btn-${code}" style="padding: 6px 12px; border: 1px solid #fed7aa; border-radius: 6px; cursor: pointer; background: #fff7ed; font-weight: 600; color: #c2410c; font-size: 12px; transition:all 0.2s;"><i class="ph ph-copy"></i> Copy Prompt</button>
                        ${videoBtnHtml}
                    </div>
                </div>
                
                <div id="prompt-edit-area-${code}" style="display:none; position:relative;">
                    <textarea id="prompt-textarea-${code}" oninput="window.handlePromptInput('${code}', this)" style="width:100%; min-height:450px; padding:15px; font-family:inherit; font-size:14px; border:1px solid #cbd5e1; border-radius:6px; outline:none; transition:border 0.2s; box-sizing:border-box; resize:vertical; line-height:1.6;" onfocus="this.style.borderColor='#ea580c'"></textarea>
                    <div id="suggest-box-${code}" style="display:none; position:absolute; background:white; border:1px solid #cbd5e1; box-shadow:0 4px 6px rgba(0,0,0,0.1); border-radius:6px; padding:6px; z-index:100; max-height:150px; overflow-y:auto; min-width:140px;"></div>
                    <div style="margin-top:12px; display:flex; gap:10px; justify-content:flex-end;">
                        <button onclick="window.cancelPromptEdit('${code}')" style="background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; padding:8px 16px; border-radius:6px; font-weight:600; cursor:pointer; font-size:13px; transition:0.2s;"><i class="ph ph-x"></i> Cancel</button>
                        <button onclick="window.savePromptEdit('${code}')" style="background:#10b981; color:white; border:none; padding:8px 16px; border-radius:6px; font-weight:600; cursor:pointer; font-size:13px; transition:0.2s;"><i class="ph ph-floppy-disk"></i> Save Edit</button>
                    </div>
                </div>
                
                <div id="prompt-text-${code}" class="prompt-view-box">${ugcPromptResult}</div>
            ` : '';

            // Đặt Nút Tải Ảnh Ngay Bên Cạnh Tiêu Đề Của Mỗi Code Riêng Biệt
            const builderHtml = hasCache ? `
                <div id="prompt-builder-${code}" class="prompt-builder-wrapper" style="display:${showPromptBuilder ? 'block' : 'none'};">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                        <h4 style="margin:0; color:#ea580c; font-size:15px; display:flex; align-items:center; gap:8px;"><i class="ph ph-film-strip"></i> Generate Video Shooting Prompt</h4>
                        <div id="custom-upload-wrapper-${code}"></div>
                    </div>
                    <div style="display:flex; gap:12px; margin-bottom:15px; align-items:stretch;">
                        <input type="text" id="prompt-recipient-${code}" value="${ugcRecipientVal}" placeholder="Mô tả đối tượng (VD: a woman in her mid 50s)..." style="flex:1; padding:10px 14px; border:1px solid #fdba74; border-radius:6px; font-size:14px; outline:none; box-sizing:border-box; transition:box-shadow 0.2s;" onfocus="this.style.boxShadow='0 0 0 3px rgba(251,146,60,0.2)'" onblur="this.style.boxShadow='none'" onkeypress="if(event.key === 'Enter') { event.preventDefault(); window.generateShootingPrompt('${code}'); }" autocomplete="off">
                        <button id="btn-gen-prompt-${code}" onclick="window.generateShootingPrompt('${code}')" style="background:#ea580c; color:white; border:none; padding:0 24px; border-radius:6px; font-weight:600; cursor:pointer; font-size:14px; transition:all 0.2s; box-shadow:0 2px 4px rgba(234,88,12,0.2);"><i class="ph ph-sparkle"></i> Generate</button>
                    </div>
                    <div id="prompt-result-${code}" style="display: ${promptResultDisplay}; position:relative;">${ugcPromptResultContent}</div>
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

    // Sau khi render xong bảng, kích hoạt hàm vẽ Stack Ảnh cho từng Code
    window.FINAL_SELECTED_CODES.forEach(item => {
        window.renderCustomImagesPreview(item.fullCode);
    });
}

window.toggleAI = function(code) {
    const row = document.getElementById(`ai-row-${code}`);
    const btn = document.getElementById(`toggle-btn-${code}`);
    if (!row) return;

    let cacheData = window.AI_CACHE.get(code);
    if (!cacheData) return;

    if (row.style.display === 'none') {
        row.style.display = 'table-row';
        btn.innerHTML = '<i class="ph ph-caret-down"></i>';
        cacheData.expanded = true;
    } else {
        row.style.display = 'none';
        btn.innerHTML = '<i class="ph ph-caret-right"></i>';
        cacheData.expanded = false;
    }
    window.saveStateToCache(); 
}

window.togglePromptForm = function(fullCode) {
    const builder = document.getElementById(`prompt-builder-${fullCode}`);
    if (builder) {
        const isHidden = builder.style.display === 'none';
        builder.style.display = isHidden ? 'block' : 'none';
        
        const cacheData = window.AI_CACHE.get(fullCode) || {};
        cacheData.showPromptBuilder = isHidden;
        
        const aiResultHtml = document.getElementById(`ai-result-${fullCode}`).innerHTML;
        cacheData.scriptHtml = aiResultHtml; 

        window.AI_CACHE.set(fullCode, cacheData);
        window.saveStateToCache();
    }
}

window.generateAIScript = async function(fullCode, btn) {
    const pbElement = document.querySelector('#pb-container span[style*="color: #bf360c"]');
    const productBase = pbElement ? pbElement.innerText : (window.GLOBAL_PRODUCT_BASE || "Personalized Custom Gift");

    const row = document.getElementById(`ai-row-${fullCode}`);
    const resultBox = document.getElementById(`ai-result-${fullCode}`);
    const toggleBtn = document.getElementById(`toggle-btn-${fullCode}`);

    row.style.display = 'table-row';
    if (toggleBtn) { toggleBtn.style.display = 'inline-block'; toggleBtn.innerHTML = '<i class="ph ph-caret-down"></i>'; }
    btn.disabled = true;

    let processText = window.GLOBAL_IMAGE_URL ? `<i><i class="ph ph-spinner"></i> Loading...</i>` : `<i>⏳</i>`;
    resultBox.innerHTML = processText;

    try {
        const spentCodes = window.RAW_DATA.filter(i => i.adName.toUpperCase().includes(window.CURRENT_NICHE) && i.spent > 0 && i.elements).map(i => i.elements);
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
                fullCode, niche: window.CURRENT_NICHE, productBase,
                scrapedData: window.GLOBAL_SCRAPED_DATA,
                imageUrl: window.GLOBAL_IMAGE_URL,
                customImages: [], // Script gốc luôn sinh ra từ ảnh Web (Hoặc Prompt không cần ảnh)
                spentCodes, eData
            })
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        let badges = [];
        if (data.hasImage) badges.push(`<span style="background:#fce7f3; color:#be185d; padding:2px 6px; border-radius:4px; font-size:12px; margin-left:5px;"><i class="ph ph-eye"></i> AI OCR Vision</span>`);

        const badgesHtml = badges.join('');
        const rawScriptText = data.script;

        const promptBtnHtml = `<button onclick="window.togglePromptForm('${fullCode}')" id="prompt-btn-${fullCode}" class="modern-action-btn btn-prompt"><i class="ph ph-film-strip"></i> Prompt</button>`;
        const copyBtnHtml = `<button onclick="window.copyScript('${fullCode}')" id="copy-btn-${fullCode}" class="modern-action-btn btn-copy"><i class="ph ph-copy"></i> Copy Script</button>`;
        const saveBtnHtml = `<button onclick="window.saveScript('${fullCode}')" id="save-btn-${fullCode}" class="modern-action-btn btn-save"><i class="ph ph-floppy-disk"></i> Save</button>`;

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
        window.AI_CACHE.set(fullCode, { scriptHtml, rawScript: rawScriptText, expanded: true });
        window.saveStateToCache(); 
        
        window.renderReviewView();

    } catch (err) {
        resultBox.innerHTML = `<span style="color:red;">❌ Lỗi: ${err.message}</span>`;
    } finally {
        btn.disabled = false;
        btn.innerHTML = "<i class='ph ph-sparkle'></i> Redo";
    }
}

window.generateShootingPrompt = async function(fullCode) {
    const cacheData = window.AI_CACHE.get(fullCode);
    if (!cacheData || !cacheData.rawScript) return alert("Please generate Content first!");

    const recipientInput = document.getElementById(`prompt-recipient-${fullCode}`);
    const resultBox = document.getElementById(`prompt-result-${fullCode}`);
    const btn = document.getElementById(`btn-gen-prompt-${fullCode}`);

    const recipientDesc = recipientInput.value.trim();

    if (!recipientDesc) return alert("Vui lòng điền thông tin nhân vật và đối tượng nhận quà.");

    recipientInput.setAttribute('value', recipientDesc);

    btn.innerHTML = "<i class='ph ph-spinner'></i>...";
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

        const copyPromptStr = `navigator.clipboard.writeText(document.getElementById('prompt-text-${fullCode}').innerText.trim()); this.innerHTML='<i class=\\'ph ph-check\\'></i> Copied!'; setTimeout(()=>this.innerHTML='<i class=\\'ph ph-copy\\'></i> Copy Prompt', 2000);`;
        
        const localCustomImages = cacheData.customImages || [];
        const insertTagsHtml = localCustomImages.map((_, i) => `<button onclick="window.insertTextToPrompt(this, '@image${i+1}')" style="font-size:11px; padding:4px 8px; border-radius:4px; border:1px solid #cbd5e1; cursor:pointer; background:#f8fafc; font-weight:600; color:#475569; transition:0.2s;">+ @image${i+1}</button>`).join('');

        resultBox.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;" id="prompt-actions-wrapper-${fullCode}">
                <div class="insert-img-toolbar" style="display:none; gap:6px;">${insertTagsHtml}</div>
                <div style="display:flex; gap:8px; margin-left:auto;">
                    <button onclick="window.editPrompt('${fullCode}')" id="edit-prompt-btn-${fullCode}" style="padding: 6px 12px; border: 1px solid #bae6fd; border-radius: 6px; cursor: pointer; background: #f0f9ff; font-weight: 600; color: #0369a1; font-size: 12px; transition:all 0.2s;"><i class="ph ph-note-pencil"></i> Edit</button>
                    <button onclick="${copyPromptStr}" id="copy-prompt-btn-${fullCode}" style="padding: 6px 12px; border: 1px solid #fed7aa; border-radius: 6px; cursor: pointer; background: #fff7ed; font-weight: 600; color: #c2410c; font-size: 12px; transition:all 0.2s;"><i class="ph ph-copy"></i> Copy Prompt</button>
                    <button title="Est. Cost: ~5,000 - 15,000 Tokens (Seedance 2.0)" onclick="window.generateVideo('${fullCode}')" id="video-btn-${fullCode}" style="padding: 6px 12px; border: 1px solid #c084fc; border-radius: 6px; cursor: pointer; background: #f5f3ff; font-weight: 600; color: #6d28d9; font-size: 12px; transition:all 0.2s;"><i class="ph ph-video-camera"></i> Generate Video</button>
                </div>
            </div>
            
            <div id="prompt-text-${fullCode}" class="prompt-view-box">${data.prompt}</div>
            
            <div id="prompt-edit-area-${fullCode}" style="display:none; position:relative;">
                <textarea id="prompt-textarea-${fullCode}" oninput="window.handlePromptInput('${fullCode}', this)" style="width:100%; min-height:450px; padding:15px; font-family:inherit; font-size:14px; border:1px solid #cbd5e1; border-radius:6px; outline:none; transition:border 0.2s; box-sizing:border-box; resize:vertical; line-height:1.6;" onfocus="this.style.borderColor='#ea580c'"></textarea>
                <div id="suggest-box-${fullCode}" style="display:none; position:absolute; background:white; border:1px solid #cbd5e1; box-shadow:0 4px 6px rgba(0,0,0,0.1); border-radius:6px; padding:6px; z-index:100; max-height:150px; overflow-y:auto; min-width:140px;"></div>
                
                <div style="margin-top:12px; display:flex; gap:10px; justify-content:flex-end;">
                    <button onclick="window.cancelPromptEdit('${fullCode}')" style="background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; padding:8px 16px; border-radius:6px; font-weight:600; cursor:pointer; font-size:13px; transition:0.2s;"><i class="ph ph-x"></i> Cancel</button>
                    <button onclick="window.savePromptEdit('${fullCode}')" style="background:#10b981; color:white; border:none; padding:8px 16px; border-radius:6px; font-weight:600; cursor:pointer; font-size:13px; transition:0.2s;"><i class="ph ph-floppy-disk"></i> Save Edit</button>
                </div>
            </div>
        `;

        cacheData.promptRecipient = recipientDesc;
        cacheData.shootingPrompt = data.prompt;
        cacheData.videoGenStatus = '';
        cacheData.videoGenTime = 0;
        
        window.AI_CACHE.set(fullCode, cacheData);
        window.saveStateToCache();
        
        // Vẽ lại cục Stack ảnh
        window.renderCustomImagesPreview(fullCode);
    } catch (err) {
        resultBox.innerHTML = `<span style="color:red;">❌ Error: ${err.message}</span>`;
    } finally {
        btn.innerHTML = "<i class='ph ph-sparkle'></i> Generate";
        btn.disabled = false;
    }
}

window.editPrompt = function(code) {
    const textDiv = document.getElementById(`prompt-text-${code}`);
    const editArea = document.getElementById(`prompt-edit-area-${code}`);
    const textarea = document.getElementById(`prompt-textarea-${code}`);
    const actionWrapper = document.getElementById(`prompt-actions-wrapper-${code}`);
    
    if (actionWrapper) {
        actionWrapper.querySelector('div:last-child').style.display = 'none'; 
        actionWrapper.querySelector('.insert-img-toolbar').style.display = 'flex'; 
    }
    
    textDiv.style.display = 'none';
    editArea.style.display = 'block';
    textarea.value = textDiv.innerText;
};

window.savePromptEdit = function(code) {
    const textarea = document.getElementById(`prompt-textarea-${code}`);
    if(!textarea) return;
    
    // Dùng .trim() để bỏ khoảng trắng thừa, tránh việc người dùng chỉ gõ thêm dấu cách cũng bị tính là đổi nội dung
    const newText = textarea.value.trim(); 
    const textDiv = document.getElementById(`prompt-text-${code}`);
    const editArea = document.getElementById(`prompt-edit-area-${code}`);
    
    const cacheData = window.AI_CACHE.get(code);
    let isChanged = false;

    if (cacheData) {
        const oldText = (cacheData.shootingPrompt || "").trim();
        
        // KIỂM TRA: Nếu nội dung MỚI khác nội dung CŨ
        if (newText !== oldText) {
            isChanged = true;
            // Xóa trạng thái video cũ, đánh thức lại nút Generate Video
            cacheData.videoGenStatus = '';
            cacheData.videoGenTime = 0;
        }
        
        cacheData.shootingPrompt = newText;
        window.AI_CACHE.set(code, cacheData);
        window.saveStateToCache();
    }
    
    textDiv.innerText = newText; 
    textDiv.style.display = 'block';
    editArea.style.display = 'none';
    
    const actionWrapper = document.getElementById(`prompt-actions-wrapper-${code}`);
    if (actionWrapper) {
        actionWrapper.querySelector('div:last-child').style.display = 'flex';
        actionWrapper.querySelector('.insert-img-toolbar').style.display = 'none';
    }

    // Nếu thực sự có thay đổi nội dung, vẽ lại toàn bộ View để Update giao diện nút bấm
    if (isChanged) {
        window.renderReviewView();
    }
};

window.cancelPromptEdit = function(code) {
    const cacheData = window.AI_CACHE.get(code);
    const originalText = cacheData ? cacheData.shootingPrompt : '';
    const textDiv = document.getElementById(`prompt-text-${code}`);
    const editArea = document.getElementById(`prompt-edit-area-${code}`);
    
    textDiv.innerText = originalText;
    textDiv.style.display = 'block';
    editArea.style.display = 'none';
    
    const actionWrapper = document.getElementById(`prompt-actions-wrapper-${code}`);
    if (actionWrapper) {
        actionWrapper.querySelector('div:last-child').style.display = 'flex';
        actionWrapper.querySelector('.insert-img-toolbar').style.display = 'none';
    }
};

window.generateVideo = async function(fullCode) {
    const cacheData = window.AI_CACHE.get(fullCode);
    if (!cacheData || !cacheData.shootingPrompt) return alert("Không tìm thấy Prompt!");

    cacheData.videoGenStatus = 'generating';
    cacheData.videoGenTime = 0;
    window.AI_CACHE.set(fullCode, cacheData);
    window.saveStateToCache();

    const initialBtn = document.getElementById(`video-btn-${fullCode}`);
    if (initialBtn) {
        initialBtn.innerHTML = "<i class='ph ph-spinner'></i> Requesting...";
        initialBtn.disabled = true;
        initialBtn.style.opacity = "0.7";
        initialBtn.style.cursor = "not-allowed";
    }

    try {
        const localCustomImages = cacheData.customImages || [];
        const payloadParams = {
            prompt: cacheData.shootingPrompt,
            imageUrl: window.GLOBAL_IMAGE_URL,
            customImages: localCustomImages 
        };

        const res = await fetch(`${API_BASE_URL}/api/generate-video`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadParams)
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);
        if (!data.taskId) throw new Error("Không nhận được Task ID từ hệ thống.");

        const taskId = data.taskId;

        const pollInterval = setInterval(async () => {
            const cData = window.AI_CACHE.get(fullCode);
            if(!cData) { clearInterval(pollInterval); return; }

            cData.videoGenTime = (cData.videoGenTime || 0) + 5;
            window.AI_CACHE.set(fullCode, cData);
            
            const currentBtn = document.getElementById(`video-btn-${fullCode}`);
            if (currentBtn && cData.videoGenStatus === 'generating') {
                currentBtn.innerHTML = `<i class="ph ph-spinner"></i> Generating (${cData.videoGenTime}s)...`;
            }

            try {
                const statusRes = await fetch(`${API_BASE_URL}/api/check-video/${taskId}`);
                const statusData = await statusRes.json();

                if (statusData.status === 'succeeded' || statusData.status === 'SUCCEEDED') {
                    clearInterval(pollInterval);
                    cData.videoGenStatus = 'succeeded';
                    window.AI_CACHE.set(fullCode, cData);
                    
                    if (statusData.usage && statusData.usage > 0) {
                        window.BYTEPLUS_TOTAL_TOKENS += statusData.usage;
                        localStorage.setItem('bp_total_tokens', window.BYTEPLUS_TOTAL_TOKENS);
                        window.updateTokenDisplay();
                    }

                    window.saveStateToCache();

                    if (currentBtn) {
                        currentBtn.innerHTML = "<i class='ph ph-check-circle'></i> Video Ready!";
                        currentBtn.style.background = "#10b981";
                        currentBtn.style.color = "white";
                        currentBtn.style.opacity = "1";
                        currentBtn.style.cursor = "default";
                    }

                    const pbElement = document.querySelector('#pb-container span[style*="color: #bf360c"]');
                    const productBase = pbElement ? pbElement.innerText : (window.GLOBAL_PRODUCT_BASE || "Product");

                    const coverImage = (localCustomImages && localCustomImages.length > 0) ? localCustomImages[0] : window.GLOBAL_IMAGE_URL;

                    try {
                        await fetch(`${API_BASE_URL}/api/gallery`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                code: fullCode,
                                productBase: productBase,
                                targetCode: window.GLOBAL_TARGET_CODE || fullCode.substring(0,3),
                                videoUrl: statusData.videoUrl,
                                imageUrl: coverImage,
                                prompt: cData.shootingPrompt
                            })
                        });
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
                window.AI_CACHE.set(fullCode, cData);
                window.saveStateToCache();
                
                const errBtn = document.getElementById(`video-btn-${fullCode}`);
                if (errBtn) {
                    errBtn.innerHTML = "<i class='ph ph-video-camera'></i> Generate Video";
                    errBtn.disabled = false;
                    errBtn.style.opacity = "1";
                    errBtn.style.cursor = "pointer";
                }
            }

            if (cData.videoGenTime >= 600) { 
                clearInterval(pollInterval);
                cData.videoGenStatus = 'failed';
                window.AI_CACHE.set(fullCode, cData);
                window.saveStateToCache();
                
                const timeoutBtn = document.getElementById(`video-btn-${fullCode}`);
                if (timeoutBtn) {
                    timeoutBtn.innerHTML = "<i class='ph ph-video-camera'></i> Generate Video";
                    timeoutBtn.disabled = false;
                    timeoutBtn.style.opacity = "1";
                    timeoutBtn.style.cursor = "pointer";
                }
                alert(`⏳ Quá thời gian chờ (10 phút) tạo video cho mã [${fullCode}].`);
            }
        }, 5000);

    } catch (err) {
        cacheData.videoGenStatus = 'failed';
        window.AI_CACHE.set(fullCode, cacheData);
        window.saveStateToCache();
        
        const errBtn = document.getElementById(`video-btn-${fullCode}`);
        if(errBtn) {
            errBtn.innerHTML = "<i class='ph ph-video-camera'></i> Generate Video";
            errBtn.disabled = false;
            errBtn.style.opacity = "1";
            errBtn.style.cursor = "pointer";
        }
        alert(`❌ Lỗi tạo video: ${err.message}`);
    }
};

window.saveScript = async function(fullCode) {
    const cacheData = window.AI_CACHE.get(fullCode);
    if (!cacheData || !cacheData.rawScript) {
        alert("Lỗi: Không tìm thấy nội dung kịch bản để lưu (Có thể do tải lại trang). Vui lòng tạo lại Script!");
        return;
    }
    
    const productBase = window.GLOBAL_PRODUCT_BASE || "Personalized Custom Gift";
    let finalContent = cacheData.rawScript;
    
    if (cacheData.shootingPrompt) {
        finalContent += "\n\n=== 🎬 VIDEO SHOOTING PROMPT ===\n\n" + cacheData.shootingPrompt;
    }

    const btn = document.getElementById(`save-btn-${fullCode}`);
    if (btn) {
        btn.innerHTML = "<i class='ph ph-spinner'></i> Saving...";
        btn.disabled = true;
    }

    try {
        const payload = {
            code: fullCode,
            productBase: productBase,
            targetCode: window.GLOBAL_TARGET_CODE || fullCode.substring(0,3),
            content: finalContent
        };

        const res = await fetch(`${API_BASE_URL}/api/store`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error("Máy chủ từ chối lưu dữ liệu");
        
        if (btn) {
            btn.innerHTML = "<i class='ph ph-check-circle'></i> Saved!";
            setTimeout(() => { 
                btn.innerHTML = "<i class='ph ph-floppy-disk'></i> Save"; 
                btn.disabled = false; 
            }, 2000);
        }
        
        if (document.getElementById('view-store') && document.getElementById('view-store').classList.contains('active')) {
            window.renderStore();
        }
    } catch (e) {
        console.error("Lỗi Save Store:", e);
        alert(`Có lỗi khi lưu lên Cloud: ${e.message}`);
        if (btn) { 
            btn.innerHTML = "<i class='ph ph-floppy-disk'></i> Save"; 
            btn.disabled = false; 
        }
    }
};

window.adjustTooltip = function(e, tooltip) {
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
    if (tt1 && tt1.style.display === 'block') window.adjustTooltip(e, tt1);
    if (tt2 && tt2.style.display === 'block') window.adjustTooltip(e, tt2);
});

document.addEventListener('mouseout', (e) => {
    if (e.target.closest('.code-box')) document.getElementById('tooltip').style.display = 'none';
    if (e.target.closest('.full-code-text')) document.getElementById('fullcode-tooltip').style.display = 'none';
});

window.copyScript = function(fullCode) {
    const cacheData = window.AI_CACHE.get(fullCode);
    if (!cacheData || !cacheData.rawScript) return;
    
    const contentToCopy = cacheData.rawScript; 
    
    const cleanedScript = contentToCopy
        .split('\n')
        .map(line => line.replace(/^\[\d+:\d+-\d+:\d+\]\s*/, ''))
        .join('\n');

    navigator.clipboard.writeText(cleanedScript).then(() => {
        const copyBtn = document.getElementById(`copy-btn-${fullCode}`);
        if (copyBtn) {
            copyBtn.innerHTML = '<i class="ph ph-check"></i> Copied!';
            setTimeout(() => { copyBtn.innerHTML = '<i class="ph ph-copy"></i> Copy Script'; }, 2000);
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
// ĐỒNG BỘ GIAO DIỆN SCRIPT STORE CHUẨN MINIMALISM SAAS
// ==========================================
window.STORE_DATA_CACHE = [];

window.buildStoreUI = function() {
    const storePane = document.getElementById('view-store');
    if (!storePane) return; 

    let listContainer = document.getElementById('store-container-wrap');
    if (!listContainer) {
        storePane.innerHTML = `
            <header class="top-nav">
                <div>
                    <h2>Cloud Script Store</h2>
                    <p class="subtitle">Manage and retrieve all your saved AI scripts from any local instance.</p>
                </div>
                <button class="modern-action-btn btn-copy" onclick="window.clearStore()" style="color: #ef4444; border-color: #fca5a5;"><i class="ph ph-trash"></i> Clear All Store</button>
            </header>
            <section class="card" id="store-container-wrap" style="padding: 24px;">
                <div id="store-toolbar" style="display:flex; gap:12px; margin-bottom:20px; flex-wrap:wrap; align-items:center;">
                    <div class="search-bar" style="flex:1; min-width:240px; margin-top:0;">
                        <i class="ph ph-magnifying-glass search-icon"></i>
                        <input type="text" id="store-search" placeholder="Search by code or product..." oninput="window.updateStoreUI()">
                    </div>
                    <select id="store-sort" onchange="window.updateStoreUI()" style="padding:12px 16px; border-radius:10px; border:1px solid #e2e8f0; font-size:14px; outline:none; font-family:inherit; background:white; color:#334155; cursor:pointer;">
                        <option value="newest">Newest first</option>
                        <option value="oldest">Oldest first</option>
                        <option value="code">By code A–Z</option>
                    </select>
                    <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:14px; font-weight:600; color:#ea580c; background:#fff7ed; padding:10px 16px; border-radius:10px; border:1px solid #fed7aa; user-select:none;">
                        <input type="checkbox" id="check-fav-only" onchange="window.updateStoreUI()" style="cursor:pointer; accent-color: #ea580c; width:16px; height:16px;">
                        <i class="ph ph-star"></i> Favorites Only
                    </label>
                </div>
                <div id="store-count" style="font-size:13px; color:#64748b; font-weight:500; margin-bottom:16px;"></div>
                <div style="display:flex; gap:24px; align-items:flex-start;">
                    <div id="store-sidebar" style="min-width:140px; border-right:1px solid #e2e8f0; padding-right:15px; display:flex; flex-direction:column; gap:8px;"></div>
                    <div id="store-list" style="display:flex; flex-direction:column; gap:20px; flex:1;"></div>
                </div>
                <div id="store-empty" class="empty-state" style="display:none; width:100%;">
                    <i class="ph ph-empty"></i>
                    <h4>No scripts archived</h4>
                    <p>Hit save inside Selection Review to synchronize assets to this view.</p>
                </div>
            </section>
        `;
    }
};

window.renderStore = async function() {
    window.buildStoreUI();
    const listDiv = document.getElementById('store-list');
    if(!listDiv) return;

    listDiv.innerHTML = "<p style='text-align:center; color:#999; padding:40px; width:100%;'>⏳ Đang tải dữ liệu từ máy chủ đám mây...</p>";
    
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
    const sidebarDiv = document.getElementById('store-sidebar');
    
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

    if(countDiv) countDiv.innerText = `${filtered.length} SCRIPT(S) SAVED ON CLOUD LOCAL`;

    if (filtered.length === 0) {
        listDiv.innerHTML = '';
        if (sidebarDiv) sidebarDiv.innerHTML = '';
        emptyDiv.style.display = 'block';
        return;
    }
    emptyDiv.style.display = 'none';

    let groupCounts = { 'ALL': window.STORE_DATA_CACHE.length };
    window.STORE_DATA_CACHE.forEach(s => {
        const tc = s.targetCode || 'OTHER';
        groupCounts[tc] = (groupCounts[tc] || 0) + 1;
    });

    let sidebarHtml = `
        <div onclick="window.currentStoreFilter='all'; window.updateStoreUI()" style="padding: 10px 14px; border-radius: 8px; cursor: pointer; text-align: center; font-weight: bold; font-size:13px; transition: 0.2s; ${window.currentStoreFilter === 'all' ? 'background: #ea580c; color: white;' : 'background: #f8fafc; color: #64748b;'}">
            ALL <br><span style="font-size:11px; opacity:0.8;">${groupCounts['ALL']}</span>
        </div>`;

    Object.keys(groupCounts).forEach(tc => {
        if (tc === 'ALL') return;
        const shortTc = tc.length > 5 ? tc.substring(tc.length - 2) : tc; 
        sidebarHtml += `
            <div onclick="window.currentStoreFilter='${tc}'; window.updateStoreUI()" style="padding: 10px 14px; border-radius: 8px; cursor: pointer; text-align: center; font-weight: bold; font-size: 13px; transition: 0.2s; ${window.currentStoreFilter === tc ? 'background: #fff7ed; border-left: 4px solid #ea580c; color: #ea580c;' : 'color: #94a3b8;'}">
                ${shortTc} <br><span style="font-size:11px; opacity:0.8;">${groupCounts[tc]}</span>
            </div>
        `;
    });
    if(sidebarDiv) sidebarDiv.innerHTML = sidebarHtml;

    let cardsHtml = '';
    filtered.forEach(s => {
        const cleanContent = s.content.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const dateStr = new Date(s.date).toLocaleString();
        const starColor = s.isFavorite ? '#eab308' : '#cbd5e1';
        
        cardsHtml += `
            <div style="background:#fff; border:1px solid var(--border-light); border-radius:12px; padding:20px; box-shadow:var(--shadow-sm); position:relative; display:flex; flex-direction:column; gap:12px;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <button onclick="window.toggleFavorite('${s.id}')" title="Toggle Favorite" style="background:none; border:none; cursor:pointer; font-size:22px; color:${starColor}; transition: transform 0.2s; display:flex; align-items:center; justify-content:center;" onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'">
                            <i class="${s.isFavorite ? 'ph-fill ph-star' : 'ph ph-star'}"></i>
                        </button>
                        <div>
                            <div style="display:flex; align-items:center; gap:8px; margin-bottom:2px;">
                                <span style="font-size:16px; font-weight:700; color:var(--text-main);">${s.code}</span>
                                <span style="font-size:11px; background:var(--primary-light); padding:2px 8px; border-radius:6px; color:var(--primary); border: 1px solid var(--primary-border); font-weight: bold; text-transform:uppercase;">${s.productBase}</span>
                            </div>
                            <div style="font-size:12px; color:var(--text-muted); font-weight:500;">
                                Ref: ${s.targetCode || 'N/A'} • ${dateStr}
                            </div>
                        </div>
                    </div>
                    <div style="display:flex; gap:8px; margin-left:auto;">
                        <button onclick="navigator.clipboard.writeText(\`${cleanContent}\`); this.innerHTML='<i class=\\'ph ph-check\\'></i> Copied!'; setTimeout(()=>this.innerHTML='<i class=\\'ph ph-copy\\'></i> Copy', 2000);" class="modern-action-btn btn-copy" style="padding:6px 12px; font-size:12px;"><i class="ph ph-copy"></i> Copy</button>
                        <button onclick="window.downloadText(\`${s.code}\`, \`${cleanContent}\`)" class="modern-action-btn btn-save" style="padding:6px 12px; font-size:12px; background:#f0fdf4; color:#166534; border-color:#bbf7d0;"><i class="ph ph-download-simple"></i> Download</button>
                        <button onclick="window.deleteScript('${s.id}')" class="modern-action-btn btn-copy" style="padding:6px 10px; font-size:12px; color:#dc2626; border-color:#fca5a5;"><i class="ph ph-trash"></i></button>
                    </div>
                </div>
                <div style="background:#f8fafc; padding:16px; border-radius:8px; font-size:14px; line-height:1.6; color:var(--text-body); max-height:220px; overflow-y:auto; border:1px solid var(--border-divider); white-space:pre-wrap; font-family:inherit;">${s.content}</div>
            </div>
        `;
    });
    listDiv.innerHTML = cardsHtml;
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

// ==========================================
// SCENE GALLERY SMART FILTER LOCAL CLOUD
// ==========================================
window.GALLERY_DATA_CACHE = [];

window.buildGalleryUI = function() {
    const galleryPane = document.getElementById('view-gallery');
    if (!galleryPane) return;

    let wrap = document.getElementById('gallery-container-wrap');
    if (!wrap) {
        galleryPane.innerHTML = `
            <header class="top-nav">
                <div>
                    <h2>Cloud Scene Gallery</h2>
                    <p class="subtitle">Review and manage all your generated short-form UGC videos securely stored on the cloud.</p>
                </div>
                <button class="btn-danger" onclick="window.clearGallery()" style="font-size:13px; padding:6px 14px;"><i class="ph ph-trash"></i> Clear All Gallery</button>
            </header>
            <section class="card" id="gallery-container-wrap" style="padding: 24px;">
                <div id="gallery-toolbar" style="display:flex; gap:12px; margin-bottom:20px; flex-wrap:wrap; align-items:center;">
                    
                    <div style="display:flex; gap:8px; align-items:center; flex:1; min-width:300px;">
                        <i class="ph ph-funnel" style="color:#94a3b8; font-size:18px;"></i>
                        <select id="smart-filter-type" onchange="window.updateSmartDatalist()" style="padding:10px 14px; border-radius:8px; border:1px solid #e2e8f0; font-size:14px; outline:none; background:white; color:#334155; cursor:pointer;">
                            <option value="pb">Product Base</option>
                            <option value="niche">Niche (3 ký tự đầu)</option>
                            <option value="idea">Idea (2 ký tự cuối)</option>
                        </select>
                        <input type="text" id="smart-filter-input" list="smart-filter-list" placeholder="Chọn loại lọc và gõ để tìm..." oninput="window.updateGalleryUI()" style="padding:10px 14px; border-radius:8px; border:1px solid #e2e8f0; font-size:14px; flex:1; outline:none;">
                        <datalist id="smart-filter-list"></datalist>
                    </div>

                    <div style="display:flex; gap:12px; align-items:center;">
                        <select id="gal-sort" onchange="window.updateGalleryUI()" style="padding:10px 14px; border-radius:8px; border:1px solid #e2e8f0; font-size:14px; outline:none; background:white; color:#334155; cursor:pointer;">
                            <option value="newest">Newest first</option>
                            <option value="oldest">Oldest first</option>
                            <option value="az">By code A–Z</option>
                            <option value="za">By code Z–A</option>
                        </select>
                        <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:14px; font-weight:600; color:#ea580c; background:#fff7ed; padding:10px 16px; border-radius:8px; border:1px solid #fed7aa; user-select:none;">
                            <input type="checkbox" id="gal-check-fav-only" onchange="window.updateGalleryUI()" style="cursor:pointer; accent-color: #ea580c; width:16px; height:16px;">
                            <i class="ph ph-star"></i> Favorites
                        </label>
                    </div>
                </div>

                <div id="gallery-count" style="font-size:13px; color:#64748b; font-weight:500; margin-bottom:16px;"></div>

                <div style="display:flex; gap:24px; align-items:flex-start;">
                    <div id="gallery-sidebar" style="min-width:140px; border-right:1px solid #e2e8f0; padding-right:15px; display:flex; flex-direction:column; gap:8px;"></div>
                    <div id="gallery-grid" class="gallery-grid" style="display:flex; flex-wrap:wrap; gap:20px; flex:1;"></div>
                </div>
                <div id="gallery-empty" class="empty-state" style="display:none; width:100%;">
                    <i class="ph ph-video-camera-slash"></i>
                    <h4>No video contents found</h4>
                    <p>Generate video content inside Selection Review to see assets rendered here.</p>
                </div>
            </section>
        `;
    }
};

window.renderGalleryView = async function() {
    window.buildGalleryUI();
    const gridDiv = document.getElementById('gallery-grid');
    if(!gridDiv) return;

    gridDiv.innerHTML = "<p style='color:#999; padding:40px; width:100%; text-align:center;'>⏳ Đang tải dữ liệu Gallery từ Cloud Local...</p>";
    
    try {
        const res = await fetch(`${API_BASE_URL}/api/gallery?t=${Date.now()}`);
        let gallery = await res.json();
        window.GALLERY_DATA_CACHE = gallery;
        window.currentGalleryTarget = 'all'; 
        
        window.updateSmartDatalist();
        window.updateGalleryUI();
    } catch (e) {
        gridDiv.innerHTML = `<span style="color:red; display:block; padding:40px; text-align:center;">Lỗi kết nối Gallery: ${e.message}</span>`;
    }
};

window.updateSmartDatalist = function() {
    const type = document.getElementById('smart-filter-type')?.value;
    const datalist = document.getElementById('smart-filter-list');
    if(!datalist || !type) return;

    let set = new Set();
    window.GALLERY_DATA_CACHE.forEach(item => {
        const tc = item.targetCode || "";
        const pb = item.productBase || "";
        if (type === 'pb' && pb) set.add(pb);
        if (type === 'niche' && tc.length >= 3) set.add(tc.substring(0,3).toUpperCase());
        if (type === 'idea' && tc.length >= 2) set.add(tc.substring(tc.length-2).toUpperCase());
    });

    datalist.innerHTML = Array.from(set).sort().map(val => `<option value="${val}">`).join('');
    
    const input = document.getElementById('smart-filter-input');
    if (input) {
        input.value = '';
        window.updateGalleryUI();
    }
};

window.updateGalleryUI = function() {
    const gridDiv = document.getElementById('gallery-grid');
    const sidebarDiv = document.getElementById('gallery-sidebar');
    const emptyDiv = document.getElementById('gallery-empty');
    const countDiv = document.getElementById('gallery-count');
    
    const type = document.getElementById('smart-filter-type')?.value;
    const searchVal = document.getElementById('smart-filter-input')?.value.trim().toUpperCase();
    const sortVal = document.getElementById('gal-sort')?.value || "newest";
    const isFavOnly = document.getElementById('gal-check-fav-only')?.checked || false;

    let preFiltered = window.GALLERY_DATA_CACHE.filter(item => {
        if (isFavOnly && !item.isFavorite) return false;

        if (!searchVal) return true;
        const tc = item.targetCode || "";
        const pb = (item.productBase || "").toUpperCase();
        
        if (type === 'pb') return pb.includes(searchVal);
        if (type === 'niche') return tc.substring(0,3).toUpperCase().includes(searchVal);
        if (type === 'idea') return tc.length >= 2 && tc.substring(tc.length-2).toUpperCase().includes(searchVal);
        return true;
    });

    let groupCounts = { 'ALL': preFiltered.length };
    preFiltered.forEach(s => {
        const tc = s.targetCode || 'OTHER';
        groupCounts[tc] = (groupCounts[tc] || 0) + 1;
    });

    let sidebarHtml = `
        <div onclick="window.currentGalleryTarget='all'; window.updateGalleryUI()" style="padding: 10px 14px; border-radius: 8px; cursor: pointer; text-align: center; font-weight: bold; font-size:13px; transition: 0.2s; ${window.currentGalleryTarget === 'all' ? 'background: #ea580c; color: white;' : 'background: #f8fafc; color: #64748b;'}">
            ALL <br><span style="font-size:11px; opacity:0.8;">${groupCounts['ALL']}</span>
        </div>`;
    
    Object.keys(groupCounts).forEach(tc => {
        if (tc === 'ALL') return;
        const shortTc = tc.length > 5 ? tc.substring(tc.length - 2) : tc; 
        sidebarHtml += `
            <div onclick="window.currentGalleryTarget='${tc}'; window.updateGalleryUI()" style="padding: 10px 14px; border-radius: 8px; cursor: pointer; text-align: center; font-weight: bold; font-size: 13px; transition: 0.2s; ${window.currentGalleryTarget === tc ? 'background: #fff7ed; border-left: 4px solid #ea580c; color: #ea580c;' : 'color: #94a3b8;'}">
                ${shortTc} <br><span style="font-size:11px; opacity:0.8;">${groupCounts[tc]}</span>
            </div>
        `;
    });
    if(sidebarDiv) sidebarDiv.innerHTML = sidebarHtml;

    let finalFiltered = preFiltered.filter(item => {
        if (window.currentGalleryTarget === 'all') return true;
        return item.targetCode === window.currentGalleryTarget;
    });

    if (sortVal === 'oldest') finalFiltered.sort((a,b) => new Date(a.date) - new Date(b.date));
    else if (sortVal === 'az') finalFiltered.sort((a,b) => (a.code || "").localeCompare(b.code || ""));
    else if (sortVal === 'za') finalFiltered.sort((a,b) => (b.code || "").localeCompare(a.code || ""));
    else finalFiltered.sort((a,b) => new Date(b.date) - new Date(a.date));

    if(countDiv) countDiv.innerText = `${finalFiltered.length} VIDEO(S) FOUND ON CLOUD`;

    if (finalFiltered.length === 0) {
        if (gridDiv) gridDiv.innerHTML = '';
        if (emptyDiv) emptyDiv.style.display = 'block';
        return;
    }
    if(emptyDiv) emptyDiv.style.display = 'none';

    let cardsHtml = '';
    finalFiltered.forEach(data => {
        const fullC = data.code || data.fullCode;
        const targetC = data.targetCode || fullC.substring(0,3);
        const starColor = data.isFavorite ? '#eab308' : '#cbd5e1';
        
        const mediaHtml = data.videoUrl
            ? `<video class="gallery-video" src="${data.videoUrl}" controls controlsList="nodownload" preload="metadata" poster="${data.imageUrl || ''}"></video>`
            : `<a href="${data.imageUrl}" target="_blank"><img src="${data.imageUrl}" style="width: 100%; height: 100%; object-fit: contain; background:#000;"></a>`;

        cardsHtml += `
            <div class="gallery-card" style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; width: 260px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05); display: flex; flex-direction: column;">
                <div style="width: 100%; aspect-ratio: 9 / 16; background: #000; overflow: hidden; display: flex; justify-content: center; align-items: center; position:relative;">
                    
                    <button onclick="window.toggleGalleryFavorite('${data.id}')" style="position:absolute; top:8px; left:8px; background:rgba(255,255,255,0.9); border:none; border-radius:6px; color:${starColor}; cursor:pointer; font-size:18px; padding:6px; z-index:10; display:flex; align-items:center; justify-content:center; transition:0.2s;" onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'">
                        <i class="${data.isFavorite ? 'ph-fill ph-star' : 'ph ph-star'}"></i>
                    </button>

                    <button onclick="window.deleteGalleryItem('${data.id}')" style="position:absolute; top:8px; right:8px; background:rgba(255,255,255,0.9); border:1px solid #fca5a5; border-radius:6px; color:#dc2626; cursor:pointer; font-size:16px; padding:5px; z-index:10; transition:0.2s;" onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'" title="Xóa khỏi Cloud Local"><i class="ph ph-trash"></i></button>
                    ${mediaHtml}
                </div>
                <div style="padding: 16px; border-top: 1px solid #e2e8f0; flex-grow: 1; display: flex; flex-direction: column;">
                    <h4 style="margin: 0 0 6px 0; font-size: 16px; color: #ea580c; text-transform: uppercase;">Mẫu: ${targetC}</h4>
                    <p style="margin: 0 0 12px 0; font-size: 12px; color: #64748b; line-height:1.5;" title="${data.productBase}">
                        <b>Product Base:</b> <span style="text-transform:uppercase;">${data.productBase}</span><br>
                        <b>Video Code:</b> ${fullC}
                    </p>
                    <div style="display: flex; gap: 8px; margin-top: auto;">
                        <button onclick="window.showCloudGalScriptModal('${data.id}')" style="flex: 1; padding: 10px; font-weight: 600; color: #334155; font-size: 13px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; cursor: pointer; display:flex; align-items:center; justify-content:center; gap:6px; transition:0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'"><i class="ph ph-note-pencil"></i> Prompt</button>
                        ${data.videoUrl ? `<button onclick="window.downloadGalleryVideo('${data.videoUrl}', '${fullC}', this)" style="flex: 1; padding: 10px; font-weight: 600; color: #166534; font-size: 13px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; cursor: pointer; display:flex; align-items:center; justify-content:center; gap:6px; transition:0.2s;" onmouseover="this.style.background='#dcfce7'" onmouseout="this.style.background='#f0fdf4'"><i class="ph ph-download-simple"></i> Video</button>` : ''}
                    </div>
                </div>
            </div>
        `;
    });
    if(gridDiv) gridDiv.innerHTML = cardsHtml;
};

window.toggleGalleryFavorite = async function(id) {
    try {
        const item = window.GALLERY_DATA_CACHE.find(s => s.id === id);
        if(item) {
            item.isFavorite = !item.isFavorite;
            window.updateGalleryUI();
        }
        await fetch(`${API_BASE_URL}/api/gallery/${id}/favorite`, { method: 'PATCH' });
    } catch(e) {
        alert("Lỗi khi cập nhật Cloud!");
    }
}

window.showCloudGalScriptModal = function(id) {
    const data = window.GALLERY_DATA_CACHE.find(i => i.id === id);
    if (!data) return;
    
    const promptText = data.prompt || data.script || data.content || '';
    const safePrompt = promptText.replace(/"/g, '&quot;').replace(/`/g, '\\`');
    const copyPromptStr = `navigator.clipboard.writeText(\`${safePrompt}\`); this.innerHTML='<i class=\\'ph ph-check\\'></i> Copied!'; setTimeout(()=>this.innerHTML='<i class=\\'ph ph-copy\\'></i> Copy Prompt', 2000);`;
    
    const content = document.getElementById('script-modal-content');
    content.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; padding-right: 40px;">
            <h3 style="margin:0; color:#ea580c; font-size: 16px;">Prompt for [${data.code || data.fullCode}]</h3>
            <button onclick="${copyPromptStr}" style="padding: 8px 14px; border: 1px solid #fed7aa; border-radius: 6px; cursor: pointer; background: #fff7ed; font-weight: 600; color: #ea580c; font-size: 13px; display:flex; align-items:center; gap:6px;"><i class="ph ph-copy"></i> Copy Prompt</button>
        </div>
        <div style="color:#333; white-space:pre-wrap; background:#f8fafc; border:1px solid #e2e8f0; padding:16px; border-radius:8px; font-size:14px; line-height:1.6; max-height: 60vh; overflow-y: auto;">${promptText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
    `;
    document.getElementById('script-modal').style.display = 'flex';
};

window.deleteGalleryItem = async function(id) {
    if(!confirm("Xóa video này khỏi Cloud Gallery?")) return;
    try {
        window.GALLERY_DATA_CACHE = window.GALLERY_DATA_CACHE.filter(s => s.id !== id);
        window.updateGalleryUI();
        await fetch(`${API_BASE_URL}/api/gallery/${id}`, { method: 'DELETE' });
    } catch(e) { alert("Lỗi khi xóa!"); }
};

window.clearGallery = async function() {
    if(!confirm("⚠️ CẢNH BÁO: Xóa toàn bộ Video trong Gallery Local?")) return;
    try {
        window.GALLERY_DATA_CACHE = [];
        window.updateGalleryUI();
        await fetch(`${API_BASE_URL}/api/gallery`, { method: 'DELETE' });
    } catch(e) { alert("Lỗi khi Clear Gallery!"); }
};

// ==========================================
// GLOBAL EVENT LISTENERS
// ==========================================
document.addEventListener('click', function(e) {
    const modal = document.getElementById('script-modal');
    // Nếu bấm đúng vào phần vùng xám mờ (overlay) bao quanh, thì đóng modal lại
    if (modal && e.target === modal) {
        modal.style.display = 'none';
    }
});
// ==========================================
// HÀM TẢI VIDEO THÔNG MINH TRONG GALLERY
// ==========================================
window.downloadGalleryVideo = async function(url, code, btn) {
    // Lưu trạng thái nút ban đầu để phục hồi
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i>';
    btn.disabled = true;

    try {
        // Cố gắng fetch để ép trình duyệt tải trực tiếp thành file .mp4
        const response = await fetch(url);
        if(!response.ok) throw new Error("CORS or Network issue");
        
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `Macorner_${code}.mp4`;
        document.body.appendChild(a);
        a.click();
        
        window.URL.revokeObjectURL(blobUrl);
        document.body.removeChild(a);
        
        // Báo hiệu tải thành công
        btn.innerHTML = '<i class="ph ph-check"></i>';
        setTimeout(() => { 
            btn.innerHTML = originalHtml; 
            btn.disabled = false; 
        }, 2000);

    } catch(e) {
        // Fallback: Nếu Server BytePlus chặn CORS không cho fetch ngầm, 
        // hệ thống sẽ bật video sang tab mới để user ấn Ctrl+S (hoặc bấm chuột phải -> Lưu video).
        window.open(url, '_blank');
        btn.innerHTML = originalHtml;
        btn.disabled = false;
    }
};
