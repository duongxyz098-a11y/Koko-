import { sendCoreMessage } from './coreAi';

export interface NPCProfile {
  id: string;
  name: string;
  age: number;
  gender: string;
  mbti: string;
  personality: string;
  hobbies: string[];
  intro: string;
  avatarSeed: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
}

export interface CafeScenario {
  npcName: string;
  problem: string;
  options: string[];
  bestAdviceIndex: number;
  coffeeOrder: string;
}

export function extractJSON(text: string) {
  if (!text) return [];
  
  const tryParse = (str: string) => {
    try {
      // 1. Loại bỏ markdown code blocks nếu có
      let cleaned = str.replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, '$1');
      
      // 2. Làm sạch các ký tự điều khiển không hợp lệ
      cleaned = cleaned.replace(/[\u0000-\u001F\u007F-\u009F]/g, (match) => {
        if (match === '\n') return '\\n';
        if (match === '\r') return '\\r';
        if (match === '\t') return '\\t';
        return '';
      });
      
      return JSON.parse(cleaned.trim());
    } catch (e) {
      return null;
    }
  };

  // 1. Làm sạch văn bản trước khi thử parse
  let sanitizedText = text;
  
  // Loại bỏ các tiêu đề bold (ví dụ: **Defining the Parameters**)
  // Regex này tìm các đoạn văn bản bắt đầu bằng ** và kết thúc bằng **
  sanitizedText = sanitizedText.replace(/\*\*[^*]+\*\*/g, '');
  // Loại bỏ thêm các dòng tiêu đề có thể không có ** nhưng vẫn là tiêu đề
  sanitizedText = sanitizedText.replace(/^[A-Z][A-Za-z\s]+$/gm, '');

  const thinkingPatterns = [
    /<think>[\s\S]*?<\/think>/gi,
    /<thinking>[\s\S]*?<\/thinking>/gi,
    /Thinking Process:[\s\S]*?(?=\[|\{|$)/gi,
    /Thinking:[\s\S]*?(?=\[|\{|$)/gi,
    /^[\s\S]*?(?=\[|\{)/i // Xóa mọi thứ trước dấu [ hoặc { đầu tiên
  ];
  
  for (const pattern of thinkingPatterns) {
    sanitizedText = sanitizedText.replace(pattern, '');
  }

  // 2. Thử parse trực tiếp sau khi làm sạch
  const direct = tryParse(sanitizedText);
  if (direct) return direct;

  // 3. Tìm kiếm JSON bằng cách thử các vị trí bắt đầu khác nhau
  const findAndParse = (char: string, endChar: string) => {
    let startIdx = sanitizedText.indexOf(char);
    while (startIdx !== -1) {
      let lastIdx = sanitizedText.lastIndexOf(endChar);
      while (lastIdx > startIdx) {
        const candidate = sanitizedText.substring(startIdx, lastIdx + 1);
        const parsed = tryParse(candidate);
        if (parsed) return parsed;
        lastIdx = sanitizedText.lastIndexOf(endChar, lastIdx - 1);
      }
      startIdx = sanitizedText.indexOf(char, startIdx + 1);
    }
    return null;
  };

  const arrayResult = findAndParse('[', ']');
  if (arrayResult) return arrayResult;

  const objectResult = findAndParse('{', '}');
  if (objectResult) return objectResult;

  // 4. Thử sửa lỗi truncated (cắt cụt)
  const startChar = sanitizedText.indexOf('[') !== -1 ? '[' : (sanitizedText.indexOf('{') !== -1 ? '{' : null);
  if (startChar) {
    const startIndex = sanitizedText.indexOf(startChar);
    let truncated = sanitizedText.substring(startIndex);
    
    const openBraces = (truncated.match(/\{/g) || []).length;
    const closeBraces = (truncated.match(/\}/g) || []).length;
    const openBrackets = (truncated.match(/\[/g) || []).length;
    const closeBrackets = (truncated.match(/\]/g) || []).length;

    let repaired = truncated;
    for (let i = 0; i < openBraces - closeBraces; i++) repaired += '}';
    for (let i = 0; i < openBrackets - closeBrackets; i++) repaired += ']';
    
    const parsedRepaired = tryParse(repaired);
    if (parsedRepaired) return parsedRepaired;
  }

  console.error("Lỗi phân giải JSON cực nghiêm trọng. Text gốc:", text.substring(0, 1000) + "...");
  return [];
}

export interface UserProfile {
  name: string;
  intro: string;
  target: string;
  reason: string;
  mc: string;
  gender: string;
  targetGender: string;
  minChars: number;
  maxChars: number;
  avatarBg: string;
  chatMode?: 'chat' | 'novel' | 'online';
}

export async function generateNPCs(count: number, userProfile: UserProfile): Promise<NPCProfile[]> {
  const batchSize = 40; // Tăng batchSize để giảm số lượng yêu cầu
  const batches = Math.ceil(count / batchSize);
  let allNPCs: NPCProfile[] = [];

  for (let i = 0; i < batches; i++) {
    const currentBatchCount = Math.min(batchSize, count - allNPCs.length);
    if (currentBatchCount <= 0) break;

    const prompt = `Tạo ${currentBatchCount} NPC cho show "Koko Sách Thế Giới".
Hồ sơ của tôi: ${userProfile.name}, ${userProfile.gender}, ${userProfile.intro}, gu: ${userProfile.target}.
YÊU CẦU BẮT BUỘC:
1. TRẢ VỀ DUY NHẤT MỘT MẢNG JSON 2D: [["Tên", Tuổi, "Giới tính", "MBTI", "Tính cách(3 từ)", "Sở thích(1 từ)", "Chào(1 câu)", "avatar_seed"], ... ].
2. KHÔNG ĐƯỢC CÓ BẤT KỲ CHỮ NÀO KHÁC NGOÀI MẢNG JSON NÀY.
3. KHÔNG GIẢI THÍCH, KHÔNG SUY NGHĨ, KHÔNG MARKDOWN, KHÔNG CÓ LỜI DẪN.
Ví dụ: [["Linh",20,"Nữ","ENFP","Vui,vẻ,hiền","Vẽ","Chào anh!","cute"]]`;

    try {
      const response = await sendCoreMessage(
        prompt,
        [],
        { title: 'Love Show', context: `Tạo hồ sơ NPC đợt ${i + 1}/${batches}`, rules: 'CHỈ TRẢ VỀ JSON ARRAY. Cấm giải thích, cấm suy nghĩ.', length: 'Rất ngắn', ooc: 'Không' }
      );
      
      const parsed = extractJSON(response);
      if (Array.isArray(parsed)) {
        const batch = parsed.map((item: any, index: number) => ({
          id: `npc_${Date.now()}_${allNPCs.length + index}_${Math.random().toString(36).substring(7)}`,
          name: item[0] || 'Ẩn danh',
          age: typeof item[1] === 'number' ? item[1] : 20,
          gender: item[2] || 'Không xác định',
          mbti: item[3] || 'XXXX',
          personality: item[4] || 'Bí ẩn',
          hobbies: [item[5] || 'Không có'],
          intro: item[6] || 'Xin chào!',
          avatarSeed: item[7] || 'happy'
        }));
        allNPCs = [...allNPCs, ...batch];
      }
      // Thêm delay 15s giữa các batch để tuân thủ rate limit (4 req/phút)
      if (i < batches - 1) {
        await new Promise(r => setTimeout(r, 15000));
      }
    } catch (error) {
      console.error(`Error generating NPC batch ${i + 1}:`, error);
      // Thêm delay lâu hơn khi lỗi
      await new Promise(r => setTimeout(r, 30000));
    }
  }
  
  return allNPCs;
}

export async function generateLoveQuiz(): Promise<QuizQuestion[]> {
  const prompt = `Tạo 10 câu hỏi trắc nghiệm thú vị về tình yêu cho một minigame.
  YÊU CẦU BẮT BUỘC:
  1. TRẢ VỀ DUY NHẤT MỘT MẢNG JSON: [
      {
        "question": "string",
        "options": ["đáp án 1", "đáp án 2", "đáp án 3"],
        "correctAnswerIndex": number (0, 1 hoặc 2)
      }, ...
    ].
  2. KHÔNG ĐƯỢC CÓ BẤT KỲ CHỮ NÀO KHÁC NGOÀI MẢNG JSON NÀY.
  3. KHÔNG GIẢI THÍCH, KHÔNG SUY NGHĨ, KHÔNG MARKDOWN, KHÔNG CÓ LỜI DẪN.`;
  const response = await sendCoreMessage(
    prompt,
    [],
    { title: 'Love Show', context: 'Tạo câu hỏi trắc nghiệm', rules: 'CHỈ TRẢ VỀ JSON ARRAY. Cấm giải thích, cấm suy nghĩ.', length: 'Ngắn gọn', ooc: 'Không' }
  );
  return extractJSON(response);
}

export async function generateCafeScenarios(count: number): Promise<CafeScenario[]> {
  const batchSize = 20; // Tăng batchSize
  const batches = Math.ceil(count / batchSize);
  let allScenarios: CafeScenario[] = [];

  for (let i = 0; i < batches; i++) {
    const currentBatchCount = Math.min(batchSize, count - allScenarios.length);
    if (currentBatchCount <= 0) break;

    const prompt = `Tạo ${currentBatchCount} tình huống cho minigame 'Cafe Tình Yêu'. Khách hàng gọi đồ uống và kể vấn đề tình cảm.
    YÊU CẦU BẮT BUỘC:
    1. TRẢ VỀ DUY NHẤT MỘT MẢNG JSON: [
      {
        "npcName": "string",
        "problem": "string (vấn đề tình cảm dài ít nhất 100 ký tự)",
        "options": ["lời khuyên 1", "lời khuyên 2", "lời khuyên 3"],
        "bestAdviceIndex": number (0, 1 hoặc 2),
        "coffeeOrder": "string (tên đồ uống)"
      }, ...
    ].
    2. KHÔNG ĐƯỢC CÓ BẤT KỲ CHỮ NÀO KHÁC NGOÀI MẢNG JSON NÀY.
    3. KHÔNG GIẢI THÍCH, KHÔNG SUY NGHĨ, KHÔNG MARKDOWN, KHÔNG CÓ LỜI DẪN.`;

    try {
      const response = await sendCoreMessage(
        prompt,
        [],
        { title: 'Love Show', context: `Tạo tình huống cafe đợt ${i + 1}/${batches}`, rules: 'CHỈ TRẢ VỀ JSON ARRAY. Cấm giải thích, cấm suy nghĩ.', length: 'Trung bình', ooc: 'Không' }
      );
      const batch = extractJSON(response);
      if (Array.isArray(batch)) {
        allScenarios = [...allScenarios, ...batch];
      }
      // Thêm delay 15s giữa các batch để tuân thủ rate limit
      if (i < batches - 1) {
        await new Promise(r => setTimeout(r, 15000));
      }
    } catch (error) {
      console.error(`Error generating cafe batch ${i + 1}:`, error);
      await new Promise(r => setTimeout(r, 30000));
    }
  }

  return allScenarios;
}

export async function generateNPCResponse(npc: any, userMessage: string, chatHistory: any[], userProfile: UserProfile): Promise<string> {
  const isNovel = userProfile.chatMode === 'novel';
  const min = userProfile.minChars || (isNovel ? 2000 : 50);
  const max = userProfile.maxChars || (isNovel ? 3000 : 200);

  const systemPrompt = `Bạn là một NPC trong show hẹn hò "Sách Thế Giới".
  Hồ sơ của bạn: Tên: ${npc.name}, Tuổi: ${npc.age}, Giới tính: ${npc.gender}, MBTI: ${npc.mbti}, Tính cách: ${npc.personality}, Sở thích: ${npc.hobbies?.join(', ') || 'Không có'}.
  
  Hồ sơ của người dùng đang trò chuyện với bạn:
  - Tên: ${userProfile.name || 'Người chơi'}
  - Giới tính: ${userProfile.gender === 'male' ? 'Nam' : 'Nữ'}
  - Giới thiệu bản thân: ${userProfile.intro || 'Không có'}
  - Gu tìm kiếm: ${userProfile.target || 'Không rõ'}
  - Lý do tham gia: ${userProfile.reason || 'Không rõ'}
  
  CHẾ ĐỘ: ${isNovel ? 'TIỂU THUYẾT (NOVEL)' : 'TRỰC TUYẾN (CHAT)'}
  
  QUY TẮC TUYỆT ĐỐI (BẮT BUỘC TUÂN THỦ):
  1. TUYỆT ĐỐI KHÔNG viết phần suy nghĩ (thinking), phân tích, hay mã code.
  2. KHÔNG giải thích nội dung.
  3. CHỈ viết nội dung câu chuyện/tin nhắn.
  4. KHÔNG dùng ký tự xuống dòng (\n) để tạo định dạng code, danh sách, hay cấu trúc lạ. Viết thành các đoạn văn tự nhiên.
  
  ${isNovel 
    ? `YÊU CẦU: Viết theo phong cách tiểu thuyết lãng mạn, miêu tả chi tiết nội tâm, bối cảnh và cảm xúc. Độ dài BẮT BUỘC: từ ${min} đến ${max} ký tự.` 
    : `YÊU CẦU: Viết ngắn gọn, tự nhiên như đang nhắn tin qua app, dùng icon (♡, ✨) và ngôn ngữ trẻ trung.`}
  
  Luôn trả lời bằng Tiếng Việt.`;

  const response = await sendCoreMessage(
    userMessage,
    chatHistory,
    { 
      title: 'Dating NPC', 
      context: systemPrompt, 
      rules: `Nhập vai NPC. TUYỆT ĐỐI KHÔNG viết phần suy nghĩ (thinking), mã code, hay giải thích. CHỈ viết nội dung câu chuyện. ${isNovel ? `BẮT BUỘC viết dài từ ${min} đến ${max} ký tự.` : 'Viết ngắn gọn tự nhiên.'}`, 
      length: `${min}-${max} chars`, 
      ooc: 'Không' 
    },
    { mode: isNovel ? 'novel' : 'online', minChars: min, maxChars: max }
  );
  return response;
}
