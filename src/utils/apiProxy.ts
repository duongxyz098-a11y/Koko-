export interface ApiProxySettings {
  id?: string;
  name?: string;
  endpoint: string;
  apiKey: string;
  model: string;
  maxTokens: number;
  isUnlimited: boolean;
  timeoutMinutes: number;
}

export const getApiSettings = (): ApiProxySettings => {
  const saved = localStorage.getItem('banhnho_api_settings');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to parse API settings", e);
    }
  }
  return {
    endpoint: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-3.5-turbo',
    maxTokens: 30000,
    isUnlimited: false,
    timeoutMinutes: 5
  };
};

export const fetchAvailableModels = async (endpoint: string, apiKey: string): Promise<string[]> => {
  const cleanEndpoint = endpoint?.trim();
  const cleanApiKey = apiKey?.trim();

  if (!cleanEndpoint || !cleanApiKey) {
    throw new Error("Vui lòng nhập Endpoint và API Key trước khi lấy danh sách Model.");
  }

  const baseUrl = cleanEndpoint.endsWith('/') ? cleanEndpoint.slice(0, -1) : cleanEndpoint;
  const modelsUrl = `${baseUrl}/models`;

  const controller = new AbortController();
  // Giảm thời gian chờ xuống 8 giây để báo lỗi nhanh nếu Proxy bị treo hoặc không hỗ trợ
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(modelsUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cleanApiKey}`
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      if (response.status === 401) {
        throw new Error(`Kết nối thành công, nhưng API Key bị TỪ CHỐI (Lỗi 401). Mã Key của bạn không chính xác, đã bị khóa, hoặc không khớp với Endpoint này.\n\nChi tiết từ máy chủ: ${err.error?.message || response.statusText}`);
      }
      if (response.status === 404) {
        throw new Error(`Kết nối thành công, nhưng máy chủ Proxy này KHÔNG HỖ TRỢ tính năng tự động lấy danh sách Model (Lỗi 404). Bạn cần tự gõ tên model vào ô bên dưới.`);
      }
      throw new Error(`Lỗi từ máy chủ Proxy (${response.status}): ${err.error?.message || response.statusText}`);
    }
    const data = await response.json();
    if (data && data.data && Array.isArray(data.data)) {
      return data.data.map((m: any) => m.id);
    }
    return [];
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error("Quá thời gian chờ (8s). Proxy này phản hồi quá chậm hoặc chặn tính năng lấy danh sách model.");
    }
    console.error("Fetch models error:", error);
    throw error;
  }
};

/**
 * Gọi API Proxy với cấu hình đã lưu, hỗ trợ timeout dài và xử lý dữ liệu lớn.
 * @param systemPrompt Prompt hệ thống
 * @param userPrompt Prompt người dùng
 * @param temperature Nhiệt độ (sáng tạo)
 * @returns Nội dung trả về từ API
 */
let isApiCalling = false;

export const callApiProxy = async (
  systemPrompt: string,
  userPrompt: string,
  temperature: number = 0.7
): Promise<string> => {
  if (isApiCalling) {
    throw new Error("Hệ thống đang xử lý một yêu cầu khác. Vui lòng đợi trong giây lát để tránh quá tải.");
  }

  const settings = getApiSettings();
  const cleanEndpoint = settings.endpoint?.trim();
  const cleanApiKey = settings.apiKey?.trim();
  const cleanModel = settings.model?.trim();
  
  if (!cleanApiKey || !cleanEndpoint || !cleanModel) {
    throw new Error("Vui lòng nhập đầy đủ Endpoint, API Key và Model trong phần Cài đặt (Tab 8).");
  }

  isApiCalling = true;
  const timeoutMs = settings.timeoutMinutes * 60 * 1000;
  
  // Không dùng AbortController để tránh ngắt kết nối đột ngột khi xử lý dữ liệu lớn
  // Thay vào đó, ta dùng Promise.race để xử lý timeout ở phía frontend
  
  const maxTokens = settings.isUnlimited ? 100000 : settings.maxTokens;

  // Ép buộc model trả về văn bản thuần túy, không dùng JSON hay Code
  const enforcedSystemPrompt = `${systemPrompt}\n\nLƯU Ý QUAN TRỌNG: Trả về kết quả dưới dạng văn bản thuần túy (plain text). TUYỆT ĐỐI KHÔNG sử dụng định dạng JSON, Markdown code blocks, hay bất kỳ ngôn ngữ lập trình nào.`;

  const requestBody = {
    model: cleanModel,
    messages: [
      { role: "system", content: enforcedSystemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: temperature,
    max_tokens: maxTokens,
  };

  const baseUrl = cleanEndpoint.endsWith('/') ? cleanEndpoint.slice(0, -1) : cleanEndpoint;

  const fetchPromise = fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${cleanApiKey}`
    },
    body: JSON.stringify(requestBody)
  });

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`API Timeout: Hệ thống đã chờ quá ${settings.timeoutMinutes} phút. Vui lòng thử lại hoặc tăng thời gian chờ.`));
    }, timeoutMs);
  });

  try {
    const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Lỗi API (${response.status}): ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.choices || data.choices.length === 0 || !data.choices[0].message) {
      throw new Error("API trả về dữ liệu trống hoặc không đúng định dạng.");
    }

    const content = data.choices[0].message.content;
    
    if (!content || content.trim() === '') {
      throw new Error("API trả về nội dung rỗng.");
    }

    return content;
  } catch (error: any) {
    console.error("API Proxy Error:", error);
    throw error;
  } finally {
    isApiCalling = false;
  }
};

/**
 * Hàm tiện ích để an toàn map qua một mảng, tránh lỗi undefined.map
 */
export const safeMap = <T, U>(arr: T[] | undefined | null, callback: (item: T, index: number) => U): U[] => {
  return (arr || []).map(callback);
};
