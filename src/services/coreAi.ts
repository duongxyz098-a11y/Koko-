import { sendMessage, sendMessageStream, ApiProxySettings } from '../utils/apiProxy';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface KokoPrompt {
  id?: string;
  title: string;
  description?: string;
  systemPrompt?: string;
  context?: string;
  rules?: string;
  length?: string;
  ooc?: string;
}

export const sendCoreMessage = async (
  message: string, 
  history: ChatMessage[] = [], 
  koko?: KokoPrompt, 
  settings?: any,
  apiSettings?: ApiProxySettings
): Promise<{ content: string }> => {
  const systemInstruction = koko ? [
    koko.systemPrompt,
    koko.context,
    koko.rules,
    koko.length,
    koko.ooc
  ].filter(Boolean).join("\n") : "";

  const messages = [...history, { role: 'user', content: message } as ChatMessage];
  
  const response = await sendMessage(
    apiSettings || { endpoint: '', apiKey: '', model: '', systemPrompt: '', maxTokens: 3000 },
    messages,
    systemInstruction
  );

  return { content: response };
};

export const sendCoreMessageStream = async (
  message: string, 
  history: ChatMessage[] = [], 
  koko?: KokoPrompt, 
  settings?: any,
  apiSettings?: ApiProxySettings
): Promise<Response> => {
  const systemInstruction = koko ? [
    koko.systemPrompt,
    koko.context,
    koko.rules,
    koko.length,
    koko.ooc
  ].filter(Boolean).join("\n") : "";

  const messages = [...history, { role: 'user', content: message } as ChatMessage];

  const stream = await sendMessageStream(
    apiSettings || { endpoint: '', apiKey: '', model: '', systemPrompt: '', maxTokens: 3000 },
    messages,
    systemInstruction
  );

  // If it's a Gemini stream, we need to convert it to a Response
  if (stream && typeof (stream as any).stream === 'object') {
    const readable = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of (stream as any).stream) {
            const text = chunk.text();
            controller.enqueue(encoder.encode(text));
          }
          controller.close();
        } catch (e) {
          controller.error(e);
        }
      }
    });
    return new Response(readable);
  }

  // If it's already a ReadableStream (from fetch)
  return new Response(stream as ReadableStream);
};
