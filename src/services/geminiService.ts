import { sendCoreMessage, sendCoreMessageStream, CoreResponse } from './coreAi';

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

async function readStream(response: Response, onChunk?: (text: string) => void): Promise<string> {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  if (!reader) return '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      
      const data = trimmed.slice(6);
      if (data === '[DONE]') continue;

      try {
        const json = JSON.parse(data);
        const content = json.choices?.[0]?.delta?.content || '';
        if (content) {
          fullText += content;
          if (onChunk) onChunk(fullText);
        }
      } catch (e) {
        // Skip invalid JSON
      }
    }
  }
  return fullText;
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

export function getDynamicLimits(input: string, history: any[], mode: 'chat' | 'novel' | 'online'): { maxTokens: number, timeoutMinutes: number } {
  const inputLength = input.length + history.reduce((acc, m) => acc + (m.content?.length || 0), 0);
  const isNovel = mode === 'novel';
  
  // Detect numbers in input that might indicate requested count (e.g. "200 câu hỏi")
  const numberMatch = input.match(/(\d+)/);
  const requestedCount = numberMatch ? parseInt(numberMatch[0]) : 0;
  
  // Base tokens for overhead
  const baseTokens = isNovel ? 5000 : 2000;
  // Tokens per character (approx 0.5 token per char for Vietnamese)
  const tokensPerChar = 0.5;
  
  let estimatedTokens = baseTokens + Math.ceil(inputLength * tokensPerChar);
  
  // If a large count is requested, increase tokens significantly
  if (requestedCount > 50) {
    estimatedTokens += requestedCount * 500; // Assume 500 tokens per item
  }

  estimatedTokens = Math.min(1000000, estimatedTokens); // Cap at 1M tokens
  
  // Timeout: 1 minute per 10k tokens, min 2 mins, max 20 mins (unless > 100k tokens)
  let estimatedTimeout = Math.max(2, Math.ceil(estimatedTokens / 10000));
  if (estimatedTokens >= 100000) {
    estimatedTimeout = Math.min(30, estimatedTimeout);
  } else {
    estimatedTimeout = Math.min(20, estimatedTimeout);
  }
  
  return { maxTokens: estimatedTokens, timeoutMinutes: estimatedTimeout };
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
  quizCount?: number;
  cafeCount?: number;
  npcCount?: number;
}

export async function generateNPCs(count: number, userProfile: UserProfile, onProgress?: (current: number, total: number, newItems?: NPCProfile[]) => void): Promise<NPCProfile[]> {
  let allNPCs: NPCProfile[] = [];

  if (onProgress) onProgress(0, count);

  const prompt = `Tạo ${count} NPC cho show "Koko Sách Thế Giới".
Hồ sơ của tôi: ${userProfile.name}, ${userProfile.gender}, ${userProfile.intro}, gu: ${userProfile.target}.
YÊU CẦU BẮT BUỘC:
1. TRẢ VỀ DUY NHẤT MỘT MẢNG JSON 2D: [["Tên", Tuổi, "Giới tính", "MBTI", "Tính cách(3 từ)", "Sở thích(1 từ)", "Chào(1 câu)", "avatar_seed"], ... ].
2. KHÔNG ĐƯỢC CÓ BẤT KỲ CHỮ NÀO KHÁC NGOÀI MẢNG JSON NÀY.
3. KHÔNG GIẢI THÍCH, KHÔNG SUY NGHĨ, KHÔNG MARKDOWN, KHÔNG CÓ LỜI DẪN.
Ví dụ: [["Linh",20,"Nữ","ENFP","Vui,vẻ,hiền","Vẽ","Chào anh!","cute"]]`;

  let retryCount = 0;
  const maxRetries = 3;
  let success = false;

  const estimatedTokens = Math.max(15000, count * 500 + 5000);
  // 1 min per 10k tokens, cap at 20 mins unless 100k tokens
  let estimatedTimeout = Math.max(5, Math.ceil(estimatedTokens / 10000));
  estimatedTimeout = estimatedTokens >= 100000 ? Math.min(60, estimatedTimeout) : Math.min(20, estimatedTimeout);

  while (retryCount < maxRetries && !success) {
    try {
      const response = await sendCoreMessageStream(
        prompt,
        [],
        { title: 'Love Show', context: `Tạo ${count} hồ sơ NPC (Lần thử ${retryCount + 1})`, rules: 'CHỈ TRẢ VỀ JSON ARRAY. Cấm giải thích, cấm suy nghĩ.', length: 'Rất ngắn', ooc: 'Không' },
        { mode: 'online', minChars: 0, maxChars: 0, maxTokens: estimatedTokens, timeoutMinutes: estimatedTimeout }
      );
      
      const content = await readStream(response);
      const parsed = extractJSON(content);
      if (Array.isArray(parsed)) {
        const items = parsed.map((item: any, index: number) => ({
          id: `npc_${Date.now()}_${index}_${Math.random().toString(36).substring(7)}`,
          name: item[0] || 'Ẩn danh',
          age: typeof item[1] === 'number' ? item[1] : 20,
          gender: item[2] || 'Không xác định',
          mbti: item[3] || 'XXXX',
          personality: item[4] || 'Bí ẩn',
          hobbies: [item[5] || 'Không có'],
          intro: item[6] || 'Xin chào!',
          avatarSeed: item[7] || 'happy'
        }));
        allNPCs = items;
        if (onProgress) onProgress(allNPCs.length, count, items);
        success = true;
      }
    } catch (error: any) {
      retryCount++;
      console.error(`Error generating NPCs, retry ${retryCount}:`, error);
      if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
        await new Promise(r => setTimeout(r, 60000));
      } else {
        await new Promise(r => setTimeout(r, 10000 * retryCount));
      }
    }
  }
  
  return allNPCs;
}

export async function generateLoveQuiz(count: number = 10, onProgress?: (current: number, total: number, newItems?: QuizQuestion[]) => void): Promise<QuizQuestion[]> {
  let allQuestions: QuizQuestion[] = [];

  if (onProgress) onProgress(0, count);

  const prompt = `Tạo ${count} câu hỏi trắc nghiệm thú vị về tình yêu cho một minigame.
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

  let retryCount = 0;
  const maxRetries = 3;
  let success = false;

  const estimatedTokens = Math.max(15000, count * 400 + 5000);
  // 1 min per 10k tokens, cap at 20 mins unless 100k tokens
  let estimatedTimeout = Math.max(5, Math.ceil(estimatedTokens / 10000));
  estimatedTimeout = estimatedTokens >= 100000 ? Math.min(60, estimatedTimeout) : Math.min(20, estimatedTimeout);

  while (retryCount < maxRetries && !success) {
    try {
      const response = await sendCoreMessageStream(
        prompt,
        [],
        { title: 'Love Show', context: `Tạo ${count} câu hỏi trắc nghiệm`, rules: 'CHỈ TRẢ VỀ JSON ARRAY. Cấm giải thích, cấm suy nghĩ.', length: 'Ngắn gọn', ooc: 'Không' },
        { mode: 'online', minChars: 0, maxChars: 0, maxTokens: estimatedTokens, timeoutMinutes: estimatedTimeout }
      );

      const content = await readStream(response);
      const items = extractJSON(content);
      if (Array.isArray(items)) {
        allQuestions = items;
        if (onProgress) onProgress(allQuestions.length, count, items);
        success = true;
      }
    } catch (error: any) {
      retryCount++;
      console.error(`Error generating quiz, retry ${retryCount}:`, error);
      if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
        await new Promise(r => setTimeout(r, 60000));
      } else {
        await new Promise(r => setTimeout(r, 10000 * retryCount));
      }
    }
  }

  return allQuestions;
}

export async function generateCafeScenarios(count: number, onProgress?: (current: number, total: number, newItems?: CafeScenario[]) => void): Promise<CafeScenario[]> {
  let allScenarios: CafeScenario[] = [];

  if (onProgress) onProgress(0, count);

  const prompt = `Tạo ${count} tình huống cho minigame 'Cafe Tình Yêu'. Khách hàng gọi đồ uống và kể vấn đề tình cảm.
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

  let retryCount = 0;
  const maxRetries = 3;
  let success = false;

  const estimatedTokens = Math.max(15000, count * 800 + 5000);
  // 1 min per 10k tokens, cap at 20 mins unless 100k tokens
  let estimatedTimeout = Math.max(5, Math.ceil(estimatedTokens / 10000));
  estimatedTimeout = estimatedTokens >= 100000 ? Math.min(60, estimatedTimeout) : Math.min(20, estimatedTimeout);

  while (retryCount < maxRetries && !success) {
    try {
      const response = await sendCoreMessageStream(
        prompt,
        [],
        { title: 'Love Show', context: `Tạo ${count} tình huống cafe`, rules: 'CHỈ TRẢ VỀ JSON ARRAY. Cấm giải thích, cấm suy nghĩ.', length: 'Trung bình', ooc: 'Không' },
        { mode: 'online', minChars: 0, maxChars: 0, maxTokens: estimatedTokens, timeoutMinutes: estimatedTimeout }
      );
      const content = await readStream(response);
      const items = extractJSON(content);
      if (Array.isArray(items)) {
        allScenarios = items;
        if (onProgress) onProgress(allScenarios.length, count, items);
        success = true;
      }
    } catch (error: any) {
      retryCount++;
      console.error(`Error generating cafe scenarios, retry ${retryCount}:`, error);
      if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
        await new Promise(r => setTimeout(r, 60000));
      } else {
        await new Promise(r => setTimeout(r, 10000 * retryCount));
      }
    }
  }

  return allScenarios;
}

export async function generateNPCResponse(npc: any, userMessage: string, chatHistory: any[], userProfile: UserProfile, maxTokens?: number, timeoutMinutes?: number, superMode?: boolean, onStream?: (text: string) => void): Promise<CoreResponse> {
  const isNovel = userProfile.chatMode === 'novel';
  const min = userProfile.minChars || (isNovel ? 2000 : 50);
  const max = userProfile.maxChars || (isNovel ? 3000 : 200);

  const dynamicLimits = getDynamicLimits(userMessage, chatHistory, userProfile.chatMode || 'chat');
  let finalMaxTokens = maxTokens || dynamicLimits.maxTokens;
  let finalTimeout = timeoutMinutes || dynamicLimits.timeoutMinutes;

  if (superMode) {
    finalMaxTokens = 100000;
    finalTimeout = 30;
  }

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

  let retryCount = 0;
  const maxRetries = 2;
  let lastError: any = null;

  while (retryCount < maxRetries) {
    try {
      const response = await sendCoreMessageStream(
        userMessage,
        chatHistory,
        { 
          title: 'Dating NPC', 
          context: systemPrompt, 
          rules: `Nhập vai NPC. TUYỆT ĐỐI KHÔNG viết phần suy nghĩ (thinking), mã code, hay giải thích. CHỈ viết nội dung câu chuyện. ${isNovel ? `BẮT BUỘC viết dài từ ${min} đến ${max} ký tự.` : 'Viết ngắn gọn tự nhiên.'}`, 
          length: `${min}-${max} chars`, 
          ooc: 'Không' 
        },
        { mode: isNovel ? 'novel' : 'online', minChars: min, maxChars: max, maxTokens: finalMaxTokens, timeoutMinutes: finalTimeout }
      );

      if (!response.body) {
        throw new Error('Phản hồi không có body');
      }

      const fullContent = await readStream(response, (text) => {
        if (onStream) onStream(text);
      });
      
      // Try parsing as JSON if it's a full object, otherwise return raw content
      try {
        const data = JSON.parse(fullContent);
        if (data.choices && data.choices[0] && data.choices[0].message) {
          return {
            content: data.choices[0].message.content,
            usage: data.usage,
            raw: data
          };
        }
      } catch (e) {}

      return { content: fullContent, usage: {}, raw: {} };
    } catch (error: any) {
      lastError = error;
      retryCount++;
      console.error(`Error generating NPC response, retry ${retryCount}:`, error);
      if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
        await new Promise(r => setTimeout(r, 60000));
      } else {
        await new Promise(r => setTimeout(r, 5000 * retryCount));
      }
    }
  }

  throw lastError || new Error("Không thể tạo phản hồi từ NPC.");
}
