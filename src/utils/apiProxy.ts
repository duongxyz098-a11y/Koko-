export interface ApiProxySettings {
  id?: string;
  name?: string;
  endpoint: string;
  apiKey: string;
  model: string;
  maxTokens?: number;
  isUnlimited?: boolean;
  timeoutMinutes?: number;
}

export const fetchAvailableModels = async (endpoint: string, apiKey: string): Promise<string[]> => {
  return ['gemini-3.1-pro-preview', 'gemini-3-flash-preview'];
};


