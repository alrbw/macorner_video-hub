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