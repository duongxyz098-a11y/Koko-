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

export const buildSystemPrompt = (koko: KokoPrompt): string => {
  return `Bạn đang đóng vai trò dựa trên thiết lập từ "Koko Sách Thế Giới". Dưới đây là các quy tắc cốt lõi bạn PHẢI tuân thủ tuyệt đối trong mọi hoàn cảnh:

[BỐI CẢNH / CONTEXT]
${koko.context || 'Không có bối cảnh cụ thể.'}

[QUY TẮC TUYỆT ĐỐI / ABSOLUTE RULES]
${koko.rules || 'Không có quy tắc cụ thể.'}

[ĐỘ DÀI YÊU CẦU / LENGTH]
${koko.length || 'Tùy chỉnh linh hoạt.'}

[QUY ĐỊNH OOC / OUT OF CHARACTER]
${koko.ooc || 'Không được thoát vai (OOC) dưới mọi hình thức.'}

Hãy ghi nhớ: Bạn là hiện thân của thiết lập này. Mọi lời nói, hành động đều phải tuân theo nguồn gốc trên.`.trim();
};

export const sendCoreMessage = async (
  message: string,
  history: ChatMessage[],
  koko: KokoPrompt
): Promise<string> => {
  const apiKey = localStorage.getItem('api_key');
  const apiUrl = localStorage.getItem('api_url') || 'https://api.openai.com/v1/chat/completions';
  const modelName = localStorage.getItem('model_name') || 'gpt-3.5-turbo';

  if (!apiKey) {
    throw new Error('Hệ thống thiếu API Key. Vui lòng vào Cài đặt API để thiết lập nguồn năng lượng lõi.');
  }

  const systemMessage: ChatMessage = {
    role: 'system',
    content: buildSystemPrompt(koko)
  };

  const messages = [systemMessage, ...history, { role: 'user', content: message }];

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelName,
        messages: messages,
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Lỗi kết nối API: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error: any) {
    throw new Error(error.message || 'Lỗi không xác định từ lõi hệ thống.');
  }
};
