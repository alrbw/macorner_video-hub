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

// ==========================================
// TÍNH NĂNG MỚI: CLOUD SCRIPT STORE CHUNG
// ==========================================
const STORE_FILE = path.join(__dirname, 'scripts_store.json');

function readStore() {
    if (!fs.existsSync(STORE_FILE)) return [];
    try { 
        return JSON.parse(fs.readFileSync(STORE_FILE, 'utf8')); 
    } catch(e) { 
        return []; 
    }
}

function writeStore(data) {
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), 'utf8');
}

app.get('/api/store', (req, res) => {
    res.json(readStore());
});

app.post('/api/store', (req, res) => {
    try {
        const store = readStore();
        const newScript = { 
            id: Date.now().toString(), 
            code: req.body.code || req.body.fullCode, // Hỗ trợ cả 2 tên biến
            productBase: req.body.productBase || req.body.product,
            targetCode: req.body.targetCode,
            content: req.body.content,
            date: new Date().toISOString() 
        };
        store.unshift(newScript); // Đẩy lên đầu danh sách
        writeStore(store);
        res.json({ success: true, item: newScript });
    } catch(e) {
        res.status(500).json({ error: "Lỗi ghi file Store: " + e.message });
    }
});

app.delete('/api/store', (req, res) => {
    try {
        writeStore([]);
        res.json({ success: true });
    } catch(e) {
        res.status(500).json({ error: "Lỗi xóa file Store: " + e.message });
    }
});

app.delete('/api/store/:id', (req, res) => {
    try {
        let store = readStore();
        store = store.filter(s => s.id !== req.params.id);
        writeStore(store);
        res.json({ success: true });
    } catch(e) {
        res.status(500).json({ error: "Lỗi xóa file Store: " + e.message });
    }
});
// ==========================================

async function getLarkToken() {
    const res = await axios.post('https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal', {
        app_id: process.env.APP_ID, app_secret: process.env.APP_SECRET
    });
    return res.data.tenant_access_token;
}

async function fetchImageAsBase64(url) {
    try {
        if (!url) return null;
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
            },
            timeout: 10000
        });

        const mimeType = response.headers['content-type'] || '';
        if (!mimeType.startsWith('image/')) return null;

        const base64 = Buffer.from(response.data).toString('base64');
        return `data:${mimeType};base64,${base64}`;
    } catch (err) {
        return null;
    }
}

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
                        $('meta[property="og:description"]').attr('content') ||
                        $('.product-description').text() ||
                        $('#description').text() ||
                        $('.description').text() ||
                        '';
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
        } catch (err) {
            console.error("Lark API Error:", err.message);
        }

        if (!targetCode) {
            const tcMatch = asin.match(/([A-Z]{3}\d{4,10}[A-Z0-9]*)/);
            if (tcMatch) targetCode = tcMatch[1].toUpperCase();
            if (!targetCode) targetCode = asin.toUpperCase();
        }

        if (!targetCode) {
            throw new Error(`Không tìm thấy Design Code (chứa PR-) cho dữ liệu: ${asin} trong Lark Base.`);
        }

        const niche = targetCode.substring(0, 3).toUpperCase();
        let cleanDescription = description.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim().substring(0, 1500);
        let scrapedData = "";
        if (title || cleanDescription) {
             scrapedData = `[PRODUCT TITLE]: ${title}\n[DESCRIPTION]: ${cleanDescription}`;
        }

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

        let insightName = String(e4Name);
        let buyer = "The Viewer", receiver = "The Gift Recipient";
        let match = insightName.match(/to\s+(.*?)\s+from\s+(.*)/i);
        if (match) { receiver = match[1].trim(); buyer = match[2].trim(); }
        else { let fMatch = insightName.match(/for\s+(.*)/i); if (fMatch) { receiver = fMatch[1].trim(); buyer = `Anyone buying for ${receiver}`; } }

        let povInstruction = "STORE OWNER / BRAND POV: Speak directly to the viewer as a proud seller/creator of the product. Use 'we', 'our', or 'I' (as the maker). DO NOT sound like a buyer.";
        let e2Check = String(e2Group + " " + e2Name).toLowerCase();
        
        if (e2Check.includes("buyer")) {
            povInstruction = `BUYER POV (First-person): You are a regular customer who bought this item as a gift for ${receiver}. Use 'I', 'my'. Talk about your personal experience, why you bought it, and your excitement. NEVER sound like a seller or brand.`;
        } else if (e2Check.includes("receiver")) {
            povInstruction = `RECEIVER POV (First-person): You are the person who received this gift from ${buyer}. Use 'I', 'my'. Share your emotional reaction, appreciation, and how much you love it. NEVER sound like a seller or brand.`;
        }

        let toneInstruction = "Engaging, authentic, and native to short-form videos.";
        let e1Lower = String(e1Name).toLowerCase();
        
        if (e1Lower.includes("funny") || e1Lower.includes("meme")) {
            toneInstruction = "Humorous, trendy, and lighthearted. Keep this fun vibe consistent throughout the entire video.";
        } else if (e1Lower.includes("ragebait") || e1Lower.includes("shock")) {
            toneInstruction = "Controversial, slightly irritating or shocking to drive comments and engagement. Keep the tension high.";
        } else if (e1Lower.includes("emotional")) {
            toneInstruction = "Warm, sentimental, and deeply touching. Focus heavily on the emotional bond.";
        } else if (e1Lower.includes("fact") || e1Lower.includes("proof") || e1Lower.includes("social proof")) {
            toneInstruction = "Objective, informative, like a genuine user review or stating an interesting fact.";
        } else if (e1Lower.includes("curiosity")) {
            toneInstruction = "Mysterious and intriguing. Build suspense from the hook all the way to the end.";
        }

        const elementsContext = `E1: ${e1Name} - ${e1Exp}\nE2: ${e2Name} - ${e2Exp}\nE3: ${e3Name} - ${e3Exp}\nE4: ${e4Name} - ${e4Exp}\nE5: ${e5Name} - ${e5Exp}`;

        const textPrompt = `
You are an expert short-form video scriptwriter (TikTok/Reels/Shorts) specializing in e-commerce gift products.

TARGET DURATION: 20 to 25 seconds.
PRODUCT NAME: "${productBase || 'N/A'}"
GIFTING CONTEXT: The buyer is ${buyer || 'a shopper'}. The recipient is ${receiver || 'a loved one'}.

${scrapedData ? `PRODUCT DETAILS:\n${scrapedData}\n` : ''}
${referenceText ? `ADDITIONAL NOTES / REFERENCES:\n${referenceText}\n` : ''}

=== CRITICAL INSTRUCTIONS: POINT OF VIEW (POV) & TONE ===
To make this content authentic, you MUST strictly follow the assigned Point of View (POV) and Tone below. DO NOT default to a standard "marketer/sales" voice unless explicitly instructed to be the Store Owner.

1. POINT OF VIEW (POV): ${povInstruction}
2. TONE OF VOICE: ${toneInstruction} -> IMPORTANT: The tone must be 100% consistent from the very first word of the hook to the final call-to-action.

=== SCRIPT STRUCTURE & EXACT ELEMENT EXECUTIONS ===
You must structure the script based on the following requested elements. Execute them EXACTLY as described:

1. HOOK (0:00-0:03): "${e1Name || 'Start with an attention-grabber.'}"
   ${e1Exp ? `-> Concept & Definition: ${e1Exp}` : ''}
   -> Rule: Execute this specific type of hook perfectly in the first sentence to grab attention in your assigned tone.

2. BODY/STORYLINE: "${e2Name || 'Highlight the product.'}"
   ${e2Exp ? `-> Concept & Definition: ${e2Exp}` : ''}
   -> Rule: Showcase the product following this exact storyline angle and your strictly assigned POV. Ensure it connects logically with the Hook.

3. CALL TO ACTION (CTA): "${e5Name || 'Provide a natural conclusion.'}"
   ${e5Exp ? `-> Concept & Definition: ${e5Exp}` : ''}
   -> Rule: End the script following this exact CTA intent. If it implies "No CTA" or "No specific action", end naturally without asking for anything. Ensure the CTA fits your assigned POV (e.g., a buyer doesn't say "link in bio", they say "you have to get this for them").

ADDITIONAL CONTEXT FOR ELEMENTS:
${elementsContext}

=== IMAGE GUIDELINES (if an image is provided) ===
- Describe only general visual attributes: colors, materials, textures, shapes, layout.
- Treat any people shown as generic, non-identifiable figures. Focus entirely on the product.
- Do not reference personal identity, appearance, or sensitive attributes.

=== OUTPUT FORMAT ===
- Divide the script into short scenes with timestamps.
- Each timestamp block must contain EXACTLY ONE spoken sentence (maximum 15 words).
- Use this format: [0:00-0:03] Your sentence here.
- Output ONLY the spoken script. No intro, no outro, no extra commentary, no visual/camera directions. Write in English.
`;

        let messagesContent = [{ type: "text", text: textPrompt }];
        let finalImageUsed = false;

        if (imageUrl) {
            try {
                const response = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 10000 });
                const base64 = Buffer.from(response.data).toString('base64');
                const mimeType = response.headers['content-type'] || 'image/jpeg';
                messagesContent.push({
                    type: "image_url",
                    image_url: { url: `data:${mimeType};base64,${base64}`, detail: "low" }
                });
                finalImageUsed = true;
            } catch (err) { }
        }

        const systemRole = "You are an expert UGC and marketing scriptwriter who adapts perfectly to any given persona (Buyer, Receiver, or Seller).";

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: systemRole },
                { role: "user", content: messagesContent }
            ],
            temperature: 0.4,
            max_tokens: 1000
        });

        let scriptResult = completion.choices[0].message.content;
        scriptResult = cleanAIScript(scriptResult);
        const isRefused = scriptResult.length < 200 && (scriptResult.toLowerCase().includes("sorry") || scriptResult.toLowerCase().includes("cannot") || scriptResult.toLowerCase().includes("can't assist"));

        if (isRefused && finalImageUsed) {
            console.log("⚠️ OpenAI từ chối ảnh do Safety Filter. Đang tự động Fallback dùng chế độ Text-Only...");
            const fallbackCompletion = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: systemRole },
                    { role: "user", content: textPrompt }
                ],
                temperature: 0.4,
                max_tokens: 1000
            });
            scriptResult = cleanAIScript(fallbackCompletion.choices[0].message.content);
            finalImageUsed = false;
        }

        res.json({ script: scriptResult, hasImage: finalImageUsed });
    } catch (error) {
        console.error("API Generate Script Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================================================
// API TẠO PROMPT QUAY VIDEO (ĐÃ SỬA LỖI UNEXPECTED TOKEN)
// =====================================================================
app.post('/api/generate-ugc-prompt', async (req, res) => {
    try {
        const { script, recipientDesc } = req.body;
        
        if (!script || !recipientDesc) {
            return res.status(400).json({ error: "Missing required fields for UGC Prompt." });
        }

        const systemRole = "You are a UGC content creation expert.";
        
        const textPrompt = `Hãy đóng vai một chuyên gia sáng tạo nội dung UGC. Nhiệm vụ của bạn là chuyển đổi Nội dung thô bên dưới thành một kịch bản quay video hoàn chỉnh theo quy chuẩn sau:

Mô tả đối tượng (Character & Setting): Trước khi vào các Scene, hãy viết 1 câu mô tả rõ: nhân vật (tuổi, sắc tộc, trang phục, thái độ) dựa trên thông tin: "${recipientDesc}" và bối cảnh (không gian, ánh sáng, đảm bảo là bối cảnh đời thường của một người Mỹ trung bình). Nếu có xuất hiện nhân vật khác thì sẽ đối chiếu với đối tượng người nhận để tạo thêm nhân vật trong prompt với độ tuổi phù hợp.
Định dạng Scene: Chia thành 5 Scene (từ Scene 1 đến Scene 5). Không kẻ bảng, không chia timeframe.
Cấu trúc mỗi Scene:
Action: Mô tả hành động tự nhiên, mang tính đời thường (UGC style), tập trung vào tương tác với sản phẩm và design.
Dialogue: Lời thoại bằng tiếng Anh, tự nhiên, gần gũi (tự phát triển từ nội dung thô hoặc lấy thoại từ nội dung thô cho sẵn).
Luồng nội dung: Scene 1 (Hook) -> Scene 2 (Features/Feel) -> Scene 3 (Unique Selling Point/Customization) -> Scene 4 (Emotional Value) -> Scene 5 (Closing).

NỘI DUNG THÔ:
${script}`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: systemRole },
                { role: "user", content: textPrompt }
            ],
            temperature: 0.5,
            max_tokens: 1200
        });

        res.json({ prompt: completion.choices[0].message.content.trim() });
    } catch (error) {
        console.error("API UGC Prompt Error:", error);
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
