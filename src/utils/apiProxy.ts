import { GoogleGenAI } from "@google/genai";

export interface ApiProxySettings {
  id?: string;
  name?: string;
  endpoint: string;
  apiKey: string;
  model: string;
  maxTokens?: number;
  isUnlimited?: boolean;
  timeoutMinutes?: number;
  systemPrompt?: string;
}

export const fetchAvailableModels = async (endpoint: string, apiKey: string): Promise<string[]> => {
  if (!apiKey) return [];
  
  try {
    // Try to fetch from OpenAI-compatible /models endpoint
    const response = await fetch(`${endpoint.replace(/\/+$/, '')}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      // OpenAI format: { data: [ { id: 'model-id' }, ... ] }
      if (data.data && Array.isArray(data.data)) {
        return data.data.map((m: any) => m.id);
      }
      // Some proxies return a simple array
      if (Array.isArray(data)) {
        return data.map((m: any) => typeof m === 'string' ? m : m.id || m.name);
      }
    }
  } catch (e) {
    console.error("Error fetching models from proxy:", e);
  }

  // Fallback to standard Gemini models if fetch fails or it's a direct Google API
  return [
    'gemini-3.1-pro-preview', 
    'gemini-3-flash-preview',
    'gemini-3.1-flash-lite-preview'
  ];
};

export const sendMessage = async (
  settings: ApiProxySettings, 
  messages: { role: 'user' | 'assistant' | 'system', content: string }[],
  characterInfo?: string
) => {
  if (!settings.apiKey) {
    throw new Error("Vui lòng thiết lập API Key trong phần cài đặt.");
  }

  const fullSystemInstruction = [
    settings.systemPrompt || "You are a helpful roleplay assistant.",
    characterInfo ? `\n\nCHARACTER INFORMATION:\n${characterInfo}` : ""
  ].join("\n");

  // Check if we should use direct Gemini SDK or custom proxy fetch
  const isGoogleEndpoint = settings.endpoint.includes('generativelanguage.googleapis.com') || 
                          settings.endpoint === 'https://api.openai.com/v1' || // Default placeholder
                          !settings.endpoint;

  if (isGoogleEndpoint && settings.model.startsWith('gemini')) {
    // Use Google SDK for direct Gemini calls
    const ai = new GoogleGenAI({ apiKey: settings.apiKey });
    
    const history = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const lastMessage = history.pop();
    if (!lastMessage) throw new Error("No messages to send");

    const maxTokens = settings.isUnlimited ? 1000000 : (settings.maxTokens || 30000);
    const timeoutMs = (settings.timeoutMinutes || 5) * 60 * 1000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await ai.models.generateContent({
        model: settings.model || 'gemini-3-flash-preview',
        contents: [...history, lastMessage],
        config: {
          systemInstruction: fullSystemInstruction,
          maxOutputTokens: maxTokens,
          temperature: 0.9,
        }
      });
      clearTimeout(timeoutId);
      return response.text;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`Yêu cầu bị quá thời gian sau ${settings.timeoutMinutes || 5} phút. Vui lòng thử lại hoặc tăng thời gian chờ.`);
      }
      throw error;
    }
  } else {
    // Use fetch for OpenAI-compatible proxy endpoints
    const formattedMessages = [
      { role: 'system', content: fullSystemInstruction },
      ...messages.filter(m => m.role !== 'system')
    ];

    const maxTokens = settings.isUnlimited ? undefined : (settings.maxTokens || 30000);
    const timeoutMs = (settings.timeoutMinutes || 5) * 60 * 1000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${settings.endpoint.replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.apiKey}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: settings.model,
          messages: formattedMessages,
          max_tokens: maxTokens,
          temperature: 0.9,
        })
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || "";
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`Yêu cầu bị quá thời gian sau ${settings.timeoutMinutes || 5} phút. Vui lòng thử lại hoặc tăng thời gian chờ.`);
      }
      throw error;
    }
  }
};

export const sendMessageStream = async (
  settings: ApiProxySettings, 
  messages: { role: 'user' | 'assistant' | 'system', content: string }[],
  characterInfo?: string
) => {
  if (!settings.apiKey) {
    throw new Error("Vui lòng thiết lập API Key trong phần cài đặt.");
  }

  const fullSystemInstruction = [
    settings.systemPrompt || "You are a helpful roleplay assistant.",
    characterInfo ? `\n\nCHARACTER INFORMATION:\n${characterInfo}` : ""
  ].join("\n");

  const isGoogleEndpoint = settings.endpoint.includes('generativelanguage.googleapis.com') || 
                          settings.endpoint === 'https://api.openai.com/v1' || 
                          !settings.endpoint;

  if (isGoogleEndpoint && settings.model.startsWith('gemini')) {
    const ai = new GoogleGenAI({ apiKey: settings.apiKey });
    
    const history = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const lastMessage = history.pop();
    if (!lastMessage) throw new Error("No messages to send");

    const maxTokens = settings.isUnlimited ? 1000000 : (settings.maxTokens || 30000);

    const response = await ai.models.generateContentStream({
      model: settings.model || 'gemini-3-flash-preview',
      contents: [...history, lastMessage],
      config: {
        systemInstruction: fullSystemInstruction,
        maxOutputTokens: maxTokens,
        temperature: 0.9,
      }
    });

    return response;
  } else {
    const formattedMessages = [
      { role: 'system', content: fullSystemInstruction },
      ...messages.filter(m => m.role !== 'system')
    ];

    const maxTokens = settings.isUnlimited ? undefined : (settings.maxTokens || 30000);
    const timeoutMs = (settings.timeoutMinutes || 5) * 60 * 1000;
    const controller = new AbortController();
    // For streaming, we might want a longer timeout or just timeout the initial connection
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${settings.endpoint.replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.apiKey}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: settings.model,
          messages: formattedMessages,
          stream: true,
          max_tokens: maxTokens,
          temperature: 0.9,
        })
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API Error: ${response.status} ${response.statusText}`);
      }

      return response.body;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`Yêu cầu bị quá thời gian sau ${settings.timeoutMinutes || 5} phút. Vui lòng thử lại hoặc tăng thời gian chờ.`);
      }
      throw error;
    }
  }
};


