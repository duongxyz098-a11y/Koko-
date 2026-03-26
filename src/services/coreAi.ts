import { GoogleGenAI } from "@google/genai";

export interface KokoPrompt {
  title: string;
  context: string;
  rules: string;
  length: string;
  ooc: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatSettings {
  mode: 'online' | 'novel';
  minChars: number;
  maxChars: number;
  maxTokens?: number;
  timeoutMinutes?: number;
  isUnlimited?: boolean;
  targetCharCount?: number;
  nextChars?: string;
}

export interface UserContext {
  preferences: Record<string, string[]>;
  isFollowing: boolean;
}

export const buildSystemPrompt = (koko: KokoPrompt, chatSettings?: ChatSettings, userContext?: UserContext): string => {
  let prompt = `Bạn đang đóng vai trò dựa trên thiết lập từ "Koko Sách Thế Giới". Dưới đây là các quy tắc cốt lõi bạn PHẢI tuân thủ tuyệt đối trong mọi hoàn cảnh:

[BỐI CẢNH / CONTEXT]
${koko.context || 'Không có bối cảnh cụ thể.'}

[QUY TẮC TUYỆT ĐỐI / ABSOLUTE RULES]
${koko.rules || 'Không có quy tắc cụ thể.'}

[ĐỘ DÀI YÊU CẦU / LENGTH]
${koko.length || 'Tùy chỉnh linh hoạt.'}

[QUY ĐỊNH OOC / OUT OF CHARACTER]
${koko.ooc || 'Không được thoát vai (OOC) dưới mọi hình thức.'}

Hãy ghi nhớ: Bạn là hiện thân của thiết lập này. Mọi lời nói, hành động đều phải tuân theo nguồn gốc trên.`;

  if (userContext) {
    prompt += `\n\n[THÔNG TIN NGƯỜI DÙNG ĐANG TRÒ CHUYỆN]
- Sở thích/Đặc điểm họ tìm kiếm: ${JSON.stringify(userContext.preferences)}
- Trạng thái theo dõi: ${userContext.isFollowing ? 'Họ ĐÃ THEO DÕI bạn. Hãy thể hiện sự thân thiết hoặc biết ơn.' : 'Họ CHƯA THEO DÕI bạn.'}
Hãy đọc hồ sơ này và phản hồi sao cho phù hợp, thể hiện rằng bạn biết những thông tin này nếu cần thiết.`;
  }

  if (chatSettings) {
    if (chatSettings.mode === 'online') {
      prompt += `\n\n[CHẾ ĐỘ NHẮN TIN: ONLINE NGẮN]
- Bạn đang nhắn tin qua ứng dụng hẹn hò (Dating App).
- Hãy trả lời ngắn gọn, tự nhiên như đang nhắn tin thật.
- BẮT BUỘC: Hãy chia nhỏ câu trả lời của bạn thành nhiều đoạn ngắn (mỗi đoạn là một tin nhắn riêng biệt), phân cách nhau bằng dấu xuống dòng (\\n).
- Bạn có thể gửi tới 20 tin nhắn ngắn liên tiếp nếu có nhiều điều muốn nói.`;
    } else {
      prompt += `\n\n[CHẾ ĐỘ NHẮN TIN: TIỂU THUYẾT OFF]
- Bạn đang viết theo phong cách tiểu thuyết/roleplay chi tiết.
- BẮT BUỘC tuân thủ độ dài: Từ ${chatSettings.minChars} đến ${chatSettings.maxChars} ký tự.
${chatSettings.targetCharCount ? `- YÊU CẦU ĐẶC BIỆT: Bạn BẮT BUỘC phải viết CHÍNH XÁC ${chatSettings.targetCharCount} ký tự.
- ĐÂY LÀ YÊU CẦU QUAN TRỌNG NHẤT.
- Trước khi trả lời, hãy đếm số ký tự dự kiến.
- Nếu bạn viết ít hơn, hãy thêm chi tiết miêu tả.
- Nếu bạn viết nhiều hơn, hãy cắt bỏ các câu không cần thiết.
- Đừng bao giờ trả về ít hơn hoặc nhiều hơn số ký tự này.` : ''}
${chatSettings.nextChars ? `- YÊU CẦU BẮT ĐẦU: Bạn BẮT BUỘC phải bắt đầu câu trả lời của mình bằng chính xác chuỗi ký tự sau: "${chatSettings.nextChars}". Đừng thêm bất kỳ ký tự nào trước nó.` : ''}
- Hệ thống yêu cầu bạn phải trả lời chính xác số ký tự này, không được sai sót. Hãy miêu tả hành động, suy nghĩ và lời nói một cách chi tiết.`;
    }
  }

  return prompt.trim();
};

export interface CoreResponse {
  content: string;
  usage: any;
  raw: any;
}

// Helper to enforce character count
const enforceCharCount = (text: string, target: number): string => {
  if (text.length === target) return text;
  if (text.length > target) return text.substring(0, target);
  return text + ' '.repeat(target - text.length); // Pad with spaces
};

export const sendCoreMessage = async (
  message: string,
  history: ChatMessage[],
  koko: KokoPrompt,
  chatSettings?: ChatSettings,
  userContext?: UserContext
): Promise<CoreResponse> => {
  // ... (original implementation)
  const savedSettings = localStorage.getItem('koko_api_settings');
  let userApiKey = '';
  let userApiUrl = '';
  let userModelName = '';
  let userTimeoutMinutes = 30;
  let userMaxTokens = 1000000;

  if (savedSettings) {
    try {
      const settings = JSON.parse(savedSettings);
      userApiKey = settings.apiKey || userApiKey;
      userApiUrl = settings.endpoint || userApiUrl;
      userModelName = settings.model || userModelName;
      userTimeoutMinutes = settings.timeoutMinutes || userTimeoutMinutes;
      userMaxTokens = settings.maxTokens || userMaxTokens;
    } catch (e) {}
  }

  if (userApiKey && userApiUrl) {
    const trimmedHistory = history.slice(-10);
    
    const messages = [
      { role: 'system', content: buildSystemPrompt(koko, chatSettings, userContext) },
      ...trimmedHistory,
      { role: 'user', content: message }
    ];

    let finalUrl = userApiUrl.trim();
    if (finalUrl.endsWith('/')) {
      finalUrl = finalUrl.slice(0, -1);
    }

    if (!finalUrl.endsWith('/chat/completions')) {
      if (finalUrl.endsWith('/v1')) {
        finalUrl += '/chat/completions';
      } else {
        const isKnownProvider = finalUrl.includes('api.openai.com') || 
                               finalUrl.includes('api.anthropic.com') || 
                               finalUrl.includes('api.groq.com') ||
                               finalUrl.includes('openrouter.ai');
        
        if (isKnownProvider && !finalUrl.includes('/v1')) {
          finalUrl += '/v1/chat/completions';
        } else {
          finalUrl += '/chat/completions';
        }
      }
    }

    finalUrl = finalUrl.replace(/([^:]\/)\/+/g, "$1");

    let maxTokensToUse = userMaxTokens;
    if (chatSettings?.targetCharCount) {
      maxTokensToUse = Math.ceil(chatSettings.targetCharCount / 3);
    } else if (chatSettings?.maxTokens) {
      maxTokensToUse = chatSettings.maxTokens;
    }

    const requestBody: any = {
      model: userModelName || 'gpt-3.5-turbo',
      messages: messages,
      temperature: 0.7,
      max_tokens: maxTokensToUse
    };

    const controller = new AbortController();
    
    let timeoutMinutes = chatSettings?.timeoutMinutes || userTimeoutMinutes;
    if (chatSettings?.mode === 'novel') {
        if (maxTokensToUse >= 100000) {
            timeoutMinutes = Math.max(5, timeoutMinutes);
        } else {
            timeoutMinutes = Math.max(2, timeoutMinutes);
        }
    }
    const timeoutId = setTimeout(() => controller.abort(), timeoutMinutes * 60 * 1000);

    try {
      const response = await fetch(finalUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userApiKey.trim()}`
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMsg = `Lỗi kết nối API Proxy: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.error?.message) {
            errorMsg = `Lỗi API: ${errorData.error.message}`;
          } else if (errorData.message) {
            errorMsg = `Lỗi API: ${errorData.message}`;
          }
        } catch (e) {
          const textError = await response.text().catch(() => '');
          if (textError) errorMsg += ` - ${textError.substring(0, 100)}`;
        }
        
        if (response.status === 401) errorMsg += " (Sai API Key/Token)";
        if (response.status === 429) errorMsg += " (Hết hạn mức/Rate limit)";
        
        throw new Error(errorMsg);
      }

      const data = await response.json();
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Phản hồi từ API Proxy không đúng định dạng. Hãy kiểm tra lại Model Name hoặc URL Proxy.');
      }
      
      let content = data.choices[0].message.content;
      if (chatSettings?.targetCharCount) {
        content = enforceCharCount(content, chatSettings.targetCharCount);
      }

      return {
        content: content,
        usage: data.usage,
        raw: data
      };
    } catch (error: any) {
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        throw new Error('Không thể kết nối tới Proxy URL. Hãy đảm bảo URL chính xác và có thể truy cập từ trình duyệt.');
      }
      throw error;
    }
  }

  throw new Error('Bạn CHƯA CẤU HÌNH API Proxy. Để sử dụng ứng dụng 100% bằng API của bạn, vui lòng vào Cài đặt (biểu tượng bánh răng) và nhập API Key, Proxy URL.');
};

export const sendCoreMessageStream = async (
  message: string,
  history: ChatMessage[],
  koko: KokoPrompt,
  chatSettings?: ChatSettings,
  userContext?: UserContext
): Promise<Response> => {
  const savedSettings = localStorage.getItem('koko_api_settings');
  let userApiKey = '';
  let userApiUrl = '';
  let userModelName = '';
  let userTimeoutMinutes = 30;
  let userMaxTokens = 1000000;

  if (savedSettings) {
    try {
      const settings = JSON.parse(savedSettings);
      userApiKey = settings.apiKey || userApiKey;
      userApiUrl = settings.endpoint || userApiUrl;
      userModelName = settings.model || userModelName;
      userTimeoutMinutes = settings.timeoutMinutes || userTimeoutMinutes;
      userMaxTokens = settings.maxTokens || userMaxTokens;
    } catch (e) {}
  }

  if (userApiKey && userApiUrl) {
    const trimmedHistory = history.slice(-10);
    
    const messages = [
      { role: 'system', content: buildSystemPrompt(koko, chatSettings, userContext) },
      ...trimmedHistory,
      { role: 'user', content: message }
    ];

    let finalUrl = userApiUrl.trim();
    if (finalUrl.endsWith('/')) {
      finalUrl = finalUrl.slice(0, -1);
    }

    if (!finalUrl.endsWith('/chat/completions')) {
      if (finalUrl.endsWith('/v1')) {
        finalUrl += '/chat/completions';
      } else {
        const isKnownProvider = finalUrl.includes('api.openai.com') || 
                               finalUrl.includes('api.anthropic.com') || 
                               finalUrl.includes('api.groq.com') ||
                               finalUrl.includes('openrouter.ai');
        
        if (isKnownProvider && !finalUrl.includes('/v1')) {
          finalUrl += '/v1/chat/completions';
        } else {
          finalUrl += '/chat/completions';
        }
      }
    }

    finalUrl = finalUrl.replace(/([^:]\/)\/+/g, "$1");

    const requestBody: any = {
      model: userModelName || 'gpt-3.5-turbo',
      messages: messages,
      temperature: 0.7,
      stream: true // Enable streaming
    };

    let maxTokensToUse = userMaxTokens;
    if (chatSettings?.targetCharCount) {
      maxTokensToUse = Math.ceil(chatSettings.targetCharCount / 3);
    } else if (chatSettings?.maxTokens) {
      maxTokensToUse = chatSettings.maxTokens;
    }
    requestBody.max_tokens = maxTokensToUse;

    const controller = new AbortController();
    
    let timeoutMinutes = chatSettings?.timeoutMinutes || userTimeoutMinutes;
    if (chatSettings?.mode === 'novel') {
        if (maxTokensToUse >= 100000) {
            timeoutMinutes = Math.max(5, timeoutMinutes);
        } else {
            timeoutMinutes = Math.max(2, timeoutMinutes);
        }
    }
    const timeoutId = setTimeout(() => controller.abort(), timeoutMinutes * 60 * 1000);

    try {
      const response = await fetch(finalUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userApiKey.trim()}`
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMsg = `Lỗi kết nối API Proxy: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.error?.message) {
            errorMsg = `Lỗi API: ${errorData.error.message}`;
          } else if (errorData.message) {
            errorMsg = `Lỗi API: ${errorData.message}`;
          }
        } catch (e) {
          const textError = await response.text().catch(() => '');
          if (textError) errorMsg += ` - ${textError.substring(0, 100)}`;
        }
        
        if (response.status === 401) errorMsg += " (Sai API Key/Token)";
        if (response.status === 429) errorMsg += " (Hết hạn mức/Rate limit)";
        
        throw new Error(errorMsg);
      }

      return response;
    } catch (error: any) {
      throw error;
    }
  }

  throw new Error('Bạn CHƯA CẤU HÌNH API Proxy. Để sử dụng ứng dụng 100% bằng API của bạn, vui lòng vào Cài đặt (biểu tượng bánh răng) và nhập API Key, Proxy URL.');
};
