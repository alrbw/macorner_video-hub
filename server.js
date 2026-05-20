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
        let isSelfGift = insightName.toLowerCase().includes("self-gift") || insightName.toLowerCase().includes("self gift");

        if (isSelfGift) {
            buyer = "The Viewer (buying for themselves)";
            receiver = "Themselves (Self-Gift)";
        } else {
            let match = insightName.match(/to\s+(.*?)\s+from\s+(.*)/i);
            if (match) { receiver = match[1].trim(); buyer = match[2].trim(); }
            else { let fMatch = insightName.match(/for\s+(.*)/i); if (fMatch) { receiver = fMatch[1].trim(); buyer = `Anyone buying for ${receiver}`; } }
        }

        let povInstruction = "STORE OWNER / BRAND POV: Speak directly to the viewer as a proud seller/creator of the product. Use 'we', 'our', or 'I' (as the maker). DO NOT sound like a buyer.";
        let e2Check = String(e2Group + " " + e2Name).toLowerCase();
        
        if (e2Check.includes("buyer")) {
            if (isSelfGift) {
                povInstruction = `BUYER POV (First-person): You are a regular customer who bought this item for YOURSELF. Use 'I', 'my'. Talk about your personal experience, why you treated yourself, and your excitement. NEVER sound like a seller or brand.`;
            } else {
                povInstruction = `BUYER POV (First-person): You are a regular customer who bought this item as a gift for ${receiver}. Use 'I', 'my'. Talk about your personal experience, why you bought it, and your excitement. NEVER sound like a seller or brand.`;
            }
        } else if (e2Check.includes("receiver")) {
            if (isSelfGift) {
                povInstruction = `RECEIVER POV (First-person): You bought this item for yourself. Use 'I', 'my'. Share your emotional reaction, appreciation, and how much you love it. NEVER sound like a seller or brand.`;
            } else {
                povInstruction = `RECEIVER POV (First-person): You are the person who received this gift from ${buyer}. Use 'I', 'my'. Share your emotional reaction, appreciation, and how much you love it. NEVER sound like a seller or brand.`;
            }
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
GIFTING CONTEXT: The buyer is ${buyer || 'a shopper'}. The recipient is ${receiver || 'a loved one'}. ${isSelfGift ? "IMPORTANT: This is a SELF-GIFT. The person buying the product is buying it for themselves as a treat. The script must reflect treating oneself, being proud of the purchase for oneself. Do NOT mention giving it to someone else." : ""}

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
// API TẠO PROMPT QUAY VIDEO 
// =====================================================================
app.post('/api/generate-ugc-prompt', async (req, res) => {
    try {
        const { script, recipientDesc } = req.body;
        
        if (!script || !recipientDesc) {
            return res.status(400).json({ error: "Missing required fields for UGC Prompt." });
        }

        const systemRole = "You are a UGC content creation expert.";
        
        const textPrompt = `Hãy đóng vai một chuyên gia sáng tạo nội dung UGC. Nhiệm vụ của bạn là chuyển đổi Nội dung thô bên dưới thành một kịch bản quay video hoàn chỉnh theo quy chuẩn sau:

Mô tả đối tượng (Character & Setting): Trước khi vào các Scene, hãy viết 1 câu mô tả rõ: nhân vật (tuổi, sắc tộc, trang phục, thái độ) dựa trên thông tin: "${recipientDesc}". Bối cảnh (không gian, ánh sáng) và trang phục cần là bối cảnh đời thường của một người Mỹ trung bình, NHƯNG BẮT BUỘC PHẢI ĐIỀU CHỈNH LINH HOẠT THEO ĐẶC TRƯNG SẢN PHẨM HOẶC DỊP TẶNG QUÀ (Ví dụ: kịch bản nhắc đến đánh golf thì bối cảnh phải ở sân golf, mặc đồ thể thao; kịch bản dịp lễ 4/7 thì không gian phải có trang trí cờ Mỹ/tiệc ngoài trời; dịp Giáng sinh thì có cây thông; đi câu cá thì ở hồ/suối...). Tuyệt đối không cố định bối cảnh trong nhà và trang phục bình thường nếu nội dung hướng tới các hoạt động/dịp lễ đặc thù. Nếu có xuất hiện nhân vật khác thì sẽ đối chiếu với đối tượng người nhận để tạo thêm nhân vật trong prompt với độ tuổi phù hợp.
Định dạng Scene: Chia thành 5 Scene (từ Scene 1 đến Scene 5). Không kẻ bảng, không chia timeframe.
Cấu trúc mỗi Scene:
Action: Mô tả hành động tự nhiên, mang tính đời thường (UGC style), tập trung vào tương tác với sản phẩm và design. Hãy đảm bảo hành động và đạo cụ phù hợp với bối cảnh đặc thù đã mô tả.
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
const ELEMENTS_DATA = {
    E1: [
    {
        "Hook": "No vid",
        "Code": "00",
        "Explanation": "Mockup ảnh, không hook"
    },
    {
        "Hook": "No Hook",
        "Code": "01",
        "Explanation": "show trực diện sản phẩm, không text dẫn dắt"
    },
    {
        "Hook": "Emotional Hook",
        "Code": "02",
        "Explanation": "Gắn video reaction về sản phẩm (happy, cry, surprise,...)"
    },
    {
        "Hook": "Visual Hook",
        "Code": "03",
        "Explanation": "sử dụng hiệu ứng hình ảnh đặc biệt để thu hút sự chú ý"
    },
    {
        "Hook": "Relatable Hook",
        "Code": "04",
        "Explanation": "đưa ra vấn đề gần gũi với đời sống/niche"
    },
    {
        "Hook": "Curiosity Hook",
        "Code": "05",
        "Explanation": "Đưa ra 1 cái kết quả/giải pháp để gây tò mò"
    },
    {
        "Hook": "Fact Hook/Social Proof",
        "Code": "06",
        "Explanation": "Đưa ra 1 con số/scientific fact về 1 vấn đề liên quan đến niche HOẶC đưa ra feedback và review của khách hàng ngay từ giây đầu"
    },
    {
        "Hook": "Ragebait Hook",
        "Code": "07",
        "Explanation": "Hook gây khó chịu/gây sốc"
    },
    {
        "Hook": "Funny/Meme/Trending Hook",
        "Code": "08",
        "Explanation": "Sử dụng meme hài hước trending phù hợp vs content (thường là meme động vật/nhân vật công chúng)"
    },
    {
        "Hook": "Answer Comments/Questions",
        "Code": "09",
        "Explanation": "Trả lời câu hỏi từ khách hàng trong post gốc (thường triển khai cho các version sau)"
    },
    {
        "Hook": "Urgency/Limitation",
        "Code": "10",
        "Explanation": "Thể hiện sự gấp rút, có giới hạn, thường áp dụng cho offer sale/sát ngày lễ"
    },
    {
        "Hook": "Statement",
        "Code": "11",
        "Explanation": "Giới thiệu một câu ngắn gọn về sản phẩm"
    }
],
    E2: [
        {
            "Group": "1. Store Owner's POV",
            "Detail": "How to create/customize/order this",
            "Code": "10",
            "Explanation": "Content chính là show cách order/customize sản phẩm trên website"
        },
        {
            "Group": "1. Store Owner's POV",
            "Detail": "Product demonstration",
            "Code": "11",
            "Explanation": "Show design, cách sử dụng, công năng và lợi ích/ứng dụng (painpoint) của sản phẩm"
        },
        {
            "Group": "1. Store Owner's POV",
            "Detail": "How it was made + Behind Story",
            "Code": "12",
            "Explanation": "Ý nghĩa và cách sản xuất của sản phẩm từ góc nhìn brand"
        },
        {
            "Group": "1. Store Owner's POV",
            "Detail": "Collection/Collage",
            "Code": "14",
            "Explanation": "Dành cho collection của 1 niche hay của 1 dòng sản phẩm (nhiều camp khác nhau trong cùng 1 video)"
        },
        {
            "Group": "1. Store Owner's POV",
            "Detail": "Sales/Discount/Events",
            "Code": "15",
            "Explanation": "Hiện phần trăm hoặc giá discount; event hoặc occasion sale như BFCM, Xmas,..."
        },
        {
            "Group": "1. Store Owner's POV",
            "Detail": "Reaction & Review Compilation",
            "Code": "16",
            "Explanation": "Tổng hợp reaction, review của nhiều khách hàng kèm sản phẩm nhằm thể hiện độ đáng tin cậy"
        },
        {
            "Group": "1. Store Owner's POV",
            "Detail": "Comparison (Brand POV)",
            "Code": "17",
            "Explanation": "So sánh giữa 2 sản phẩm, ví dụ: trước và sau khi cải tiến; cùng loại sản phẩm giữa brand này với brand của mình"
        },
        {
            "Group": "1. Store Owner's POV",
            "Detail": "Viral/Trending videos Reference (Brand POV)",
            "Code": "18",
            "Explanation": "Các video học theo dạng video viral trên mạng, copy gần như y hệt, có điều chỉnh nhẹ cách diễn đạt/bối cảnh cho phù hợp với sản phẩm cty. Bao gồm cả sử dụng meme"
        },
        {
            "Group": "2. Buyer's POV",
            "Detail": "UGC Testimonial (Buyer POV)",
            "Code": "20",
            "Explanation": "khách hàng trải nghiệm sản phẩm"
        },
        {
            "Group": "2. Buyer's POV",
            "Detail": "Gift Preparing/Packaging",
            "Code": "21",
            "Explanation": "Kể về quá trình chuẩn bị quà (đã mua, chưa tặng). VD: What I got for my wife this Valentines,... Có cảnh đóng gói"
        },
        {
            "Group": "2. Buyer's POV",
            "Detail": "Inspiration",
            "Code": "22",
            "Explanation": "Khách hàng đã mua, đã sử dụng và muốn chia sẻ + gợi ý mua hàng về sản phẩm cho những người có nhu cầu tương tự. Ví dụ: if you looking for sth...; i made my mom cried..."
        },
        {
            "Group": "2. Buyer's POV",
            "Detail": "Comparison/Compilation (Buyer POV)",
            "Code": "23",
            "Explanation": "So sánh hoặc tổng hợp 2 hoặc nhiều sản phẩm đã trải nghiệm"
        },
        {
            "Group": "2. Buyer's POV",
            "Detail": "Word Of Mouth/Social Proof",
            "Code": "24",
            "Explanation": "Người mua đã nghe nói về sản phẩm này ở đâu đó hoặc được người quen giới thiệu nên muốn mua về trải nghiệm thử. VD: I heard about this; trying viral products, 100+ 5* reviews,..."
        },
        {
            "Group": "2. Buyer's POV",
            "Detail": "Telling Story/Reasons (Buyer POV)",
            "Code": "25",
            "Explanation": "Kể lý do mua hàng từ góc nhìn của người mua (past tense). VD: I want to feel close to my lost dog so I got this..."
        },
        {
            "Group": "2. Buyer's POV",
            "Detail": "Viral/Trending videos Reference (Buyer POV)",
            "Code": "26",
            "Explanation": "Content đu trend, có sử dụng sản phẩm, sử dụng/bắt chước meme"
        },
        {
            "Group": "3. Receiver's POV",
            "Detail": "UGC Testimonial (Receiver POV)",
            "Code": "30",
            "Explanation": "Người nhận được quà tặng trải nghiệm sản phẩm, bao gồm reaction, review, kể về cảm xúc/tính liên kết với sản phẩm"
        },
        {
            "Group": "3. Receiver's POV",
            "Detail": "Comparison/Compilation (Receiver POV)",
            "Code": "31",
            "Explanation": "So sánh/Tổng hợp những món quà đã được nhận cho một dịp nào đó, đã được sử dụng, hoặc từ một ai đó,... từ góc nhìn của người được nhận quà"
        },
        {
            "Group": "3. Receiver's POV",
            "Detail": "Comparison/Compilation (Receiver POV)",
            "Code": "32",
            "Explanation": "Content đu trend, có sử dụng sản phẩm được tặng, sử dụng/bắt chước meme, content funny"
        }
    ],
    E3: [
        { "Source/Video Type": "No vid", "Code": "00", "Explanation": "Dùng cho mockup ảnh" },
        { "Source/Video Type": "Original", "Code": "01", "Explanation": "Tự quay sản phẩm thật" },
        { "Source/Video Type": "Shot By Supplier", "Code": "02", "Explanation": "Sup quay" },
        { "Source/Video Type": "AI", "Code": "03", "Explanation": "AI" },
        { "Source/Video Type": "Original + AI", "Code": "04", "Explanation": "Sản phẩm thật + AI" },
        { "Source/Video Type": "Shot By Supplier + AI", "Code": "05", "Explanation": "Sup quay + AI" },
        { "Source/Video Type": "Original + Shot By Supplier + AI", "Code": "06", "Explanation": "Sản phẩm thật + Sup quay + AI" },
        { "Source/Video Type": "Slides show (images with variants)", "Code": "07", "Explanation": "Chỉ sử dụng ảnh/gif" },
        { "Source/Video Type": "Talent Hiring", "Code": "08", "Explanation": "Thuê diễn viên" },
        { "Source/Video Type": "Client Source", "Code": "09", "Explanation": "Source gốc từ khách" },
        { "Source/Video Type": "Ref. Footage", "Code": "10", "Explanation": "Source quay sản phẩm tương tự trên mạng của bên khác" },
        { "Source/Video Type": "Ads-repost", "Code": "99", "Explanation": "Up lại video đầu code M-, ko edit gì thêm" }
    ],
    E4: [
    {
        "Insights to niches": "Self-Gift",
        "Code": "00",
        "Explanation": "Tự mua cho bản thân dùng; mua cho bản thân và những người khác"
    },
    {
        "Insights to niches": "To Grandkids From Grandparents",
        "Code": "01",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Grandkids From Grandpa",
        "Code": "02",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Grandkids From Grandma",
        "Code": "03",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Grandson From Grandparents",
        "Code": "04",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Grandson From Grandpa",
        "Code": "05",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Grandson From Grandma",
        "Code": "06",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Granddaughter From Grandparents",
        "Code": "07",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Granddaughter From Grandpa",
        "Code": "08",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Granddaughter From Grandma",
        "Code": "09",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Children From Parents",
        "Code": "10",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Children From Mom",
        "Code": "11",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Children From Dad",
        "Code": "12",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Son From Parents",
        "Code": "13",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Son From Mom",
        "Code": "14",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Son From Dad",
        "Code": "15",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Daughter From Parents",
        "Code": "16",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Daughter From Mom",
        "Code": "17",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Daughter From Dad",
        "Code": "18",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Grandparents From Grandkids",
        "Code": "19",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Grandparents From Grandson",
        "Code": "20",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Grandparents From Granddaughter",
        "Code": "21",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Grandpa From Grandkids",
        "Code": "22",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Grandpa From Grandson",
        "Code": "23",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Grandpa From Granddaughter",
        "Code": "24",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Grandma From Grandkids",
        "Code": "25",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Grandma From Grandson",
        "Code": "26",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Grandma From Granddaughter",
        "Code": "27",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Parents (Including Step Parent, Parents-In-Law) From Children",
        "Code": "28",
        "Explanation": "including Step-parents, parents-in-law"
    },
    {
        "Insights to niches": "To Parents (Including Step Parent, Parents-In-Law) From Daughter",
        "Code": "29",
        "Explanation": "including Step-parents, parents-in-law"
    },
    {
        "Insights to niches": "To Parents (Including Step Parent, Parents-In-Law) From Son",
        "Code": "30",
        "Explanation": "including Step-parents, parents-in-law"
    },
    {
        "Insights to niches": "To Mom (Including Step Mom, Mother-In-Law) From Children",
        "Code": "31",
        "Explanation": "including Step mom, mother-in-law"
    },
    {
        "Insights to niches": "To Mom (Including Step Mom, Mother-In-Law) From Daughter",
        "Code": "32",
        "Explanation": "including Step mom, mother-in-law"
    },
    {
        "Insights to niches": "To Mom (Including Step Mom, Mother-In-Law) From Son",
        "Code": "33",
        "Explanation": "including Step mom, mother-in-law"
    },
    {
        "Insights to niches": "To Dad (Including Step Dad, Father-In-Law) From Children",
        "Code": "34",
        "Explanation": "including Step Dad, Father-in-law"
    },
    {
        "Insights to niches": "To Dad (Including Step Dad, Father-In-Law) From Daughter",
        "Code": "35",
        "Explanation": "including Step Dad, Father-in-law"
    },
    {
        "Insights to niches": "To Dad (Including Step Dad, Father-In-Law) From Son",
        "Code": "36",
        "Explanation": "including Step Dad, Father-in-law"
    },
    {
        "Insights to niches": "To Siblings From Siblings",
        "Code": "37",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Brother From Brother",
        "Code": "38",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Sister From Sister",
        "Code": "39",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Aunt & Uncle From Nieces & Nephews",
        "Code": "40",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Aunt & Uncle From Nieces",
        "Code": "41",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Aunt & Uncle From Nephews",
        "Code": "42",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Aunt From Nieces & Nephews",
        "Code": "43",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Aunt From Nieces",
        "Code": "44",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Aunt From Nephews",
        "Code": "45",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Uncle From Nieces & Nephews",
        "Code": "46",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Uncle From Nieces",
        "Code": "47",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Uncle From Nephews",
        "Code": "48",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Nieces & Nephews From Aunts & Uncles",
        "Code": "49",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Nieces & Nephews From Aunts",
        "Code": "50",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Nieces & Nephews From Uncles",
        "Code": "51",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Nieces  From Aunts & Uncles",
        "Code": "52",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Nieces  From Aunts",
        "Code": "53",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Nieces  From Uncles",
        "Code": "54",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Nephews From Aunts & Uncles",
        "Code": "55",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Nephews From Aunts",
        "Code": "56",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Nephews From Uncles",
        "Code": "57",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Husband/Bf From Wife/Gf",
        "Code": "58",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Wife/Gf From Husband/Bf",
        "Code": "59",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Partner From Partner (Lgbt Included)",
        "Code": "60",
        "Explanation": "including LGBT + Straight couples"
    },
    {
        "Insights to niches": "To Friends (Including Friends With Same Hobbies) From Friends (All Included)",
        "Code": "61",
        "Explanation": "including friends with same hobbies, all ages range"
    },
    {
        "Insights to niches": "To Friends (Including Friends With Same Hobbies) From Old Friends 55+",
        "Code": "62",
        "Explanation": "including friends with same hobbies, age 55+"
    },
    {
        "Insights to niches": "To Friends (Including Friends With Same Hobbies) From Middle-Age Friends 35+",
        "Code": "63",
        "Explanation": "including friends with same hobbies, age 35+"
    },
    {
        "Insights to niches": "To Friends (Including Friends With Same Hobbies) From Young Friends",
        "Code": "64",
        "Explanation": "including friends with same hobbies"
    },
    {
        "Insights to niches": "To Coworkers From Coworkers",
        "Code": "65",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Staff From Boss",
        "Code": "66",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Boss From Staff",
        "Code": "67",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Students Family From Teachers",
        "Code": "68",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Teachers From Students Family",
        "Code": "69",
        "Explanation": NaN
    },
    {
        "Insights to niches": "To Patients From Social Workers",
        "Code": "70",
        "Explanation": "Social workers including nurse, doctors, police, firefighter, health assistance,..."
    },
    {
        "Insights to niches": "To Social Workers From Patients",
        "Code": "71",
        "Explanation": "Social workers including nurse, doctors, police, firefighter, health assistance,..."
    },
    {
        "Insights to niches": "For Baby",
        "Code": "72",
        "Explanation": "Đối tượng tiếp nhận content chung chung - là người lớn, muốn mua quà cho trẻ em (target audience đa dạng)"
    },
    {
        "Insights to niches": "For Younger Generation",
        "Code": "73",
        "Explanation": "Mua cho con cháu trong nhà, content hướng tới nhóm người mua rộng (ông bà, cha mẹ, anh chị, cô dì chú bác,...)"
    },
    {
        "Insights to niches": "For Younger Generation (Boy)",
        "Code": "74",
        "Explanation": "Mua cho con cháu (giới tính nam) trong nhà, content hướng tới nhóm người mua rộng (ông bà, cha mẹ, anh chị, cô dì chú bác,...)"
    },
    {
        "Insights to niches": "For Younger Generation (Girl)",
        "Code": "75",
        "Explanation": "Mua cho con cháu (giới tính nữ) trong nhà, content hướng tới nhóm người mua rộng (ông bà, cha mẹ, anh chị, cô dì chú bác,...)"
    },
    {
        "Insights to niches": "For Her (Adult Woman)",
        "Code": "76",
        "Explanation": "Content đề cập tới món quà có thể tặng cho phụ nữ, đa dạng mối quan hệ, nhiều insight (cho vợ, bạn gái, mẹ, con gái, chị gái, cô dâu,...)"
    },
    {
        "Insights to niches": "For Him (Adult Male)",
        "Code": "77",
        "Explanation": "Content đề cập tới món quà có thể tặng cho đàn ông, đa dạng mối quan hệ, nhiều insight (cho chồng, bố, bạn trai, anh em trai, chú rể,...)"
    },
    {
        "Insights to niches": "For Pet Lovers",
        "Code": "78",
        "Explanation": "Không phân biệt giới tính, người lớn thích hoặc nuôi thú cưng"
    }
],
    E5: [
    {
        "CTA": "No CTA",
        "Code": "00",
        "Explanation": "Không có lời kêu gọi hành động/chỉ có logo"
    },
    {
        "CTA": "Purchase/Conversion",
        "Code": "01",
        "Explanation": "Tăng chuyển đổi, dẫn đến sale trực tiếp"
    },
    {
        "CTA": "Fear Of Missing Out",
        "Code": "02",
        "Explanation": "Mục đích là tạo cảm giác cấp bách và độc quyền cho người dùng."
    },
    {
        "CTA": "Educational Content",
        "Code": "03",
        "Explanation": "Nhằm mục đích thúc đẩy kiến thức và sự hiểu biết cho người dùng."
    },
    {
        "CTA": "Product Showcasing",
        "Code": "04",
        "Explanation": "Mục đích là làm nổi bật lợi ích/hình ảnh vật lý của sản phẩm đối với người dùng."
    },
    {
        "CTA": "Social Sharing",
        "Code": "05",
        "Explanation": "Khuyến khích người dùng chia sẻ nội dung và theo dõi trên các nền tảng mạng xã hội."
    },
    {
        "CTA": "Brand Engagement",
        "Code": "06",
        "Explanation": "Thúc đẩy nhận thức về thương hiệu và lòng trung thành của người dùng."
    },
    {
        "CTA": "Confirmshaming",
        "Code": "07",
        "Explanation": "Mục tiêu là thúc đẩy người dùng đưa ra quyết định bằng cách nêu bật những hậu quả tiêu cực của việc không hành động."
    },
    {
        "CTA": "Event Promotion",
        "Code": "08",
        "Explanation": NaN
    },
    {
        "CTA": "Feedback & Surveys",
        "Code": "09",
        "Explanation": "Kêu gọi khách hàng chia sẻ cảm nhận về sản phẩm"
    },
    {
        "CTA": "Promotional Offers",
        "Code": "10",
        "Explanation": "Thu hút người dùng bằng các ưu đãi và khuyến mại đặc biệt."
    }
]
};

/**
 * MACORNER STRATEGY BUILDER
 * FULL AUTO V60 (Merged Prompt, Cloud Store Fix, Favorites Filter)
 */

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

// LINK SERVER KOYEB CỦA BẠN
const API_BASE_URL = 'https://only-breanne-dzt-b25e098f.koyeb.app'; 

try {
    window.SCENE_GALLERY = JSON.parse(localStorage.getItem('macorner_gallery')) || [];
} catch(e) { window.SCENE_GALLERY = []; }

function saveGallery() {
    localStorage.setItem('macorner_gallery', JSON.stringify(window.SCENE_GALLERY));
}

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

function switchView(view) {
    document.querySelectorAll('.view-pane').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(`view-${view}`).classList.add('active');
    document.getElementById(`nav-${view}`).classList.add('active');

    if (view === 'review') renderReviewView();
    if (view === 'gallery') renderGalleryView(); 
    if (view === 'store') window.renderStore(); // Tự động cập nhật Cloud Store
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
        renderHistoryTable(history);
    } else {
        hContainer.style.display = 'none';
    }

    renderMatrix(CURRENT_NICHE, CURRENT_MATRIX_LIMIT, GLOBAL_TARGET_CODE);
    
    if (SELECTED_PAIRS.size > 0) updateMixArea();
    if (FINAL_SELECTED_CODES.size > 0) renderReviewView();
};

function getTopElements(niche, type, limit) {
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

function renderHistoryTable(data) {
    let html = `<table><thead><tr><th>Ad Name</th><th>Product Base</th><th>Full Code</th><th>Spent</th></tr></thead><tbody>`;
    data.forEach(item => {
        html += `<tr><td style="text-align:left">${item.adName}</td><td>${item.productBase || 'N/A'}</td><td><span class="full-code-text" data-full="${item.elements}">${item.elements}</span></td><td>$${item.spent.toLocaleString()}</td></tr>`;
    });
    document.getElementById('historyTableWrapper').innerHTML = html + `</tbody></table>`;
}

// BẢNG E2/E4 CHUẨN CANVA
function renderMatrix(niche, limit, targetCode) {
    const e2List = getTopElements(niche, 'E2', limit);
    const e4List = getTopElements(niche, 'E4', limit);
    
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
            html += `<td class="${isRan ? 'cell-history' : ''}" style="text-align: center;"><input type="checkbox" id="mat_${GLOBAL_CACHE_KEY}_${e2.code}_${e4.code}" autocomplete="off" class="round-checkbox" ${isChecked} onchange="togglePair('${e2.code}', '${e4.code}', this)"></td>`;
        });
        html += `</tr>`;
    });

    html += `</tbody></table><div class="canva-add-btn e2-btn" title="Add E2 Column" onclick="window.openSearchModal('E2')">+</div><div class="canva-add-btn e4-btn" title="Add E4 Row" onclick="window.openSearchModal('E4')">+</div></div></div>`;

    container.innerHTML = html;
    injectSearchModal(); 
}

let currentSearchType = 'E2';

function injectSearchModal() {
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
    renderMatrix(CURRENT_NICHE, CURRENT_MATRIX_LIMIT, GLOBAL_TARGET_CODE);
};

function togglePair(e2, e4, checkbox) {
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
    updateMixArea();
    renderReviewView(); 
}

function updateMixArea() {
    const area = document.getElementById('mixArea');
    const headers = document.getElementById('tabHeaders');
    const contents = document.getElementById('tabContents');
    
    if (SELECTED_PAIRS.size === 0) { 
        area.style.display = 'none'; 
        renderReviewView();
        return; 
    }

    area.style.display = 'block';
    const currentActive = document.querySelector('#tabHeaders .tab-btn.active')?.dataset.key;

    headers.innerHTML = '';
    contents.innerHTML = ''; 

    SELECTED_PAIRS.forEach((val, key) => {
        headers.innerHTML += `<button class="tab-btn ${currentActive === key ? 'active' : ''}" data-key="${key}" onclick="switchTab('${key}', 'tabHeaders', 'tabContents')">Pair ${key}</button>`;
        const pane = document.createElement('div');
        pane.className = 'tab-pane'; pane.id = `pane-${key}`;
        pane.innerHTML = `<button class="btn-primary" onclick="forceRegenerateMixForTab('${key}')" style="margin-bottom:15px">Generate Mix E1 & E5</button><div class="table-container" id="mix-table-${key}"></div>`;
        contents.appendChild(pane);
        generateMixForTab(key);
    });
    
    const finalKey = currentActive && SELECTED_PAIRS.has(currentActive) ? currentActive : SELECTED_PAIRS.keys().next().value;
    switchTab(finalKey, 'tabHeaders', 'tabContents');
}

function switchTab(key, headerId, contentId) {
    document.querySelectorAll(`#${headerId} .tab-btn`).forEach(b => b.classList.toggle('active', b.dataset.key === key));
    document.querySelectorAll(`#${contentId} .tab-pane`).forEach(p => p.classList.toggle('active', p.id.includes(key)));
}

function forceRegenerateMixForTab(key) {
    MIX_OPTIONS_CACHE.delete(key);
    Array.from(FINAL_SELECTED_CODES.entries()).forEach(([code, data]) => {
        if (data.pairKey === key) FINAL_SELECTED_CODES.delete(code);
    });
    generateMixForTab(key);
    saveStateToCache();
    renderReviewView();
}

function getSmartMix(niche, type, limit) {
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

function generateMixForTab(key) {
    const pair = SELECTED_PAIRS.get(key);
    let options = [];

    if (MIX_OPTIONS_CACHE.has(key)) {
        options = MIX_OPTIONS_CACHE.get(key);
    } else {
        const e1Opts = getSmartMix(CURRENT_NICHE, 'E1', 5);
        const e5Opts = getSmartMix(CURRENT_NICHE, 'E5', 5);
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
                    <td><input type="checkbox" id="mix_cb_${GLOBAL_CACHE_KEY}_${full}" autocomplete="off" class="round-checkbox" ${isChecked} onchange="toggleFinalCode('${full}', '${key}', this)"></td>
                 </tr>`;
    });
    document.getElementById(`mix-table-${key}`).innerHTML = html + `</tbody></table>`;
}

function toggleFinalCode(fullCode, pairKey, checkbox) {
    if (checkbox.checked) FINAL_SELECTED_CODES.set(fullCode, { fullCode, pairKey });
    else FINAL_SELECTED_CODES.delete(fullCode);
    saveStateToCache(); 
    renderReviewView();
}

function renderReviewView() {
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

    const pbContainer = document.createElement('div');
    pbContainer.id = 'pb-container';
    pbContainer.style.cssText = 'margin-bottom: 20px; padding: 15px; background: white; border: 1px solid var(--border); border-radius: 8px; display: flex; align-items: center; flex-wrap: wrap;';
    pbContainer.innerHTML = `
        ${imgPreviewHtml}
        <div style="display:flex; align-items:center; background: #fff3e0; padding: 8px 16px; border-radius: 8px; border: 1px solid #ffe0b2;">
            <span style="font-weight: 600; color: #e65100; margin-right: 8px;">Target Product Base:</span>
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

            const cacheData = AI_CACHE.get(code) || {};
            const hasCache = !!cacheData.rawScript;
            const scriptText = hasCache ? cacheData.scriptHtml : '';
            const isExpanded = hasCache ? cacheData.expanded : true;
            
            const showPromptBuilder = hasCache ? (cacheData.showPromptBuilder || false) : false;
            const ugcRecipientVal = hasCache && cacheData.promptRecipient ? cacheData.promptRecipient : '';
            const ugcPromptResult = hasCache && cacheData.shootingPrompt ? cacheData.shootingPrompt : '';
            const promptResultDisplay = ugcPromptResult ? 'block' : 'none';

            let promptActions = '';
            let promptText = '';
            if (ugcPromptResult) {
                promptActions = `
                    <button onclick="window.editUgcPrompt('${code}')" id="btn-edit-prompt-${code}" style="float: right; margin-left: 10px; margin-bottom: 5px; font-size: 11px; padding: 4px 8px; border: 1px solid #3b82f6; border-radius: 4px; cursor: pointer; background: #eff6ff; font-weight: bold; color: #3b82f6;">✏️ Edit</button>
                    <button onclick="navigator.clipboard.writeText(document.getElementById('prompt-text-val-${code}').innerText.trim()); this.innerText='✅ Copied!'; setTimeout(()=>this.innerText='📋 Copy', 2000);" style="float: right; margin-left: 10px; margin-bottom: 5px; font-size: 11px; padding: 4px 8px; border: 1px solid #ea580c; border-radius: 4px; cursor: pointer; background: #fff7ed; font-weight: bold; color: #ea580c;">📋 Copy</button>
                `;
                promptText = `<div id="prompt-text-val-${code}" style="clear: both; margin-top: 10px; white-space: pre-wrap; outline: none;">${ugcPromptResult.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`;
            }

            const aiRowStyle = hasCache && isExpanded ? 'table-row' : 'none';
            const btnText = hasCache ? '✨ Redo' : '✨ Create';
            const toggleIcon = isExpanded ? '▼' : '▶';
            const toggleDisplay = hasCache ? 'inline-block' : 'none';

            const builderHtml = hasCache ? `
                <div id="prompt-builder-${code}" style="display:${showPromptBuilder ? 'block' : 'none'}; margin-top:15px; padding:15px; background:#fff7ed; border-radius:6px; border:1px dashed #fdba74;">
                    <h4 style="margin:0 0 10px 0; color:#ea580c; font-size:14px;">🎬 Generate Video Shooting Prompt</h4>
                    <div style="display:flex; gap:10px; margin-bottom:10px;">
                        <input type="text" id="prompt-recipient-${code}" value="${ugcRecipientVal}" placeholder="Mô tả đối tượng (VD: a woman in her mid 50s, tự mua quà cho con gái)..." style="flex:1; padding:8px; border:1px solid #fdba74; border-radius:4px; font-size:13px;" autocomplete="off">
                        <button id="btn-gen-prompt-${code}" onclick="window.generateShootingPrompt('${code}')" style="background:#ea580c; color:white; border:none; padding:8px 15px; border-radius:4px; font-weight:bold; cursor:pointer; font-size:13px; white-space:nowrap;">Generate</button>
                    </div>
                    <div id="prompt-result-${code}" style="background: white; padding: 15px; border-radius: 6px; font-size: 14px; display: ${promptResultDisplay}; border: 1px solid #fdba74; line-height: 1.6;">${promptActions}${promptText}</div>
                </div>
            ` : '';

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
                    ${builderHtml}
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

// Bật/tắt chế độ edit prompt UGC
window.editUgcPrompt = function(fullCode) {
    const textDiv = document.getElementById(`prompt-text-val-${fullCode}`);
    const editBtn = document.getElementById(`btn-edit-prompt-${fullCode}`);
    
    if (!textDiv || !editBtn) return;

    if (textDiv.isContentEditable) {
        // Save Mode
        textDiv.contentEditable = "false";
        textDiv.style.border = "none";
        textDiv.style.padding = "0";
        textDiv.style.backgroundColor = "transparent";
        editBtn.innerHTML = "✏️ Edit";
        
        // Update cache
        const cacheData = AI_CACHE.get(fullCode);
        if (cacheData) {
            cacheData.shootingPrompt = textDiv.innerText;
            AI_CACHE.set(fullCode, cacheData);
            saveStateToCache();
        }
    } else {
        // Edit Mode
        textDiv.contentEditable = "true";
        textDiv.style.border = "1px dashed #3b82f6";
        textDiv.style.padding = "10px";
        textDiv.style.borderRadius = "4px";
        textDiv.style.backgroundColor = "#f8fafc";
        textDiv.focus();
        editBtn.innerHTML = "💾 Save Edit";
    }
};

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

        const promptActions = `
            <button onclick="window.editUgcPrompt('${fullCode}')" id="btn-edit-prompt-${fullCode}" style="float: right; margin-left: 10px; margin-bottom: 5px; font-size: 11px; padding: 4px 8px; border: 1px solid #3b82f6; border-radius: 4px; cursor: pointer; background: #eff6ff; font-weight: bold; color: #3b82f6;">✏️ Edit</button>
            <button onclick="navigator.clipboard.writeText(document.getElementById('prompt-text-val-${fullCode}').innerText.trim()); this.innerText='✅ Copied!'; setTimeout(()=>this.innerText='📋 Copy', 2000);" style="float: right; margin-left: 10px; margin-bottom: 5px; font-size: 11px; padding: 4px 8px; border: 1px solid #ea580c; border-radius: 4px; cursor: pointer; background: #fff7ed; font-weight: bold; color: #ea580c;">📋 Copy</button>
        `;
        const promptText = `<div id="prompt-text-val-${fullCode}" style="clear: both; margin-top: 10px; white-space: pre-wrap; outline: none;">${data.prompt.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`;

        resultBox.innerHTML = promptActions + promptText;

        cacheData.promptRecipient = recipientDesc;
        cacheData.shootingPrompt = data.prompt;
        
        AI_CACHE.set(fullCode, cacheData);
        saveStateToCache();
    } catch (err) {
        resultBox.innerHTML = `<span style="color:red;">❌ Error: ${err.message}</span>`;
    } finally {
        btn.innerText = "Generate";
        btn.disabled = false;
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

// GỘP CẢ HAI NỘI DUNG KHI COPY
window.copyScript = function(fullCode) {
    const cacheData = AI_CACHE.get(fullCode);
    if (!cacheData || !cacheData.rawScript) return;
    
    let contentToCopy = cacheData.rawScript;
    if (cacheData.shootingPrompt) {
        contentToCopy += '\n\n=== 🎬 VIDEO SHOOTING PROMPT ===\n\n' + cacheData.shootingPrompt;
    }
    
    const cleanedScript = contentToCopy
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


// ==========================================
// TÍNH NĂNG MỚI: CLOUD SCRIPT STORE CÓ FAVORITES
// ==========================================
window.STORE_DATA_CACHE = [];

// TỰ ĐỘNG TẠO GIAO DIỆN STORE KHI BẤM TAB ĐỂ ĐÈ LÊN GIAO DIỆN CŨ
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
        // THÊM THỜI GIAN ĐỂ CHỐNG LỖI CACHE BROWSER CŨ
        const res = await fetch(`${API_BASE_URL}/api/store?t=${Date.now()}`);
        let store = await res.json();
        window.STORE_DATA_CACHE = store;
        window.currentStoreFilter = 'all'; // Reset nhóm Sidebar
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
        // Lọc Nhóm Sidebar
        if (window.currentStoreFilter !== 'all' && s.targetCode !== window.currentStoreFilter) return false;
        // Lọc Yêu thích
        if (isFavOnly && !s.isFavorite) return false;
        
        // Lọc Tìm kiếm
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

    // Tạo nhóm cho Sidebar
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

// Bật / Tắt Yêu Thích ngay lập tức
window.toggleFavorite = async function(id) {
    try {
        const item = window.STORE_DATA_CACHE.find(s => s.id === id);
        if(item) {
            item.isFavorite = !item.isFavorite;
            window.updateStoreUI(); // Mượt mắt ngay lập tức
        }
        await fetch(`${API_BASE_URL}/api/store/${id}/favorite`, { method: 'PATCH' });
    } catch(e) {
        alert("Lỗi khi cập nhật Cloud!");
    }
}

// LƯU KỊCH BẢN VÀ GỘP TEXT
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
        
        // Tự load lại Store nếu đang đứng ở tab Store
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

// CÁC HÀM GỌI AI NHƯ CŨ
async function generateAIScript(fullCode, btn) {
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

        const imgBtnHtml = `<button id="img-btn-${fullCode}" onclick="requestSceneImage('${fullCode}')" style="background:#2563eb;color:white;border:none;padding:6px 12px;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;box-shadow:0 2px 4px rgba(0,0,0,.1);">🖼️ Scene Image</button>`;
        const promptBtnHtml = `<button onclick="window.togglePromptForm('${fullCode}')" id="prompt-btn-${fullCode}" style="background:#f59e0b;color:white;border:1px solid #d97706;padding:6px 12px;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;box-shadow:0 1px 2px rgba(0,0,0,.05);">🎬 Prompt</button>`;
        const copyBtnHtml = `<button onclick="window.copyScript('${fullCode}')" id="copy-btn-${fullCode}" style="background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;padding:6px 12px;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;">📋 Copy</button>`;
        const saveBtnHtml = `<button onclick="window.saveScript('${fullCode}')" id="save-btn-${fullCode}" style="background:#f0fdf4;color:#166534;border:1px solid #bbf7d0;padding:6px 12px;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;">💾 Save</button>`;

        const scriptHtml = `
            <div style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;background:#f8fafc;padding:8px 12px;border-radius:6px;border:1px solid #e2e8f0;gap:8px;flex-wrap:wrap;">
                <div><strong>🤖 Content Created For [${productBase}]:</strong> ${badgesHtml}</div>
                <div style="display:flex;gap:8px;align-items:center;">
                    ${promptBtnHtml}
                    ${copyBtnHtml}
                    ${saveBtnHtml}
                    ${imgBtnHtml}
                </div>
            </div>
            <div style="white-space:pre-wrap;">${data.script}</div>
        `;

        resultBox.innerHTML = scriptHtml;
        AI_CACHE.set(fullCode, { scriptHtml, rawScript: rawScriptText, expanded: true });
        saveStateToCache(); 
        
        renderReviewView();

    } catch (err) {
        resultBox.innerHTML = `<span style="color:red;">❌ Lỗi: ${err.message}</span>`;
    } finally {
        btn.disabled = false;
        btn.innerText = "✨ Redo";
    }
}

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
        const res = await fetch(`${API_BASE_URL}/api/generate-scene-image`, {
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

        window.SCENE_GALLERY.push({
            fullCode: fullCode,
            imageUrl: data.imageUrl,
            script: cacheData.rawScript,
            productBase: productBase
        });

        saveGallery();
        saveStateToCache();

        alert("✅ Image generated successfully! Check the 'Scene Gallery' tab.");
        btn.innerText = "✅ Saved to Gallery";
        btn.style.background = "#10b981";

    } catch (err) {
        alert(`❌ Lỗi tạo ảnh: ${err.message}`);
        btn.innerText = "🖼️ Scene Image";
        btn.style.background = "#2563eb";
        btn.disabled = false;
    }
}

function renderGalleryView() {
    const container = document.getElementById('gallery-container');
    if (!container) return;

    if (!window.SCENE_GALLERY || window.SCENE_GALLERY.length === 0) {
        container.innerHTML = `<div style="padding: 40px; text-align: center; color: #999; width: 100%;">No scene images generated yet. Go to Selection Review to generate some!</div>`;
        return;
    }

    let html = '';
    const reversed = [...window.SCENE_GALLERY].reverse();

    reversed.forEach((data, index) => {
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

function showScriptModal(index) {
    const data = window.SCENE_GALLERY[index];
    if (!data) return;
    const content = document.getElementById('script-modal-content');
    content.innerHTML = `<h3 style="margin-top:0; color:#f97316;">Content for [${data.fullCode}]</h3><div style="color:#333;">${data.script}</div>`;
    document.getElementById('script-modal').style.display = 'flex';
}
const NICHE_E4_MAP = {"MMR":["01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24","25","26","27","37","38","39","40","41","42","43","44","45","46","47","48","49","50","51","52","53","54","55","56","57","58","59","60","61"],"ANV":["25","26","27","28","29","30","31","32","33","34","35","36","39","43","44","45","59","60","61","62","63","64","76"],"NBO":["01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","17","18","31","32","33","37","38","39","49","50","51","52","53","54","55","56","57","58","59","60","61"],"RTM":["00","19","20","21","22","23","24","25","26","27","65","66","67","69"],"GRA":["00","01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","17","18","28","29","30","31","32","33","34","35","36","37","38","39"],"WED":["01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","17","18","37","38","39","58","59","60","61","62","63","64"],"BDM":["00","01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","17","18","25","26","27","37","38","39","49","50","51","52","53","54","55","56","57","58","59","60","61","62","63","64","72","76"],"IND":["00","19","20","21","22","23","24","25","26","27","31","32","33","58","59","78"],"MOD":["07","08","09","16","17","18","25","26","27","28","29","30","31","32","33","34","35","36","39","43","44","45","59","61","62","63","64","76"],"SCH":["01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","17","18","31","32","33","49","50","51","52","53","54","55","56","57","72","73","74","75"],"FAD":["22","23","24","38","46","47","48","58","61","62","63","64","77"],"SUM":["00","01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","17","18","34","35","36","49","50","51","52","53","54","55","56","57","61","72","73","74","75"],"HLW":[],"THA":[],"XMA":[],"VET":["22","23","24","38","46","47","48","58","61","62","63","64","77"],"BAP":["01","02","03","10","11","12","34","35","36","49","50","51","72","73"],"VLT":["58","59","60"],"GAR":["25","26","27","39","43","44","45","59","61","62","63","64","76"],"DOG":["00","01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","17","18","31","32","33","37","38","39","49","50","51","52","53","54","55","56","57","58","59","60","61","62","63","64","72","73","74","75","78"],"PET":["00","01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","17","18","37","38","39","49","50","51","52","53","54","55","56","57","58","59","60","61","62","63","64","72","73","74","75","78"],"HOR":["00","01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","17","18"],"CAM":["00","01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","17","18","22","23","24","25","26","27","38","39","43","44","45","46","47","48","58","59","60","61","62","63","64","76","77"],"FIS":["00","22","23","24","31","32","33","34","35","36","38","46","47","48","58","60","61","62","63","64","77"],"COO":["00","25","26","27","34","35","36","39","43","44","45","59","61","62","63","64","76"],"PAR":["31","32","33"],"HUT":["00","22","23","24","38","46","47","48","58","60","61","62","63","64","77"],"CAT":["00","01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","17","18","34","35","36","37","38","39","49","50","51","52","53","54","55","56","57","58","59","60","61","62","63","64","72","73","74","75","78"],"BIK":["00","22","23","24","25","26","27","38","39","43","44","45","46","47","48","58","59","61","62","63","64","76","77"],"DAN":["00","07","08","09","16","17","18","31","32","33","34","35","36","52","53","54","72","75"],"GYM":["00","22","23","24","25","26","27","38","39","43","44","45","46","47","48","58","59","61","62","63","64","76","77"],"MUC":["00","01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","17","18","22","23","24","25","26","27","31","32","33","34","35","36","38","39","43","44","45","46","47","48","49","50","51","52","53","54","55","56","57","58","59","61","62","63","64","73","74","75","76","77"],"MOV":["31","32","33","34","35","36"],"SEW":["00","25","26","27","39","43","44","45","59","61","62","63","64","76"],"CAR":["01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","17","18","22","23","24","31","32","33","38","46","47","48","49","50","51","52","53","54","55","56","57","58","61","62","63","64","73","74","75","77"],"OHO":["00","01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","17","18","22","23","24","25","26","27","34","35","36","38","39","43","44","45","46","47","48","49","50","51","52","53","54","55","56","57","58","59","61","62","63","64","73","74","75","76","77"],"TEN":["00","22","23","24","25","26","27","31","32","33","34","35","36","38","39","43","44","45","46","47","48","58","59","61","62","63","64","76","77"],"FOO":["04","05","06","13","14","15","31","32","33","34","35","36","37","38","55","56","57","58","59","60","74"],"BAK":["04","05","06","13","14","15","28","29","30","31","32","33","34","35","36","55","56","57","58","59","74"],"BAS":["04","05","06","13","14","15","28","29","30","31","32","33","34","35","36","55","56","57","58","59","74"],"GOL":["00","22","23","24","25","26","27","28","29","30","31","32","33","34","35","36","38","39","43","44","45","46","47","48","58","59","61","62","63","64","76","77"],"HIK":["00","28","29","30","31","32","33","34","35","36","58","59","60","61","62","63","64"],"YOG":["00","25","26","27","39","43","44","45","59","61","62","63","64","76"],"HOC":["00","04","05","06","13","14","15","31","32","33","55","56","57","74"],"TRA":["00","01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","17","18","37","38","39","58","59","60","61","62","63","64","73","74","75"],"GAM":["00","04","05","06","13","14","15","55","56","57","58","59","60","74"],"OSP":["00","01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","17","18","22","23","24","25","26","27","37","38","39","40","41","42","43","44","45","46","47","48","49","50","51","52","53","54","55","56","57","58","59","60","61","62","63","64","73","74","75","76","77"],"BOO":["00","01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24","25","26","27","31","32","33","34","35","36","37","38","39","40","41","42","43","44","45","46","47","48","49","50","51","52","53","54","55","56","57","58","59","60","61","62","63","64","73","74","75","76","77"],"ANI":["19","20","21","28","29","30","31","32","33","34","35","36","58","59","60"],"FAR":["00","22","23","24","25","26","27","28","29","30","38","39","43","44","45","46","47","48","58","59","61","62","63","64","76","77"],"TEC":["00","31","32","33","34","35","36","65","68","69"],"NUR":["00","25","26","27","37","39","59","60","61","62","63","64","65","70","71","76"],"HAI":["00","31","32","33","61","62","63","64"],"ACC":["00","61","62","63","64","65","66","67"],"FIF":["00","22","23","24","37","38","58","60","61","62","63","64","70","71","77"],"SOW":["00","22","23","24","25","26","27","34","35","36","38","39","43","44","45","46","47","48","58","59","60","61","62","63","64","70","71","76","77"],"AMY":["00","22","23","24","31","32","33","34","35","36","38","46","47","48","58","61","62","63","64","70","71","77"],"OJO":["00","22","23","24","25","26","27","34","35","36","38","39","43","44","45","46","47","48","58","59","61","62","63","64","66","67","70","71","76","77"],"BWO":["00","01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24","25","26","27","31","32","33","34","35","36","37","38","39","40","41","42","43","44","45","46","47","48","49","50","51","52","53","54","55","56","57","58","59","60","61","62","63","64","73","74","75","76","77"],"ASI":["28","29","30","31","32","33","34","35","36"],"LAT":["00","01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24","25","26","27","37","38","39","40","41","42","43","44","45","46","47","48","49","50","51","52","53","54","55","56","57","58","59","60","61","62","63","64","73","74","75","76","77"],"AUS":["00","01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24","25","26","27","28","29","30","31","32","33","34","35","36","37","38","39","40","41","42","43","44","45","46","47","48","49","50","51","52","53","54","55","56","57","58","59","60","61","62","63","64","73","74","75","76","77"],"AFM":["00","01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","17","18","28","29","30","31","32","33","34","35","36","37","38","39","49","50","51","52","53","54","55","56","57","58","59","60","61","62","63","64","73","74","75"],"LGB":["00","58","59","60","61"],"HIP":["00","61","62","63","64"],"CHR":["01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","17","18","49","50","51","52","53","54","55","56","57","73","74","75"],"COB":["00","22","23","24","38","46","47","48","58","61","62","63","64","77"],"SGT":["00","01","02","03","07","08","09","10","11","12","16","17","18","22","23","24","25","26","27","34","35","36","38","39","43","44","45","46","47","48","49","50","51","52","53","54","58","59","60","61","62","63","64","73","74","75","76","77"],"GIF":["25","26","27","31","32","33","34","35","36","39","43","44","45","59","61","62","63","64","76"],"BOF":["22","23","24","31","32","33","38","46","47","48","58","61","62","63","64","77"],"WIF":["34","35","36"],"GRD":["00","22","23","24","58"],"GRM":["00","25","26","27","34","35","36","59"],"GRP":["00","19","20","21","22","23","24","25","26","27","31","32","33","58","59","60"],"GRC":["01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","17","18","28","29","30","31","32","33","34","35","36","73"],"SON":["04","05","06","13","14","15","74"],"DAU":["07","08","09","16","17","18","75"],"OFA":["37","38","39","40","41","42","43","44","45","46","47","48","49","50","51","52","53","54","55","56","57"],"LDR":["01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24","25","26","27","37","38","39","40","41","42","43","44","45","46","47","48","49","50","51","52","53","54","55","56","57","58","59","60","61","62","63","64"],"FRI":["28","29","30","31","32","33","34","35","36","61","62","63","64"],"COW":["65","66","67"],"COU":["00","58","59","60"],"HUS":["58","60"],"PAN":["00"],"PIL":["00","28","29","30","31","32","33","34","35","36"],"MOM":["00","25","26","27","28","29","30","31","32","33","34","35","36","37","39","43","44","45","52","53","54","59","61","62","63","64","76"],"DAD":["00","22","23","24","31","32","33","37","38","46","47","48","55","56","57","58","61","62","63","64","77"],"KID":["01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","17","18","34","35","36","49","50","51","52","53","54","55","56","57","72","73","74","75"],"SIB":["37","38","39"],"SIS":["37","39"],"PSD":[]};
