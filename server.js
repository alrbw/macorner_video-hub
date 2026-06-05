require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

function cleanAIScript(text) {
    if (!text) return "";
    return text
        .replace(/"/g, '')
        .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
        .replace(/#\w+/g, '')
        .replace(/[^\w\s\[\]:'\-.,]/g, '')
        .replace(/\s+/g, ' ')
        .replace(/(\[\d{1,2}:\d{2}-\d{1,2}:\d{2}\])/g, '\n$1')
        .trim();
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function getLarkToken() {
    const res = await axios.post('https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal', {
        app_id: process.env.APP_ID, app_secret: process.env.APP_SECRET
    });
    return res.data.tenant_access_token;
}

// =====================================================================
// CLOUD SCRIPT STORE DỰA TRÊN NỀN TẢNG LARK BASE
// =====================================================================

app.get('/api/store', async (req, res) => {
    try {
        const token = await getLarkToken();
        const larkUrl = `https://open.larksuite.com/open-apis/bitable/v1/apps/${process.env.BITABLE_APP_TOKEN}/tables/${process.env.STORE_TABLE_ID}/records?page_size=500`;
        
        const recordsRes = await axios.get(larkUrl, { headers: { 'Authorization': `Bearer ${token}` } });
        const items = recordsRes.data?.data?.items || [];
        
        const store = items.map(item => ({
            id: item.record_id,
            code: item.fields['Code'] || "",
            productBase: item.fields['Product Base'] || "",
            targetCode: item.fields['Target Code'] || "",
            content: item.fields['Content'] || "",
            isFavorite: !!item.fields['Is Favorite'],
            date: item.fields['Date'] || new Date().toISOString()
        }));
        
        store.sort((a, b) => new Date(b.date) - new Date(a.date));
        res.json(store);
    } catch(e) {
        console.error("Lỗi GET Store từ Lark:", e.message);
        res.status(500).json({ error: "Không thể lấy dữ liệu kịch bản từ Lark: " + e.message });
    }
});

app.post('/api/store', async (req, res) => {
    try {
        const token = await getLarkToken();
        const larkUrl = `https://open.larksuite.com/open-apis/bitable/v1/apps/${process.env.BITABLE_APP_TOKEN}/tables/${process.env.STORE_TABLE_ID}/records`;
        
        const fields = {
            "Code": req.body.code || req.body.fullCode || "",
            "Product Base": req.body.productBase || req.body.product || "Personalized Custom Gift",
            "Target Code": req.body.targetCode || "",
            "Content": req.body.content || "",
            "Is Favorite": false,
            "Date": new Date().toISOString()
        };

        const response = await axios.post(larkUrl, { fields }, { headers: { 'Authorization': `Bearer ${token}` } });
        const newRecord = response.data?.data?.record;
        
        res.json({ success: true, item: { id: newRecord?.record_id || Date.now().toString(), ...fields } });
    } catch(e) {
        res.status(500).json({ error: "Không thể ghi kịch bản lên Lark Base: " + e.message });
    }
});

app.patch('/api/store/:id/favorite', async (req, res) => {
    try {
        const { id } = req.params;
        const token = await getLarkToken();
        
        const getUrl = `https://open.larksuite.com/open-apis/bitable/v1/apps/${process.env.BITABLE_APP_TOKEN}/tables/${process.env.STORE_TABLE_ID}/records/${id}`;
        const recordRes = await axios.get(getUrl, { headers: { 'Authorization': `Bearer ${token}` } });
        const currentFav = !!recordRes.data?.data?.record?.fields?.['Is Favorite'];
        
        const patchUrl = `https://open.larksuite.com/open-apis/bitable/v1/apps/${process.env.BITABLE_APP_TOKEN}/tables/${process.env.STORE_TABLE_ID}/records/${id}`;
        await axios.patch(patchUrl, { fields: { "Is Favorite": !currentFav } }, { headers: { 'Authorization': `Bearer ${token}` } });
        
        res.json({ success: true, isFavorite: !currentFav });
    } catch(e) {
        res.status(500).json({ error: "Không thể đổi trạng thái yêu thích: " + e.message });
    }
});

app.delete('/api/store/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const token = await getLarkToken();
        const larkUrl = `https://open.larksuite.com/open-apis/bitable/v1/apps/${process.env.BITABLE_APP_TOKEN}/tables/${process.env.STORE_TABLE_ID}/records/${id}`;
        await axios.delete(larkUrl, { headers: { 'Authorization': `Bearer ${token}` } });
        res.json({ success: true });
    } catch(e) {
        res.status(500).json({ error: "Không thể xóa kịch bản này trên Lark: " + e.message });
    }
});

app.delete('/api/store', async (req, res) => {
    try {
        const token = await getLarkToken();
        const getUrl = `https://open.larksuite.com/open-apis/bitable/v1/apps/${process.env.BITABLE_APP_TOKEN}/tables/${process.env.STORE_TABLE_ID}/records?page_size=500`;
        const recordsRes = await axios.get(getUrl, { headers: { 'Authorization': `Bearer ${token}` } });
        const items = recordsRes.data?.data?.items || [];
        
        if (items.length > 0) {
            const recordIds = items.map(i => i.record_id);
            const deleteUrl = `https://open.larksuite.com/open-apis/bitable/v1/apps/${process.env.BITABLE_APP_TOKEN}/tables/${process.env.STORE_TABLE_ID}/records/batch_delete`;
            await axios.post(deleteUrl, { records: recordIds }, { headers: { 'Authorization': `Bearer ${token}` } });
        }
        res.json({ success: true });
    } catch(e) {
        res.status(500).json({ error: "Không thể dọn sạch bảng lưu trữ: " + e.message });
    }
});

// =====================================================================
// CLOUD SCENE GALLERY DỰA TRÊN LARK BASE
// =====================================================================

app.get('/api/gallery', async (req, res) => {
    try {
        if(!process.env.GALLERY_TABLE_ID) return res.json([]);
        const token = await getLarkToken();
        const larkUrl = `https://open.larksuite.com/open-apis/bitable/v1/apps/${process.env.BITABLE_APP_TOKEN}/tables/${process.env.GALLERY_TABLE_ID}/records?page_size=500`;
        
        const recordsRes = await axios.get(larkUrl, { headers: { 'Authorization': `Bearer ${token}` } });
        const items = recordsRes.data?.data?.items || [];
        
        const gallery = items.map(item => ({
            id: item.record_id,
            code: item.fields['Code'] || "",
            productBase: item.fields['Product Base'] || "",
            targetCode: item.fields['Target Code'] || "",
            videoUrl: item.fields['Video URL'] || "",
            imageUrl: item.fields['Image URL'] || "",
            prompt: item.fields['Prompt'] || "",
            date: item.fields['Date'] || new Date().toISOString()
        }));
        
        gallery.sort((a, b) => new Date(b.date) - new Date(a.date));
        res.json(gallery);
    } catch(e) {
        console.error("Lỗi GET Gallery từ Lark:", e.message);
        res.status(500).json({ error: "Lỗi GET Gallery: " + e.message });
    }
});

app.post('/api/gallery', async (req, res) => {
    try {
        if(!process.env.GALLERY_TABLE_ID) return res.json({success: true, msg: "Bỏ qua lưu Lark vì thiếu GALLERY_TABLE_ID"});
        const token = await getLarkToken();
        const larkUrl = `https://open.larksuite.com/open-apis/bitable/v1/apps/${process.env.BITABLE_APP_TOKEN}/tables/${process.env.GALLERY_TABLE_ID}/records`;
        
        const fields = {
            "Code": req.body.code || req.body.fullCode || "",
            "Product Base": req.body.productBase || "",
            "Target Code": req.body.targetCode || "",
            "Video URL": req.body.videoUrl || "",
            "Image URL": req.body.imageUrl || "",
            "Prompt": req.body.prompt || req.body.script || "",
            "Date": new Date().toISOString()
        };

        const response = await axios.post(larkUrl, { fields }, { headers: { 'Authorization': `Bearer ${token}` } });
        res.json({ success: true, item: { id: response.data?.data?.record?.record_id, ...fields } });
    } catch(e) {
        console.error("Lỗi POST Gallery lên Lark:", e.message);
        res.status(500).json({ error: "Lỗi POST Gallery: " + e.message });
    }
});

app.delete('/api/gallery/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const token = await getLarkToken();
        const larkUrl = `https://open.larksuite.com/open-apis/bitable/v1/apps/${process.env.BITABLE_APP_TOKEN}/tables/${process.env.GALLERY_TABLE_ID}/records/${id}`;
        await axios.delete(larkUrl, { headers: { 'Authorization': `Bearer ${token}` } });
        res.json({ success: true });
    } catch(e) {
        res.status(500).json({ error: "Không thể xóa Video này trên Lark: " + e.message });
    }
});

app.delete('/api/gallery', async (req, res) => {
    try {
        const token = await getLarkToken();
        const getUrl = `https://open.larksuite.com/open-apis/bitable/v1/apps/${process.env.BITABLE_APP_TOKEN}/tables/${process.env.GALLERY_TABLE_ID}/records?page_size=500`;
        const recordsRes = await axios.get(getUrl, { headers: { 'Authorization': `Bearer ${token}` } });
        const items = recordsRes.data?.data?.items || [];
        
        if (items.length > 0) {
            const recordIds = items.map(i => i.record_id);
            const deleteUrl = `https://open.larksuite.com/open-apis/bitable/v1/apps/${process.env.BITABLE_APP_TOKEN}/tables/${process.env.GALLERY_TABLE_ID}/records/batch_delete`;
            await axios.post(deleteUrl, { records: recordIds }, { headers: { 'Authorization': `Bearer ${token}` } });
        }
        res.json({ success: true });
    } catch(e) {
        res.status(500).json({ error: "Không thể dọn sạch Gallery trên Lark: " + e.message });
    }
});

// =====================================================================
// PHÂN TÍCH SẢN PHẨM & TẠO SCRIPT & TẠO PROMPT
// =====================================================================

app.post('/api/analyze-link', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ error: "Invalid URL" });

        let inputStr = url.trim();
        let isUrl = inputStr.startsWith('http');
        let asin = "";

        if (isUrl) {
            const urlWithoutQuery = inputStr.split('?')[0].replace(/\/$/, "");
            const urlParts = urlWithoutQuery.split('-');
            asin = urlParts[urlParts.length - 1].toUpperCase();
        } else {
            asin = inputStr.split('?')[0].toUpperCase();
        }

        let title = "", description = "", imageUrl = "";

        if (isUrl) {
            try {
                const response = await axios.get(inputStr, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 });
                const $ = cheerio.load(response.data);

                $('script[type="application/ld+json"]').each((i, el) => {
                    try {
                        let jsonData = JSON.parse($(el).html());
                        if (!Array.isArray(jsonData)) jsonData = [jsonData];

                        for (let item of jsonData) {
                            if (item['@type'] === 'Product' || item.sku) {
                                title = item.name || title;
                                description = item.description || description;
                                if (item.image) {
                                    if (Array.isArray(item.image)) imageUrl = item.image[0];
                                    else if (typeof item.image === 'string') imageUrl = item.image;
                                    else if (item.image.url) imageUrl = item.image.url;
                                }
                            }
                        }
                    } catch (e) { }
                });

                if (!title) title = $('h1').text().trim() || $('title').text().trim();
                
                if (!description) {
                    description = $('meta[name="description"]').attr('content') ||
                        $('meta[property="og:description"]').attr('content') || $('.product-description').text() ||
                        $('#description').text() || $('.description').text() || '';
                }

                if (!imageUrl) {
                    imageUrl = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content') || '';
                }

                if (imageUrl) {
                    if (imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl;
                    else if (imageUrl.startsWith('/')) {
                        try {
                            const parsedUrl = new URL(inputStr);
                            imageUrl = parsedUrl.origin + imageUrl;
                        } catch (e) { }
                    }
                }
            } catch (err) {
                console.error("Lỗi khi cào dữ liệu HTML:", err.message);
            }
        }

        let targetCode = "";
        let productBase = "";

        try {
            if (process.env.PRODUCT_APP_TOKEN && process.env.PRODUCT_TABLE_ID) {
                const token = await getLarkToken();
                const larkUrl = `https://open.larksuite.com/open-apis/bitable/v1/apps/${process.env.PRODUCT_APP_TOKEN}/tables/${process.env.PRODUCT_TABLE_ID}/records/search`;
                const searchRes = await axios.post(larkUrl, {
                    filter: { conjunction: "or", conditions: [{ field_name: "Code/ASIN", operator: "contains", value: [asin] }] }
                }, { headers: { 'Authorization': `Bearer ${token}` } });

                if (searchRes.data?.data?.items?.length > 0) {
                    const item = searchRes.data.data.items[0].fields;
                    productBase = item['Product Base'] || item['Product'] || ""; 
                    const recordStr = JSON.stringify(item);
                    const match = recordStr.match(/PR-([A-Z0-9\-]+)/i); 
                    if (match) targetCode = match[1].toUpperCase();
                }
            }
        } catch (err) {}

        if (!targetCode) {
            const tcMatch = asin.match(/([A-Z]{3}\d{4,10}[A-Z0-9]*)/);
            if (tcMatch) targetCode = tcMatch[1].toUpperCase();
            if (!targetCode) targetCode = asin.toUpperCase();
        }

        if (!targetCode) throw new Error(`Không tìm thấy Design Code cho dữ liệu: ${asin} trong Lark.`);

        const niche = targetCode.substring(0, 3).toUpperCase();
        let cleanDescription = description.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim().substring(0, 1500);
        let scrapedData = "";
        if (title || cleanDescription) scrapedData = `[PRODUCT TITLE]: ${title}\n[DESCRIPTION]: ${cleanDescription}`;

        res.json({ targetCode, niche, asin, productBase, scrapedData, imageUrl });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/generate-script', async (req, res) => {
    try {
        const { fullCode, niche, productBase, scrapedData, imageUrl, spentCodes, eData } = req.body;
        const safeNiche = String(niche || '');
        const larkToken = await getLarkToken();
        const larkUrl = `https://open.larksuite.com/open-apis/bitable/v1/apps/${process.env.BITABLE_APP_TOKEN}/tables/${process.env.TABLE_ID}/records?page_size=500`;
        const recordsRes = await axios.get(larkUrl, { headers: { 'Authorization': `Bearer ${larkToken}` } });
        const records = recordsRes.data.data.items || [];

        let scoredNotes = [];
        const safeSpentCodes = Array.isArray(spentCodes) ? spentCodes : [];

        records.forEach(item => {
            const fields = item.fields;
            if (!fields || !fields['Note Edit']) return;
            const code = String(fields['Code'] || fields['Video Code'] || ''); 
            let score = 0;
            if (code.toUpperCase().includes(safeNiche.toUpperCase())) score += 100;
            if (safeSpentCodes.some(sc => code.toUpperCase().includes(String(sc).toUpperCase()))) score += 15;
            if (score > 0) scoredNotes.push({ note: fields['Note Edit'], score: score });
        });
        scoredNotes.sort((a, b) => b.score - a.score);
        const referenceText = scoredNotes.slice(0, 5).map(n => n.note).join('\n---\n').substring(0, 3000);

        const getEDataName = (key) => typeof eData?.[key] === 'object' ? (eData[key]?.name || '') : (eData?.[key] || '');
        const getEDataExp = (key) => typeof eData?.[key] === 'object' ? (eData[key]?.exp || '') : '';
        const getEDataGroup = (key) => typeof eData?.[key] === 'object' ? (eData[key]?.group || '') : '';

        let e1Name = String(getEDataName('e1')); let e1Exp = String(getEDataExp('e1'));
        let e2Name = String(getEDataName('e2')); let e2Exp = String(getEDataExp('e2')); let e2Group = String(getEDataGroup('e2'));
        let e3Name = String(getEDataName('e3')); let e3Exp = String(getEDataExp('e3'));
        let e4Name = String(getEDataName('e4')); let e4Exp = String(getEDataExp('e4'));
        let e5Name = String(getEDataName('e5')); let e5Exp = String(getEDataExp('e5'));

        const e4 = fullCode.substring(6, 8);
        let insightName = String(e4Name);
        
        // Khai báo mặc định an toàn cho mọi luồng (Phòng sập ReferenceError)
        let buyer = "The Viewer";
        let receiver = "The Gift Recipient";

        let isSelfGift = e4 === "00" || insightName.toLowerCase().includes("self-gift") || insightName.toLowerCase().includes("self gift");

        let toneInstruction = "Engaging, authentic, and native to short-form videos.";
        let e1Lower = String(e1Name).toLowerCase();
        if (e1Lower.includes("funny") || e1Lower.includes("meme")) toneInstruction = "Humorous, trendy, and lighthearted. Keep this fun vibe consistent throughout the entire video.";
        else if (e1Lower.includes("ragebait") || e1Lower.includes("shock")) toneInstruction = "Controversial, slightly irritating or shocking to drive comments and engagement. Keep the tension high.";
        else if (e1Lower.includes("emotional")) toneInstruction = "Warm, sentimental, and deeply touching. Focus heavily on the emotional bond.";
        else if (e1Lower.includes("fact") || e1Lower.includes("proof") || e1Lower.includes("social proof")) toneInstruction = "Objective, informative, like a genuine user review or stating an interesting fact.";
        else if (e1Lower.includes("curiosity")) toneInstruction = "Mysterious and intriguing. Build suspense from the hook all the way to the end.";

        const elementsContext = `E1: ${e1Name} - ${e1Exp}\nE2: ${e2Name} - ${e2Exp}\nE3: ${e3Name} - ${e3Exp}\nE4: ${e4Name} - ${e4Exp}\nE5: ${e5Name} - ${e5Exp}`;

        let systemRole = "";
        let textPrompt = "";

        // ==========================================
        // LUỒNG 1: CHUYÊN BIỆT CHO SELF-GIFT (TỰ MUA)
        // ==========================================
        if (isSelfGift) {
            systemRole = "You are an expert UGC video scriptwriter. STRICT RULE: This is a SELF-PURCHASE scenario. The speaker bought the item for THEMSELVES. You will be severely penalized if you mention gifting to someone else.";
            textPrompt = `
TARGET DURATION: 20 to 25 seconds.
PRODUCT NAME: "${productBase || 'N/A'}"

=== WARNING: CRITICAL CONTEXT ===
The product details below might contain keywords like "gifts for dad", "perfect for grandpa", "for mom", etc. YOU MUST ABSOLUTELY IGNORE THOSE KEYWORDS. 
The scenario is STRICTLY SELF-PURCHASE. The speaker bought this item purely as a treat for THEMSELVES. 

${scrapedData ? `PRODUCT DETAILS:\n${scrapedData}\n` : ''}
${referenceText ? `ADDITIONAL NOTES / REFERENCES:\n${referenceText}\n` : ''}

=== CRITICAL INSTRUCTIONS ===
1. POV: SELF-PURCHASER (First-person). Use "I", "my", "me". Talk about why YOU bought it for YOURSELF. CRITICAL FATAL ERROR IF YOU MENTION BUYING IT FOR DAD, MOM, WIFE, OR ANYONE ELSE.
2. TONE: ${toneInstruction}

=== SCRIPT STRUCTURE ===
1. HOOK (0:00-0:03): "${e1Name}" - Frame it around treating oneself.
2. BODY: "${e2Name}" - Showcase the product following this exact storyline. Focus purely on personal reaction.
3. CTA: "${e5Name}" - Encourage the viewer to treat themselves.
ADDITIONAL CONTEXT:\n${elementsContext}
=== OUTPUT FORMAT ===
[0:00-0:03] Your sentence here. (Only spoken script, 1 sentence per timestamp)`;
        } 
        // ==========================================
        // LUỒNG 2: DÀNH CHO MUA TẶNG QUÀ (BÌNH THƯỜNG)
        // ==========================================
        else {
            systemRole = "You are an expert UGC and marketing scriptwriter who adapts perfectly to any given persona (Buyer, Receiver, or Seller).";
            
            let match = insightName.match(/to\s+(.*?)\s+from\s+(.*)/i);
            if (match) { receiver = match[1].trim(); buyer = match[2].trim(); }
            else { let fMatch = insightName.match(/for\s+(.*)/i); if (fMatch) { receiver = fMatch[1].trim(); buyer = `Anyone buying for ${receiver}`; } }

            let e2Check = String(e2Group + " " + e2Name).toLowerCase();
            let povInstruction = "STORE OWNER / BRAND POV: Speak directly to the viewer. Use 'we', 'our'.";
            if (e2Check.includes("buyer")) povInstruction = `BUYER POV (First-person): You bought this as a gift for ${receiver}. Use 'I', 'my'.`;
            else if (e2Check.includes("receiver")) povInstruction = `RECEIVER POV (First-person): You received this gift from ${buyer}. Use 'I', 'my'.`;

            textPrompt = `
TARGET DURATION: 20 to 25 seconds.
PRODUCT NAME: "${productBase || 'N/A'}"
GIFTING CONTEXT: The buyer is ${buyer}. The recipient is ${receiver}.

${scrapedData ? `PRODUCT DETAILS:\n${scrapedData}\n` : ''}
${referenceText ? `ADDITIONAL NOTES / REFERENCES:\n${referenceText}\n` : ''}

=== CRITICAL INSTRUCTIONS ===
1. POV: ${povInstruction}
2. TONE: ${toneInstruction}

=== SCRIPT STRUCTURE ===
1. HOOK (0:00-0:03): "${e1Name}"
2. BODY: "${e2Name}" 
3. CTA: "${e5Name}"
ADDITIONAL CONTEXT:\n${elementsContext}
=== OUTPUT FORMAT ===
[0:00-0:03] Your sentence here. (Only spoken script, 1 sentence per timestamp)`;
        }

        let messagesContent = [{ type: "text", text: textPrompt }];
        let finalImageUsed = false;
        if (imageUrl) {
            try {
                const response = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 10000 });
                const base64 = Buffer.from(response.data).toString('base64');
                const mimeType = response.headers['content-type'] || 'image/jpeg';
                messagesContent.push({ type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}`, detail: "low" } });
                finalImageUsed = true;
            } catch (err) { }
        }

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "system", content: systemRole }, { role: "user", content: messagesContent }],
            temperature: 0.4,
            max_tokens: 1000
        });

        let scriptResult = cleanAIScript(completion.choices[0].message.content);
        if (scriptResult.length < 200 && scriptResult.toLowerCase().includes("sorry") && finalImageUsed) {
            const fallbackCompletion = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [{ role: "system", content: systemRole }, { role: "user", content: textPrompt }],
                temperature: 0.4,
                max_tokens: 1000
            });
            scriptResult = cleanAIScript(fallbackCompletion.choices[0].message.content);
            finalImageUsed = false;
        }

        res.json({ script: scriptResult, hasImage: finalImageUsed });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/generate-ugc-prompt', async (req, res) => {
    try {
        const { script, recipientDesc } = req.body;
        if (!script || !recipientDesc) return res.status(400).json({ error: "Missing required fields" });

        const systemRole = "You are a UGC content creation expert.";
        const textPrompt = `Hãy đóng vai một chuyên gia sáng tạo nội dung UGC. Nhiệm vụ của bạn là chuyển đổi Nội dung thô bên dưới thành một kịch bản quay video hoàn chỉnh theo quy chuẩn sau:
Mô tả đối tượng: 1 câu mô tả nhân vật (tuổi, sắc tộc, thái độ) dựa trên thông tin: "${recipientDesc}". 
Bối cảnh (không gian, ánh sáng, trang phục): ĐIỀU CHỈNH THEO NGỮ CẢNH. Nếu kịch bản nhắc đến đánh Golf, cắm trại, câu cá... hoặc dịp lễ, bối cảnh PHẢI tương ứng.
Định dạng Scene: Chia thành 5 Scene. Action: hành động tự nhiên, UGC style. Dialogue: Lời thoại tiếng Anh.
NỘI DUNG THÔ:\n${script}`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "system", content: systemRole }, { role: "user", content: textPrompt }],
            temperature: 0.5,
            max_tokens: 1200
        });

        res.json({ prompt: completion.choices[0].message.content.trim() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =====================================================================
// KẾT NỐI BYTEPLUS API (SEEDANCE) ĐỂ TẠO VIDEO (CÓ 9:16 & 720p)
// =====================================================================

app.post('/api/generate-video', async (req, res) => {
    try {
        const { prompt, imageUrl } = req.body;
        if (!prompt) return res.status(400).json({ error: "Missing prompt data" });

        const content = [{ type: "text", text: prompt }];
        if (imageUrl) {
            content.push({ type: "image_url", image_url: { url: imageUrl }, role: "reference_image" });
        }

        // Bỏ duration để kích hoạt Smart length, ép cứng 9:16 và 720p
        const payload = {
            model: "dreamina-seedance-2-0-260128",
            content: content,
            generate_audio: true,
            ratio: "9:16", 
            resolution: "720p",
            watermark: false
        };

        const response = await axios.post('https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks', payload, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.BYTEPLUS_API_KEY}`
            }
        });

        if (response.data && response.data.id) {
            res.json({ taskId: response.data.id });
        } else {
            throw new Error("Failed to create BytePlus task.");
        }
    } catch (error) {
        res.status(500).json({ error: error.response?.data?.error?.message || error.message });
    }
});

app.get('/api/check-video/:taskId', async (req, res) => {
    try {
        const { taskId } = req.params;
        const response = await axios.get(`https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks/${taskId}`, {
            headers: { 'Authorization': `Bearer ${process.env.BYTEPLUS_API_KEY}` }
        });

        const task = response.data;
        if (!task) throw new Error("No data returned from BytePlus");

        const status = task.status ? task.status.toLowerCase() : 'unknown';

        if (status === "succeeded") {
            let videoUrl = "";
            if (task.content && typeof task.content.video_url === 'string') {
                videoUrl = task.content.video_url;
            } else if (task.video_url) {
                videoUrl = task.video_url;
            } else if (Array.isArray(task.content)) {
                const vidObj = task.content.find(c => c.type === 'video_url' || c.video_url);
                if (vidObj) videoUrl = vidObj.video_url?.url || vidObj.url || "";
            }
            
            // Trích xuất usage token
            let usageTokens = 0;
            if (task.usage && task.usage.total_tokens) {
                usageTokens = task.usage.total_tokens;
            }
            res.json({ status: "succeeded", videoUrl: videoUrl, usage: usageTokens });
            
        } else if (status === "failed") {
            res.json({ status: "failed", error: task.error?.message || "Unknown BytePlus Error" });
        } else {
            res.json({ status: status }); 
        }

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/', (req, res) => {
    res.status(200).send('Server is running');
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Master AI Server running on port ${PORT}`);
});
