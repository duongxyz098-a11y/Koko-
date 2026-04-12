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
  apiType?: 'openai' | 'claude' | 'gemini' | 'custom' | 'auto';
}

export const fetchAvailableModels = async (endpoint: string, apiKey: string): Promise<string[]> => {
  if (!apiKey) return [];
  
  try {
    let modelsUrl = endpoint.replace(/\/+$/, '');
    if (modelsUrl.endsWith('/chat/completions')) {
      modelsUrl = modelsUrl.replace('/chat/completions', '/models');
    } else if (modelsUrl.endsWith('/v1/messages')) {
      modelsUrl = modelsUrl.replace('/v1/messages', '/v1/models');
    } else if (!modelsUrl.endsWith('/models')) {
      modelsUrl = `${modelsUrl}/models`;
    }

    const response = await fetch(modelsUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const text = await response.text();
      console.log("RAW RESPONSE (/models):", text);
      try {
        const data = JSON.parse(text);
        if (data.data && Array.isArray(data.data)) {
          return data.data.map((m: any) => m.id);
        }
        if (Array.isArray(data)) {
          return data.map((m: any) => typeof m === 'string' ? m : m.id || m.name);
        }
      } catch (e) {
        console.error("Failed to parse models JSON:", e);
      }
    }
  } catch (e) {
    console.error("Error fetching models from proxy:", e);
  }

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

  const isGoogleEndpoint = settings.apiType === 'gemini' || 
                          (!settings.apiType && (settings.endpoint.includes('generativelanguage.googleapis.com') || 
                           settings.endpoint === 'https://api.openai.com/v1' || 
                           !settings.endpoint));

  if (isGoogleEndpoint && settings.model.startsWith('gemini')) {
    const ai = new GoogleGenAI({ apiKey: settings.apiKey });
    
    const history = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const lastMessage = history.pop();
    if (!lastMessage) throw new Error("No messages to send");

    const maxTokens = settings.isUnlimited ? 1000000 : (settings.maxTokens || 30000);
    const timeoutMs = (settings.timeoutMinutes || 5) * 60 * 1000;
    console.log("Sending message with settings:", {
      model: settings.model,
      maxTokens: maxTokens,
      timeoutMinutes: settings.timeoutMinutes,
      timeoutMs: timeoutMs
    });
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
    const formattedMessages = [
      { role: 'system', content: fullSystemInstruction },
      ...messages.filter(m => m.role !== 'system')
    ];

    const maxTokens = settings.isUnlimited ? undefined : (settings.maxTokens || 30000);
    const timeoutMs = (settings.timeoutMinutes || 5) * 60 * 1000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let fetchUrl = settings.endpoint.replace(/\/+$/, '');
    
    if (settings.apiType === 'custom') {
      fetchUrl = settings.endpoint;
    } else if (settings.apiType === 'claude' || fetchUrl.includes('anthropic') || fetchUrl.endsWith('/messages')) {
      if (!fetchUrl.endsWith('/messages')) {
        fetchUrl = `${fetchUrl}/v1/messages`;
      }
    } else if (settings.apiType === 'openai' || fetchUrl.endsWith('/chat/completions')) {
      if (!fetchUrl.endsWith('/chat/completions')) {
        fetchUrl = `${fetchUrl}/chat/completions`;
      }
    } else {
      if (!fetchUrl.endsWith('/chat/completions') && !fetchUrl.endsWith('/messages') && !fetchUrl.endsWith('/completions')) {
        fetchUrl = `${fetchUrl}/chat/completions`;
      }
    }

    try {
      const isClaude = settings.apiType === 'claude' || fetchUrl.endsWith('/messages');
      const requestBody = isClaude 
        ? {
            model: settings.model,
            messages: messages.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content })),
            system: fullSystemInstruction,
            max_tokens: maxTokens || 4096,
            temperature: 0.9,
          }
        : {
            model: settings.model,
            messages: formattedMessages,
            max_tokens: maxTokens,
            temperature: 0.9,
          };

      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.apiKey}`,
          'Content-Type': 'application/json',
          ...(isClaude ? { 'x-api-key': settings.apiKey, 'anthropic-version': '2023-06-01' } : {})
        },
        signal: controller.signal,
        body: JSON.stringify(requestBody)
      });

      clearTimeout(timeoutId);

      const rawText = await response.text();
      console.log("RAW RESPONSE:", rawText);

      if (!response.ok) {
        let errorMsg = `API Error: ${response.status} ${response.statusText}`;
        try {
          const errorData = JSON.parse(rawText);
          errorMsg = errorData.error?.message || errorMsg;
        } catch (e) {
          errorMsg += ` - ${rawText}`;
        }
        throw new Error(errorMsg);
      }

      try {
        // Handle potential SSE stream returned by mistake
        if (rawText.includes('data: ') && rawText.includes('choices')) {
          let extractedText = '';
          const lines = rawText.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
              try {
                const data = JSON.parse(trimmed.slice(6));
                if (isClaude && data.type === 'content_block_delta' && data.delta?.text) {
                  extractedText += data.delta.text;
                } else if (data.choices?.[0]?.delta?.content) {
                  extractedText += data.choices[0].delta.content;
                } else if (data.choices?.[0]?.message?.content) {
                  extractedText += data.choices[0].message.content;
                }
              } catch (e) {}
            }
          }
          if (extractedText) return extractedText;
        }

        const data = JSON.parse(rawText);
        if (isClaude) {
          return data.content?.[0]?.text || data.choices?.[0]?.message?.content || "";
        }
        
        const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.delta?.content || data.response;
        if (content) return content;
        
        // Fallback: try to find any string value that looks like the response
        return ""; 
      } catch (e) {
        // If it's not JSON and not SSE, it might be plain text
        if (!rawText.includes('{') && !rawText.includes('}')) {
          return rawText;
        }
        return "";
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`Yêu cầu bị quá thời gian sau ${settings.timeoutMinutes || 5} phút. Vui lòng thử lại hoặc tăng thời gian chờ.`);
      }
      let errorMsg = error.message || 'Lỗi khi gọi API. Vui lòng thử lại.';
      if (errorMsg === 'Failed to fetch') {
        errorMsg = 'Không thể kết nối với Proxy Endpoint. Vui lòng kiểm tra lại URL Proxy, kết nối mạng hoặc CORS settings.';
      }
      throw new Error(errorMsg);
    }
  }
};

export const sendMessageStream = async function* (
  settings: ApiProxySettings, 
  messages: { role: 'user' | 'assistant' | 'system', content: string }[],
  characterInfo?: string,
  signal?: AbortSignal
) {
  if (!settings.apiKey) {
    throw new Error("Vui lòng thiết lập API Key trong phần cài đặt.");
  }

  const fullSystemInstruction = [
    settings.systemPrompt || "You are a helpful roleplay assistant.",
    characterInfo ? `\n\nCHARACTER INFORMATION:\n${characterInfo}` : ""
  ].join("\n");

  const isGoogleEndpoint = settings.apiType === 'gemini' || 
                          (!settings.apiType && (settings.endpoint.includes('generativelanguage.googleapis.com') || 
                           settings.endpoint === 'https://api.openai.com/v1' || 
                           !settings.endpoint));

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

    for await (const chunk of response) {
      yield { text: chunk.text };
    }
    return;
  } else {
    const formattedMessages = [
      { role: 'system', content: fullSystemInstruction },
      ...messages.filter(m => m.role !== 'system')
    ];

    const maxTokens = settings.isUnlimited ? undefined : (settings.maxTokens || 30000);
    const timeoutMs = (settings.timeoutMinutes || 5) * 60 * 1000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let fetchUrl = settings.endpoint.replace(/\/+$/, '');
    
    if (settings.apiType === 'custom') {
      fetchUrl = settings.endpoint;
    } else if (settings.apiType === 'claude' || fetchUrl.includes('anthropic') || fetchUrl.endsWith('/messages')) {
      if (!fetchUrl.endsWith('/messages')) {
        fetchUrl = `${fetchUrl}/v1/messages`;
      }
    } else if (settings.apiType === 'openai' || fetchUrl.endsWith('/chat/completions')) {
      if (!fetchUrl.endsWith('/chat/completions')) {
        fetchUrl = `${fetchUrl}/chat/completions`;
      }
    } else {
      if (!fetchUrl.endsWith('/chat/completions') && !fetchUrl.endsWith('/messages') && !fetchUrl.endsWith('/completions')) {
        fetchUrl = `${fetchUrl}/chat/completions`;
      }
    }

    try {
      const isClaude = settings.apiType === 'claude' || fetchUrl.endsWith('/messages');
      const requestBody = isClaude 
        ? {
            model: settings.model,
            messages: messages.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content })),
            system: fullSystemInstruction,
            stream: true,
            max_tokens: maxTokens || 4096,
            temperature: 0.9,
          }
        : {
            model: settings.model,
            messages: formattedMessages,
            stream: true,
            max_tokens: maxTokens,
            temperature: 0.9,
          };

      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.apiKey}`,
          'Content-Type': 'application/json',
          ...(isClaude ? { 'x-api-key': settings.apiKey, 'anthropic-version': '2023-06-01' } : {})
        },
        signal: signal || controller.signal,
        body: JSON.stringify(requestBody)
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const rawText = await response.text();
        console.log("RAW RESPONSE ERROR:", rawText);
        let errorMsg = `API Error: ${response.status} ${response.statusText}`;
        try {
          const errorData = JSON.parse(rawText);
          errorMsg = errorData.error?.message || errorMsg;
        } catch (e) {
          errorMsg += ` - ${rawText}`;
        }
        throw new Error(errorMsg);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No stream body");

      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          
          if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
            try {
              const data = JSON.parse(trimmed.slice(6));
              let content = '';
              if (isClaude && data.type === 'content_block_delta' && data.delta?.text) {
                content = data.delta.text;
              } else if (data.choices?.[0]?.delta?.content) {
                content = data.choices[0].delta.content;
              } else if (data.choices?.[0]?.message?.content) {
                content = data.choices[0].message.content;
              }
              if (content) {
                yield { text: content };
              }
            } catch (e) {
              // Ignore incomplete chunks
            }
          } else if (trimmed.startsWith('{')) {
            // Fallback for non-SSE JSON responses
            try {
              const data = JSON.parse(trimmed);
              let content = '';
              if (isClaude) {
                content = data.content?.[0]?.text || '';
              } else {
                content = data.choices?.[0]?.message?.content || data.choices?.[0]?.delta?.content || '';
              }
              if (content) {
                yield { text: content };
              }
            } catch (e) {}
          }
        }
      }
      
      if (buffer.trim()) {
        try {
          const trimmed = buffer.trim();
          if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
            const data = JSON.parse(trimmed.slice(6));
            let content = '';
            if (isClaude && data.type === 'content_block_delta' && data.delta?.text) {
              content = data.delta.text;
            } else if (data.choices?.[0]?.delta?.content) {
              content = data.choices[0].delta.content;
            } else if (data.choices?.[0]?.message?.content) {
              content = data.choices[0].message.content;
            }
            if (content) yield { text: content };
          }
        } catch (e) {}
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`Yêu cầu bị quá thời gian sau ${settings.timeoutMinutes || 5} phút. Vui lòng thử lại hoặc tăng thời gian chờ.`);
      }
      let errorMsg = error.message || 'Lỗi khi gọi API. Vui lòng thử lại.';
      if (errorMsg === 'Failed to fetch') {
        errorMsg = 'Không thể kết nối với Proxy Endpoint. Vui lòng kiểm tra lại URL Proxy, kết nối mạng hoặc CORS settings.';
      }
      throw new Error(errorMsg);
    }
  }
};



