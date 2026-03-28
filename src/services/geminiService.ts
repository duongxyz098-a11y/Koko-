import { GoogleGenAI } from '@google/genai';

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
  quizCount?: number;
  cafeCount?: number;
  npcCount?: number;
  chatMode?: string;
}

export interface NPCProfile {
  id: string;
  name: string;
  age: number;
  avatarSeed: string;
  mbti: string;
  intro: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
}

export interface CafeScenario {
  npcName: string;
  coffeeOrder: string;
  problem: string;
  options: string[];
  bestAdviceIndex: number;
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'placeholder' });

export const generateNPCs = async (
  count: number, 
  profile: UserProfile, 
  onProgress: (current: number, total: number, newItems: NPCProfile[]) => void
): Promise<void> => {
  const mockNPCs: NPCProfile[] = Array.from({ length: count }, (_, i) => ({
    id: `npc-${Date.now()}-${i}`,
    name: ['Linh', 'Hùng', 'Trang', 'Tuấn', 'Lan', 'Minh'][Math.floor(Math.random() * 6)],
    age: 18 + Math.floor(Math.random() * 10),
    avatarSeed: Math.random().toString(36).substring(7),
    mbti: ['ENFP', 'INTJ', 'INFJ', 'ESTP', 'ISTJ', 'ENTP'][Math.floor(Math.random() * 6)],
    intro: 'Rất vui được làm quen với bạn!'
  }));

  // Simulate progress
  const batchSize = 5;
  for (let i = 0; i < mockNPCs.length; i += batchSize) {
    const batch = mockNPCs.slice(i, i + batchSize);
    onProgress(i + batch.length, count, batch);
    await new Promise(resolve => setTimeout(resolve, 500));
  }
};

export const generateLoveQuiz = async (
  count: number, 
  onProgress: (current: number, total: number, newItems: QuizQuestion[]) => void
): Promise<void> => {
  const mockQuizzes: QuizQuestion[] = Array.from({ length: count }, (_, i) => ({
    question: `Câu hỏi tình yêu số ${i + 1}?`,
    options: ['Đáp án A', 'Đáp án B', 'Đáp án C', 'Đáp án D'],
    correctAnswerIndex: Math.floor(Math.random() * 4)
  }));

  onProgress(count, count, mockQuizzes);
};

export const generateCafeScenarios = async (
  count: number, 
  onProgress: (current: number, total: number, newItems: CafeScenario[]) => void
): Promise<void> => {
  const mockScenarios: CafeScenario[] = Array.from({ length: count }, (_, i) => ({
    npcName: ['Khách A', 'Khách B', 'Khách C'][Math.floor(Math.random() * 3)],
    coffeeOrder: 'Cà phê sữa đá',
    problem: 'Tôi đang gặp rắc rối trong chuyện tình cảm...',
    options: ['Khuyên nhủ', 'Lắng nghe', 'Mời thêm ly nữa'],
    bestAdviceIndex: 0
  }));

  onProgress(count, count, mockScenarios);
};

export const generateNPCResponse = async (
  npc: NPCProfile, 
  userMessage: string, 
  history: any[], 
  profile: UserProfile, 
  maxTokens?: number, 
  timeoutMinutes?: number, 
  superMode?: boolean,
  onStream?: (text: string) => void
): Promise<{ content: string, usage?: any }> => {
  const response = `Chào ${profile.name}, tôi là ${npc.name}. ${npc.intro} Bạn vừa nói: "${userMessage}". Thật thú vị!`;
  
  if (onStream) {
    for (let i = 0; i < response.length; i += 5) {
      onStream(response.substring(0, i + 5));
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  return { 
    content: response,
    usage: { total_tokens: 100, prompt_tokens: 50, completion_tokens: 50 }
  };
};

export const extractJSON = (text: string): any => {
  try {
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (match) {
      return JSON.parse(match[0]);
    }
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse JSON", e);
    return null;
  }
};
