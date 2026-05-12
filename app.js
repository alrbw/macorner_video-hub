/**
 * MACORNER STRATEGY BUILDER
 * FULL AUTO V14 (Auto-Fallback, AI Image Generation, Gallery Tab)
 */

let RAW_DATA = [];
let SELECTED_PAIRS = new Map();
let FINAL_SELECTED_CODES = new Map();

let CSV_HEADERS = [];
let PB_INDEX = -1;

// Biến lưu trữ ngầm Data
let CURRENT_INPUT_VAL = "";
let GLOBAL_TARGET_CODE = "";
let GLOBAL_PRODUCT_BASE = "";
let GLOBAL_SCRAPED_DATA = "";
let GLOBAL_IMAGE_URL = "";
let CURRENT_NICHE = "";
let AI_CACHE = new Map();

// BỔ SUNG: Mảng lưu trữ ảnh của Gallery
window.SCENE_GALLERY = [];

function switchView(view) {
    document.querySelectorAll('.view-pane').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(`view-${view}`).classList.add('active');
    document.getElementById(`nav-${view}`).classList.add('active');

    if (view === 'review') renderReviewView();
    if (view === 'gallery') renderGalleryView(); // Gọi hàm render khi bấm tab
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

    if (CURRENT_INPUT_VAL !== inputVal) {
        SELECTED_PAIRS.clear(); FINAL_SELECTED_CODES.clear(); AI_CACHE.clear();

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

        CURRENT_INPUT_VAL = inputVal;
    }

    const btn = this;
    const analysisSec = document.getElementById('analysisSection');

    GLOBAL_PRODUCT_BASE = ""; GLOBAL_SCRAPED_DATA = ""; GLOBAL_IMAGE_URL = "";
    GLOBAL_TARGET_CODE = inputVal;

    if (inputVal.startsWith('http')) {
        analysisSec.style.display = 'none';
        btn.innerText = "⏳ Loading The Product...";
        btn.disabled = true;

        try {
            const res = await fetch('http://localhost:3000/api/analyze-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: inputVal })
            });
            const data = await res.json();

            if (data.error) throw new Error(data.error);

            GLOBAL_TARGET_CODE = data.targetCode;
            GLOBAL_PRODUCT_BASE = data.productBase;
            GLOBAL_SCRAPED_DATA = data.scrapedData;
            GLOBAL_IMAGE_URL = data.imageUrl || "";

            document.getElementById('targetVideoCode').value = GLOBAL_TARGET_CODE;
        } catch (err) {
            alert(`❌ Lỗi phân tích link: ${err.message}`);
            btn.innerText = "Start Analysis";
            btn.disabled = false;
            return;
        } finally {
            btn.innerText = "Start Analysis";
            btn.disabled = false;
        }
    } else {
        const historyExact = RAW_DATA.filter(i => i.adName.toUpperCase().includes(GLOBAL_TARGET_CODE.toUpperCase()));
        if (historyExact.length > 0 && historyExact.find(h => h.productBase)) {
            GLOBAL_PRODUCT_BASE = historyExact.find(h => h.productBase).productBase;
        }
        const tcMatch = inputVal.match(/([A-Z]{3}\d{4,10}[A-Z0-9]*)/);
        if (tcMatch) GLOBAL_TARGET_CODE = tcMatch[1];
    }

    analysisSec.style.display = 'block';
    const history = RAW_DATA.filter(i => i.adName.includes(GLOBAL_TARGET_CODE) && i.elements);
    CURRENT_NICHE = history.length > 0 ? extractNiche(history[0].adName) : extractNiche(GLOBAL_TARGET_CODE);

    const hContainer = document.getElementById('historyContainer');
    if (history.length > 0) {
        hContainer.style.display = 'block';
        renderHistoryTable(history);
    } else {
        hContainer.style.display = 'none';
    }

    renderMatrix(CURRENT_NICHE, history.length > 0 ? 9 : 5, GLOBAL_TARGET_CODE);
};

function getTopElements(niche, type, limit) {
    let pool = ELEMENTS_DATA[type].map(i => i.Code.toString().padStart(2, '0'));
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

function renderHistoryTable(data) {
    let html = `<table><thead><tr><th>Ad Name</th><th>Product Base</th><th>Full Code</th><th>Spent</th></tr></thead><tbody>`;
    data.forEach(item => {
        html += `<tr><td style="text-align:left">${item.adName}</td><td>${item.productBase || 'N/A'}</td><td><span class="full-code-text" data-full="${item.elements}">${item.elements}</span></td><td>$${item.spent.toLocaleString()}</td></tr>`;
    });
    document.getElementById('historyTableWrapper').innerHTML = html + `</tbody></table>`;
}

function renderMatrix(niche, limit, targetCode) {
    const e2List = getTopElements(niche, 'E2', limit);
    const e4List = getTopElements(niche, 'E4', limit);
    const container = document.getElementById('matrixContainer');

    let html = `<table><thead><tr><th>E4 \\ E2</th>`;
    e2List.forEach(e2 => { html += `<th><span class="code-box" data-type="E2" data-code="${e2.code}">${e2.code}</span><br><small>$${e2.spent.toLocaleString()}</small></th>`; });
    html += `</tr></thead><tbody>`;

    e4List.forEach(e4 => {
        html += `<tr><td><span class="code-box" data-type="E4" data-code="${e4.code}">${e4.code}</span><br><small>$${e4.spent.toLocaleString()}</small></td>`;
        e2List.forEach(e2 => {
            const pairKey = `${e2.code}-${e4.code}`;
            const isRan = RAW_DATA.some(s => s.adName.toUpperCase().includes(targetCode.toUpperCase()) && s.elements && s.elements.substring(2, 4) === e2.code && s.elements.substring(6, 8) === e4.code);
            const isChecked = SELECTED_PAIRS.has(pairKey) ? 'checked' : '';
            html += `<td class="${isRan ? 'cell-history' : ''}"><input type="checkbox" class="round-checkbox" ${isChecked} onchange="togglePair('${e2.code}', '${e4.code}', this)"></td>`;
        });
        html += `</tr>`;
    });
    container.innerHTML = html + `</tbody></table>`;
}

function togglePair(e2, e4, checkbox) {
    const key = `${e2}-${e4}`;
    if (checkbox.checked) { if (!SELECTED_PAIRS.has(key)) SELECTED_PAIRS.set(key, { e2, e4 }); }
    else { SELECTED_PAIRS.delete(key); }
    updateMixArea();
}

function updateMixArea() {
    const area = document.getElementById('mixArea');
    const headers = document.getElementById('tabHeaders');
    const contents = document.getElementById('tabContents');
    if (SELECTED_PAIRS.size === 0) { area.style.display = 'none'; return; }

    area.style.display = 'block';
    const currentActive = document.querySelector('#tabHeaders .tab-btn.active')?.dataset.key;

    headers.innerHTML = '';
    SELECTED_PAIRS.forEach((val, key) => {
        headers.innerHTML += `<button class="tab-btn ${currentActive === key ? 'active' : ''}" data-key="${key}" onclick="switchTab('${key}', 'tabHeaders', 'tabContents')">Pair ${key}</button>`;
        if (!document.getElementById(`pane-${key}`)) {
            const pane = document.createElement('div');
            pane.className = 'tab-pane'; pane.id = `pane-${key}`;
            pane.innerHTML = `<button class="btn-primary" onclick="generateMixForTab('${key}')" style="margin-bottom:15px">Generate Mix E1 & E5</button><div class="table-container" id="mix-table-${key}"></div>`;
            contents.appendChild(pane);
        }
    });
    const finalKey = currentActive && SELECTED_PAIRS.has(currentActive) ? currentActive : SELECTED_PAIRS.keys().next().value;
    switchTab(finalKey, 'tabHeaders', 'tabContents');
}

function switchTab(key, headerId, contentId) {
    document.querySelectorAll(`#${headerId} .tab-btn`).forEach(b => b.classList.toggle('active', b.dataset.key === key));
    document.querySelectorAll(`#${contentId} .tab-pane`).forEach(p => p.classList.toggle('active', p.id.includes(key)));
}

function generateMixForTab(key) {
    const pair = SELECTED_PAIRS.get(key);
    const e1Opts = getSmartMix(CURRENT_NICHE, 'E1', 5);
    const e5Opts = getSmartMix(CURRENT_NICHE, 'E5', 5);

    let html = `<table><thead><tr><th>Option</th><th>E1</th><th>E2</th><th>E3</th><th>E4</th><th>E5</th><th>Full Code</th><th>Select</th></tr></thead><tbody>`;
    for (let i = 0; i < 5; i++) {
        const e1 = e1Opts[i] || "01", e5 = e5Opts[i] || "01";
        const full = `${e1}${pair.e2}03${pair.e4}${e5}`;
        const isChecked = FINAL_SELECTED_CODES.has(full) ? 'checked' : '';
        html += `<tr><td>#${i + 1}</td><td><span class="code-box" data-type="E1" data-code="${e1}">${e1}</span></td><td>${pair.e2}</td><td>03</td><td>${pair.e4}</td><td><span class="code-box" data-type="E5" data-code="${e5}">${e5}</span></td><td><span class="full-code-text" data-full="${full}">${full}</span></td><td><input type="checkbox" class="round-checkbox" ${isChecked} onchange="toggleFinalCode('${full}', '${key}', this)"></td></tr>`;
    }
    document.getElementById(`mix-table-${key}`).innerHTML = html + `</tbody></table>`;
}

function getSmartMix(niche, type, limit) {
    let pool = ELEMENTS_DATA[type].map(i => i.Code.toString().padStart(2, '0'));
    if (type === 'E1') pool = pool.filter(code => code !== '00');
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

function toggleFinalCode(fullCode, pairKey, checkbox) {
    if (checkbox.checked) FINAL_SELECTED_CODES.set(fullCode, { fullCode, pairKey });
    else FINAL_SELECTED_CODES.delete(fullCode);
}

function renderReviewView() {
    const headers = document.getElementById('reviewTabHeaders');
    const contents = document.getElementById('reviewTabContents');
    const msg = document.getElementById('no-selection-msg');

    const oldPb = document.getElementById('pb-container');
    if (oldPb) oldPb.remove();

    headers.innerHTML = ''; contents.innerHTML = '';

    if (FINAL_SELECTED_CODES.size === 0) { msg.style.display = 'block'; return; }
    msg.style.display = 'none';

    let displayProductName = GLOBAL_PRODUCT_BASE;
    if (!displayProductName && GLOBAL_TARGET_CODE) {
        const historyMatch = RAW_DATA.find(i => i.adName.includes(GLOBAL_TARGET_CODE) && i.productBase);
        if (historyMatch) displayProductName = historyMatch.productBase;
    }
    if (!displayProductName) displayProductName = "Personalized Custom Gift";

    const linkBadgeHtml = GLOBAL_SCRAPED_DATA
        ? `<span style="background:#ecfdf5; color:#047857; padding:4px 8px; border-radius:4px; font-size:12px; font-weight:600; margin-left:15px; border: 1px solid #10b981;">✓ Scraped</span>`
        : "";

    const imgPreviewHtml = GLOBAL_IMAGE_URL
        ? `<img src="${GLOBAL_IMAGE_URL}" style="height: 44px; width: 44px; border-radius: 6px; border: 1px solid #ccc; object-fit: cover; margin-right: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">`
        : "";

    const pbContainer = document.createElement('div');
    pbContainer.id = 'pb-container';
    pbContainer.style.cssText = 'margin-bottom: 20px; padding: 15px; background: white; border: 1px solid var(--border); border-radius: 8px; display: flex; align-items: center; flex-wrap: wrap;';
    pbContainer.innerHTML = `
        ${imgPreviewHtml}
        <div style="display:flex; align-items:center; background: #fff3e0; padding: 8px 16px; border-radius: 8px; border: 1px solid #ffe0b2;">
            <span style="font-weight: 600; color: #e65100; margin-right: 8px;">🎯 Target Product Base:</span>
            <span style="font-weight: 800; font-size: 1.1rem; color: #bf360c; text-transform: uppercase;">${displayProductName}</span>
        </div>
        ${linkBadgeHtml}
    `;
    headers.parentNode.insertBefore(pbContainer, headers);

    const grouped = {};
    FINAL_SELECTED_CODES.forEach(item => {
        if (!grouped[item.pairKey]) grouped[item.pairKey] = [];
        grouped[item.pairKey].push(item.fullCode);
    });

    Object.keys(grouped).forEach((pairKey, idx) => {
        headers.innerHTML += `<button class="tab-btn ${idx === 0 ? 'active' : ''}" data-key="${pairKey}" onclick="switchTab('${pairKey}', 'reviewTabHeaders', 'reviewTabContents')">Pair ${pairKey}</button>`;
        const pane = document.createElement('div');
        pane.className = `tab-pane ${idx === 0 ? 'active' : ''}`;
        pane.id = `review-pane-${pairKey}`;

        let tableHtml = `<table><thead><tr><th>Full Code</th><th>E1</th><th>E2</th><th>E3</th><th>E4</th><th>E5</th><th style="min-width: 150px;">Action</th></tr></thead><tbody>`;

        grouped[pairKey].forEach(code => {
            const e1 = code.substring(0, 2), e2 = code.substring(2, 4), e3 = code.substring(4, 6), e4 = code.substring(6, 8), e5 = code.substring(8, 10);

            const cacheData = AI_CACHE.get(code);
            const hasCache = !!cacheData;
            const scriptText = hasCache ? cacheData.scriptHtml : '';
            const isExpanded = hasCache ? cacheData.expanded : true;

            const aiRowStyle = hasCache && isExpanded ? 'table-row' : 'none';
            const btnText = hasCache ? '✨ Redo' : '✨ Create';
            const toggleIcon = isExpanded ? '▼' : '▶';
            const toggleDisplay = hasCache ? 'inline-block' : 'none';

            tableHtml += `<tr>
                <td><span class="full-code-text" data-full="${code}">${code}</span></td>
                <td><span class="code-box" data-type="E1" data-code="${e1}">${e1}</span></td>
                <td>${e2}</td><td>${e3}</td><td>${e4}</td>
                <td><span class="code-box" data-type="E5" data-code="${e5}">${e5}</span></td>
                <td style="white-space: nowrap;">
                    <button class="btn-primary" onclick="generateAIScript('${code}', this)" style="padding: 6px 12px; font-size: 0.8rem; background: #10a37f; border: none; cursor: pointer;">${btnText}</button>
                    <button id="toggle-btn-${code}" onclick="toggleAI('${code}')" style="display: ${toggleDisplay}; background: #f0f0f0; border: 1px solid #ccc; border-radius: 4px; padding: 5px 8px; cursor: pointer; margin-left: 5px; font-size: 0.8rem;">${toggleIcon}</button>
                </td>
            </tr>
            <tr id="ai-row-${code}" style="display: ${aiRowStyle}; background:#f8fafc;">
                <td colspan="7" style="padding: 15px; text-align: left; border-left: 3px solid #10a37f;">
                    <div id="ai-result-${code}" style="font-size: 14px; line-height: 1.6; color: #333;">${scriptText}</div>
                </td>
            </tr>`;
        });
        pane.innerHTML = tableHtml + `</tbody></table>`;
        contents.appendChild(pane);
    });
}

function toggleAI(code) {
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
}

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
        const info = ELEMENTS_DATA[type]?.find(i => i.Code.toString().padStart(2, '0') == code.padStart(2, '0'));
        if (info) {
            const tt = document.getElementById('tooltip');
            const name = info.Detail || info.Hook || info['Insights to niches'] || info.CTA || info['Source/Video Type'] || "N/A";
            tt.innerHTML = `<b>${name}</b><i>${info.Explanation || ''}</i>`;
            tt.style.display = 'block';
        }
    }

    const fullCodeElem = e.target.closest('.full-code-text');
    if (fullCodeElem && fullCodeElem.dataset.full) {
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

// ==========================================
// GỌI AI VÀ TRUYỀN HÌNH ẢNH (VISION)
// ==========================================
async function generateAIScript(fullCode, btn) {
    const pbElement = document.querySelector('#pb-container span[style*="color: #bf360c"]');
    const productBase = pbElement ? pbElement.innerText : (GLOBAL_PRODUCT_BASE || "Personalized Custom Gift");

    const row = document.getElementById(`ai-row-${fullCode}`);
    const resultBox = document.getElementById(`ai-result-${fullCode}`);
    const toggleBtn = document.getElementById(`toggle-btn-${fullCode}`);

    row.style.display = 'table-row';
    if (toggleBtn) { toggleBtn.style.display = 'inline-block'; toggleBtn.innerText = '▼'; }
    btn.disabled = true;

    let processText = GLOBAL_IMAGE_URL
        ? `<i>⏳ Loading...</i>`
        : `<i>⏳</i>`;
    resultBox.innerHTML = processText;

    try {
        const spentCodes = RAW_DATA.filter(i => i.adName.toUpperCase().includes(CURRENT_NICHE) && i.spent > 0 && i.elements).map(i => i.elements);

        const e1 = fullCode.substring(0, 2), e2 = fullCode.substring(2, 4), e3 = fullCode.substring(4, 6), e4 = fullCode.substring(6, 8), e5 = fullCode.substring(8, 10);
        const getEl = (type, code) => ELEMENTS_DATA[type]?.find(i => i.Code.toString().padStart(2, '0') === code);

        const iE1 = getEl('E1', e1), iE2 = getEl('E2', e2), iE3 = getEl('E3', e3), iE4 = getEl('E4', e4), iE5 = getEl('E5', e5);
        const getName = (obj) => obj ? (obj.Hook || obj.Detail || obj['Source/Video Type'] || obj['Insights to niches'] || obj.CTA || '') : '';

        const elementsContext = `E1: ${getName(iE1)} - ${iE1?.Explanation || ''}\nE2: ${getName(iE2)} - ${iE2?.Explanation || ''}\nE3: ${getName(iE3)} - ${iE3?.Explanation || ''}\nE4: ${getName(iE4)} - ${iE4?.Explanation || ''}\nE5: ${getName(iE5)} - ${iE5?.Explanation || ''}`;
        const eData = { e1: getName(iE1), e2: getName(iE2), e3: getName(iE3), e4: getName(iE4), e5: getName(iE5) };

        const res = await fetch('http://localhost:3000/api/generate-script', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fullCode, niche: CURRENT_NICHE, productBase,
                scrapedData: GLOBAL_SCRAPED_DATA,
                imageUrl: GLOBAL_IMAGE_URL,
                elementsContext, spentCodes, eData
            })
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        let badges = [];
        if (data.hasImage) badges.push(`<span style="background:#fce7f3; color:#be185d; padding:2px 6px; border-radius:4px; font-size:12px; margin-left:5px;">👁️ AI OCR Vision</span>`);

        const badgesHtml = badges.join('');

        // ── Helper: lấy plain text từ script để copy/save
        const rawScriptText = data.script;

        // ── Nút Generate Scene Image
        const imgBtnHtml = `<button id="img-btn-${fullCode}" onclick="requestSceneImage('${fullCode}')" 
            style="background:#2563eb;color:white;border:none;padding:6px 12px;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;box-shadow:0 2px 4px rgba(0,0,0,.1);">
            🖼️ Generate Scene Image
        </button>`;

        // ── Nút Copy Script
        const copyBtnHtml = `<button onclick="copyScript_${fullCode}()" 
            id="copy-btn-${fullCode}"
            style="background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;padding:6px 12px;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;">
            📋 Copy
        </button>`;

        // ── Nút Save Script (.txt)
        const saveBtnHtml = `<button onclick="saveScript_${fullCode}()" 
            style="background:#f0fdf4;color:#166534;border:1px solid #bbf7d0;padding:6px 12px;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;">
            💾 Save
        </button>`;

        const scriptHtml = `
            <div style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;background:#f8fafc;padding:8px 12px;border-radius:6px;border:1px solid #e2e8f0;gap:8px;flex-wrap:wrap;">
                <div><strong>🤖 AI Content Created For [${productBase}]:</strong> ${badgesHtml}</div>
                <div style="display:flex;gap:8px;align-items:center;">
                    ${copyBtnHtml}
                    ${saveBtnHtml}
                    ${imgBtnHtml}
                </div>
            </div>
            <div style="white-space:pre-wrap;">${data.script}</div>
        `;

        resultBox.innerHTML = scriptHtml;

        // ── Gắn logic Copy (dùng function toàn cục để onclick trong innerHTML gọi được)
        window[`copyScript_${fullCode}`] = function () {
            const cleanedScript = rawScriptText
                .split('\n')
                .map(line => line.replace(/^\[\d+:\d+-\d+:\d+\]\s*/, ''))
                .join('\n');

            navigator.clipboard.writeText(cleanedScript).then(() => {
                const copyBtn = document.getElementById(`copy-btn-${fullCode}`);
                if (copyBtn) {
                    copyBtn.innerText = '✅ Copied!';
                    setTimeout(() => { copyBtn.innerText = '📋 Copy'; }, 2000);
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

        // ── Gắn logic Save (.txt)

        window[`saveScript_${fullCode}`] = function () {
            if (typeof saveToStore === 'function') {
                saveToStore(fullCode, productBase, rawScriptText, GLOBAL_TARGET_CODE || fullCode);
            }
        };

        AI_CACHE.set(fullCode, { scriptHtml, rawScript: rawScriptText, expanded: true });

    } catch (err) {
        resultBox.innerHTML = `<span style="color:red;">❌ Lỗi: ${err.message} <br>(Bạn nhớ chạy Node.js ngầm nhé)</span>`;
    } finally {
        btn.disabled = false;
        btn.innerText = "✨ Redo";
    }
}


// ==========================================
// TÍNH NĂNG MỚI: YÊU CẦU API TẠO ẢNH SCENE
// ==========================================
async function requestSceneImage(fullCode) {
    const btn = document.getElementById(`img-btn-${fullCode}`);
    if (!btn) return;

    const cacheData = AI_CACHE.get(fullCode);
    if (!cacheData || !cacheData.rawScript) return alert("Please generate Content first!");

    const pbElement = document.querySelector('#pb-container span[style*="color: #bf360c"]');
    const productBase = pbElement ? pbElement.innerText : (GLOBAL_PRODUCT_BASE || "Product");

    btn.innerText = "⏳ Generating (~15s)...";
    btn.disabled = true;
    btn.style.background = "#94a3b8";

    try {
        const res = await fetch('http://localhost:3000/api/generate-scene-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fullCode: fullCode,
                script: cacheData.rawScript,
                productBase: productBase,
                scrapedData: GLOBAL_SCRAPED_DATA,
                imageUrl: GLOBAL_IMAGE_URL
            })
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        // Lưu vào mảng SCENE_GALLERY toàn cầu
        if (!window.SCENE_GALLERY) window.SCENE_GALLERY = [];
        window.SCENE_GALLERY.push({
            fullCode: fullCode,
            imageUrl: data.imageUrl,
            script: cacheData.rawScript,
            productBase: productBase
        });

        alert("✅ Image generated successfully! Check the 'Scene Gallery' tab.");
        btn.innerText = "✅ Saved to Gallery";
        btn.style.background = "#10b981";

    } catch (err) {
        alert(`❌ Lỗi tạo ảnh: ${err.message}`);
        btn.innerText = "🖼️ Generate Scene Image";
        btn.style.background = "#2563eb";
        btn.disabled = false;
    }
}

// ==========================================
// RENDER TAB GALLERY (XEM ẢNH VÀ NỘI DUNG)
// ==========================================
function renderGalleryView() {
    const container = document.getElementById('gallery-container');
    if (!container) return;

    if (!window.SCENE_GALLERY || window.SCENE_GALLERY.length === 0) {
        container.innerHTML = `<div style="padding: 40px; text-align: center; color: #999; width: 100%;">No scene images generated yet. Go to Selection Review to generate some!</div>`;
        return;
    }

    let html = '';
    // Đảo ngược mảng để hiển thị ảnh vừa tạo lên đầu tiên
    const reversed = [...window.SCENE_GALLERY].reverse();

    reversed.forEach((data, index) => {
        // Lấy đúng index theo mảng gốc để làm hàm hiển thị Modal
        const originalIndex = window.SCENE_GALLERY.length - 1 - index;

        html += `
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; width: 260px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); display: flex; flex-direction: column;">
                <div style="width: 100%; aspect-ratio: 9 / 16; background: #f8fafc; overflow: hidden;">
                    <a href="${data.imageUrl}" target="_blank">
                        <img src="${data.imageUrl}" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" loading="lazy">
                    </a>
                </div>
                <div style="padding: 15px; border-top: 1px solid #e2e8f0; flex-grow: 1; display: flex; flex-direction: column;">
                    <h4 style="margin: 0 0 5px 0; font-size: 14px; color: #f97316;">Code: ${data.fullCode}</h4>
                    <p style="margin: 0 0 10px 0; font-size: 12px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-transform: uppercase; font-weight: 600;" title="${data.productBase}">${data.productBase}</p>
                    <button onclick="showScriptModal(${originalIndex})" style="width: 100%; padding: 8px; font-weight: bold; color: #334155; font-size: 12px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; cursor: pointer; margin-top: auto;">📝 Check Content</button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Hiển thị Content Text trong Tab Gallery
function showScriptModal(index) {
    const data = window.SCENE_GALLERY[index];
    if (!data) return;
    const content = document.getElementById('script-modal-content');
    content.innerHTML = `<h3 style="margin-top:0; color:#f97316;">Content for [${data.fullCode}]</h3><div style="color:#333;">${data.script}</div>`;
    document.getElementById('script-modal').style.display = 'flex';
}