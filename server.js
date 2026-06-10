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
    let cleaned = text.replace(/```[a-zA-Z]*\n?/g, '').replace(/```/g, ''); 
    cleaned = cleaned.replace(/^\s*plaintext\s*/i, '');
    
    return cleaned
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
app.use(express.json({ limit: '100mb' })); 

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function getLarkToken() {
    const res = await axios.post('https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal', {
        app_id: process.env.APP_ID, app_secret: process.env.APP_SECRET
    });
    return res.data.tenant_access_token;
}

// =====================================================================
// HỆ THỐNG LƯU TRỮ LOCAL TRÊN KOYEB CLOUD (JSON FILES)
// =====================================================================
const STORE_FILE = path.join(__dirname, 'scripts_store.json');
const GALLERY_FILE = path.join(__dirname, 'gallery_store.json');

function readJsonFile(filePath) {
    if (!fs.existsSync(filePath)) return [];
    try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
    catch(e) { return []; }
}

function writeJsonFile(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// --- 1. SCRIPT STORE API ---
app.get('/api/store', (req, res) => {
    try {
        let store = readJsonFile(STORE_FILE);
        store.sort((a, b) => new Date(b.date) - new Date(a.date));
        res.json(store);
    } catch(e) { res.status(500).json({ error: "Lỗi GET Store: " + e.message }); }
});

app.post('/api/store', (req, res) => {
    try {
        const store = readJsonFile(STORE_FILE);
        const newItem = { 
            id: Date.now().toString() + Math.floor(Math.random() * 1000), 
            code: req.body.code || req.body.fullCode || "",
            productBase: req.body.productBase || req.body.product || "Personalized Custom Gift",
            targetCode: req.body.targetCode || "",
            content: req.body.content || "",
            isFavorite: false,
            date: new Date().toISOString() 
        };
        store.unshift(newItem);
        writeJsonFile(STORE_FILE, store);
        res.json({ success: true, item: newItem });
    } catch(e) { res.status(500).json({ error: "Lỗi POST Store: " + e.message }); }
});

app.patch('/api/store/:id/favorite', (req, res) => {
    try {
        let store = readJsonFile(STORE_FILE);
        const index = store.findIndex(s => s.id === req.params.id);
        let currentFav = false;
        if (index !== -1) {
            store[index].isFavorite = !store[index].isFavorite;
            currentFav = store[index].isFavorite;
            writeJsonFile(STORE_FILE, store);
        }
        res.json({ success: true, isFavorite: currentFav });
    } catch(e) { res.status(500).json({ error: "Lỗi PATCH Store: " + e.message }); }
});

app.delete('/api/store/:id', (req, res) => {
    try {
        let store = readJsonFile(STORE_FILE);
        store = store.filter(s => s.id !== req.params.id);
        writeJsonFile(STORE_FILE, store);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: "Lỗi DELETE Store: " + e.message }); }
});

app.delete('/api/store', (req, res) => {
    try {
        writeJsonFile(STORE_FILE, []);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: "Lỗi DELETE ALL Store: " + e.message }); }
});

// --- 2. SCENE GALLERY API ---
app.get('/api/gallery', (req, res) => {
    try {
        let gallery = readJsonFile(GALLERY_FILE);
        gallery.sort((a, b) => new Date(b.date) - new Date(a.date));
        res.json(gallery);
    } catch(e) { res.status(500).json({ error: "Lỗi GET Gallery: " + e.message }); }
});

app.post('/api/gallery', (req, res) => {
    try {
        const gallery = readJsonFile(GALLERY_FILE);
        const newItem = {
            id: Date.now().toString() + Math.floor(Math.random() * 1000),
            code: req.body.code || req.body.fullCode || "",
            productBase: req.body.productBase || "",
            targetCode: req.body.targetCode || "",
            videoUrl: req.body.videoUrl || "",
            imageUrl: req.body.imageUrl || "",
            prompt: req.body.prompt || req.body.script || "",
            date: new Date().toISOString()
        };
        gallery.unshift(newItem);
        writeJsonFile(GALLERY_FILE, gallery);
        res.json({ success: true, item: newItem });
    } catch(e) { res.status(500).json({ error: "Lỗi POST Gallery: " + e.message }); }
});

app.delete('/api/gallery/:id', (req, res) => {
    try {
        const { id } = req.params;
        let gallery = readJsonFile(GALLERY_FILE);
        gallery = gallery.filter(s => s.id !== id);
        writeJsonFile(GALLERY_FILE, gallery);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: "Lỗi DELETE Gallery: " + e.message }); }
});

app.delete('/api/gallery', (req, res) => {
    try {
        writeJsonFile(GALLERY_FILE, []);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: "Lỗi DELETE ALL Gallery: " + e.message }); }
});

// =====================================================================
// PHÂN TÍCH SẢN PHẨM LẤY DATA TỪ LARK BASE & WEB
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
            } catch (err) { console.error("Lỗi khi cào dữ liệu HTML:", err.message); }
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

        if (!targetCode) throw new Error(`Không tìm thấy Design Code cho dữ liệu: ${asin}`);

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
        let referenceText = "";
        
        try {
            if (process.env.APP_ID && process.env.TABLE_ID) {
                const tokenRes = await axios.post('https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal', { app_id: process.env.APP_ID, app_secret: process.env.APP_SECRET });
                const larkToken = tokenRes.data.tenant_access_token;
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
                referenceText = scoredNotes.slice(0, 5).map(n => n.note).join('\n---\n').substring(0, 3000);
            }
        } catch(e){}

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
        // CẤU TRÚC GỐC ĐÃ HOẠT ĐỘNG TỐT: LUỒNG 1 SELF-GIFT 
        // ==========================================
        if (isSelfGift) {
            systemRole = "You are an expert UGC video scriptwriter. STRICT RULE: This is a SELF-PURCHASE scenario. The speaker bought the item for THEMSELVES. You will be severely penalized if you mention gifting to someone else.";
            
            textPrompt = `
You are an expert short-form video scriptwriter (TikTok/Reels/Shorts).

TARGET DURATION: 11 to 15 seconds.
PRODUCT NAME: "${productBase || 'N/A'}"

=== WARNING: CRITICAL CONTEXT ===
The product details below might contain keywords like "gifts for dad", "perfect for grandpa", "for mom", etc. YOU MUST ABSOLUTELY IGNORE THOSE KEYWORDS. 
The scenario is STRICTLY SELF-PURCHASE. The speaker in the video bought this item purely as a treat or reward for THEMSELVES. 

${scrapedData ? `PRODUCT DETAILS:\n${scrapedData}\n` : ''}
${referenceText ? `ADDITIONAL NOTES / REFERENCES:\n${referenceText}\n` : ''}

=== CRITICAL INSTRUCTIONS: POINT OF VIEW (POV) & TONE ===
1. POINT OF VIEW (POV): SELF-PURCHASER (First-person). Use "I", "my", "me". Talk about why YOU bought it for YOURSELF, how it benefits YOU, or why YOU deserved a treat. CRITICAL FATAL ERROR IF YOU MENTION BUYING IT FOR DAD, MOM, GRANDPA, WIFE, OR ANYONE ELSE.
2. TONE OF VOICE: ${toneInstruction} -> Keep this 100% consistent.
3. LANGUAGE: STRICTLY ENGLISH. Do not output Vietnamese.

=== SCRIPT STRUCTURE & EXACT ELEMENT EXECUTIONS ===
You must structure the script based on the following requested elements. Execute them EXACTLY as described, but ADAPT THEM TO THE SELF-PURCHASE CONTEXT:

1. HOOK (0:00-0:03): "${e1Name || 'Start with an attention-grabber.'}"
   ${e1Exp ? `-> Concept & Definition: ${e1Exp}` : ''}
   -> Rule: Execute this specific type of hook perfectly in the first sentence. Frame it around a personal realization, self-care, or treating oneself. NO GIFTING OTHERS.

2. BODY/STORYLINE: "${e2Name || 'Highlight the product.'}"
   ${e2Exp ? `-> Concept & Definition: ${e2Exp}` : ''}
   -> Rule: Showcase the product following this exact storyline angle. Focus purely on why YOU bought it for YOURSELF and your personal reaction/use.

3. CALL TO ACTION (CTA): "${e5Name || 'Provide a natural conclusion.'}"
   ${e5Exp ? `-> Concept & Definition: ${e5Exp}` : ''}
   -> Rule: End the script following this exact CTA intent. Encourage the viewer to treat themselves, upgrade their own life, or buy it for their own joy.

ADDITIONAL CONTEXT FOR ELEMENTS:
${elementsContext}

=== IMAGE GUIDELINES (if an image is provided) ===
- Describe only general visual attributes: colors, materials, textures, shapes, layout.
- Treat any people shown as generic, non-identifiable figures. Focus entirely on the product.

=== OUTPUT FORMAT ===
- Divide the script into short scenes with timestamps.
- Each timestamp block must contain EXACTLY ONE spoken sentence (maximum 15 words).
- Use this format: [0:00-0:03] Your sentence here.
- Output ONLY the spoken script. No intro, no outro, no extra commentary, no visual/camera directions. Write in English.
`;
        } 
        // ==========================================
        // CẤU TRÚC GỐC ĐÃ HOẠT ĐỘNG TỐT: LUỒNG 2 QUÀ TẶNG BÌNH THƯỜNG
        // ==========================================
        else {
            systemRole = "You are an expert UGC and marketing scriptwriter who adapts perfectly to any given persona (Buyer, Receiver, or Seller).";
            
            let match = insightName.match(/to\s+(.*?)\s+from\s+(.*)/i);
            if (match) { receiver = match[1].trim(); buyer = match[2].trim(); }
            else { let fMatch = insightName.match(/for\s+(.*)/i); if (fMatch) { receiver = fMatch[1].trim(); buyer = `Anyone buying for ${receiver}`; } }

            let e2Check = String(e2Group + " " + e2Name).toLowerCase();
            let povInstruction = "STORE OWNER / BRAND POV: Speak directly to the viewer as a proud seller/creator of the product. Use 'we', 'our', or 'I' (as the maker). DO NOT sound like a buyer.";
            
            if (e2Check.includes("buyer")) {
                povInstruction = `BUYER POV (First-person): You are a regular customer who bought this item as a gift for ${receiver}. Use 'I', 'my'. Talk about your personal experience, why you bought it, and your excitement. NEVER sound like a seller or brand.`;
            } else if (e2Check.includes("receiver")) {
                povInstruction = `RECEIVER POV (First-person): You are the person who received this gift from ${buyer}. Use 'I', 'my'. Share your emotional reaction, appreciation, and how much you love it. NEVER sound like a seller or brand.`;
            }

            textPrompt = `
You are an expert short-form video scriptwriter (TikTok/Reels/Shorts) specializing in e-commerce gift products.

TARGET DURATION: 11 to 15 seconds.
PRODUCT NAME: "${productBase || 'N/A'}"
GIFTING CONTEXT: The buyer is ${buyer}. The recipient is ${receiver}.

${scrapedData ? `PRODUCT DETAILS:\n${scrapedData}\n` : ''}
${referenceText ? `ADDITIONAL NOTES / REFERENCES:\n${referenceText}\n` : ''}

=== CRITICAL INSTRUCTIONS: POINT OF VIEW (POV) & TONE ===
1. POINT OF VIEW (POV): ${povInstruction}
2. TONE OF VOICE: ${toneInstruction} -> IMPORTANT: The tone must be 100% consistent from the very first word of the hook to the final call-to-action.
3. LANGUAGE: STRICTLY ENGLISH. Do not output Vietnamese.

=== SCRIPT STRUCTURE & EXACT ELEMENT EXECUTIONS ===
You must structure the script based on the following requested elements. Execute them EXACTLY as described:

1. HOOK (0:00-0:03): "${e1Name || 'Start with an attention-grabber.'}"
   ${e1Exp ? `-> Concept & Definition: ${e1Exp}` : ''}
   -> Rule: Execute this specific type of hook perfectly in the first sentence.

2. BODY/STORYLINE: "${e2Name || 'Highlight the product.'}"
   ${e2Exp ? `-> Concept & Definition: ${e2Exp}` : ''}
   -> Rule: Showcase the product following this exact storyline angle and POV.

3. CALL TO ACTION (CTA): "${e5Name || 'Provide a natural conclusion.'}"
   ${e5Exp ? `-> Concept & Definition: ${e5Exp}` : ''}
   -> Rule: End the script following this exact CTA intent. Ensure the CTA fits your assigned POV.

ADDITIONAL CONTEXT FOR ELEMENTS:
${elementsContext}

=== IMAGE GUIDELINES (if an image is provided) ===
- Describe only general visual attributes: colors, materials, textures, shapes, layout.
- Treat any people shown as generic, non-identifiable figures. Focus entirely on the product.

=== OUTPUT FORMAT ===
- Divide the script into short scenes with timestamps.
- Each timestamp block must contain EXACTLY ONE spoken sentence (maximum 15 words).
- Use this format: [0:00-0:03] Your sentence here.
- Output ONLY the spoken script. No intro, no outro, no extra commentary, no visual/camera directions. Write in English.
`;
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

// ÉP 100% TIẾNG ANH VÀO PROMPT QUAY VIDEO VÀ XÓA MARKDOWN
app.post('/api/generate-ugc-prompt', async (req, res) => {
    try {
        const { script, recipientDesc } = req.body;
        if (!script || !recipientDesc) return res.status(400).json({ error: "Missing required fields" });

        const systemRole = "You are an expert UGC video director. CRITICAL INSTRUCTION: YOUR ENTIRE OUTPUT MUST BE STRICTLY WRITTEN IN ENGLISH. ABSOLUTELY NO VIETNAMESE WORDS ARE ALLOWED. DO NOT USE MARKDOWN BLOCK FORMATTING.";
        const textPrompt = `Convert the raw content below into a complete video shooting prompt strictly in ENGLISH following these rules:

1. Character & Setting: Write 1 English sentence describing the character (age, ethnicity, attitude) based on: "${recipientDesc}". 
2. Context (Space, lighting, outfit): ADJUST STRICTLY TO CONTEXT. If the product implies Golf, Camping, Holidays, etc., the setting MUST match. Otherwise, use an average American daily life setting.
3. Structure: 5 Scenes. Each scene must contain Action (natural UGC style) and Dialogue (spoken English naturally derived from the raw script).

RAW CONTENT:
${script}`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "system", content: systemRole }, { role: "user", content: textPrompt }],
            temperature: 0.5,
            max_tokens: 1200
        });

        let result = completion.choices[0].message.content.trim();
        // Dọn sạch rác markdown nếu AI cố chấp chèn vào
        result = result.replace(/```[a-zA-Z]*\n?/g, '').replace(/```/g, '').trim();

        res.json({ prompt: result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =====================================================================
// KẾT NỐI BYTEPLUS API (SEEDANCE) 9:16 / 720p / 11-15s / Đa ảnh @image
// =====================================================================

app.post('/api/generate-video', async (req, res) => {
    try {
        const { prompt, imageUrl, customImages } = req.body;
        if (!prompt) return res.status(400).json({ error: "Missing prompt data" });

        // Ép AI xuất video trong khoảng 11-15s thông qua lệnh prompt bổ sung
        const finalPrompt = prompt + "\n\n(IMPORTANT INSTRUCTION FOR AI: Ensure the generated video duration is exactly between 11 to 15 seconds.)";

        const content = [{ type: "text", text: finalPrompt }];
        
        // Ưu tiên Custom Images nếu có up. Seedance tự động hiểu thứ tự mảng này là @image1, @image2...
        if (customImages && customImages.length > 10) {
            customImages.forEach((imgBase64) => {
                content.push({ type: "image_url", image_url: { url: imgBase64 }, role: "reference_image" });
            });
        } 
        // Nếu không có, dùng ảnh từ Web gốc
        else if (imageUrl) {
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
