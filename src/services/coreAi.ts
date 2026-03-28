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

export const sendCoreMessage = async (message: string, history: ChatMessage[] = [], koko?: KokoPrompt, settings?: any): Promise<{ content: string }> => {
  return { content: "This is a placeholder response." };
};

export const sendCoreMessageStream = async (message: string, history: ChatMessage[] = [], koko?: KokoPrompt, settings?: any): Promise<Response> => {
  // Return a mock Response object that matches the expected behavior in DatingScreen.tsx
  const mockStream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const content = JSON.stringify({ name: "Mock NPC", content: "Đây là nội dung bài đăng mẫu dài trên 500 ký tự để không bị lỗi. ".repeat(10) });
      controller.enqueue(encoder.encode(content + "\n"));
      controller.close();
    }
  });
  return new Response(mockStream);
};
