export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface KokoPrompt {
  id: string;
  title: string;
  description: string;
  systemPrompt: string;
}

export const sendCoreMessage = async (message: string, systemPrompt?: string): Promise<string> => {
  return "This is a placeholder response.";
};

export const sendCoreMessageStream = async function* (messages: ChatMessage[], systemPrompt?: string): AsyncGenerator<string, void, unknown> {
  yield "This is a placeholder stream response.";
};
