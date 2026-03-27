import { GoogleGenAI } from '@google/genai';

export interface UserProfile {
  name: string;
  age: number;
  gender: string;
  interests: string[];
  personality: string;
}

export interface NPCProfile {
  id: string;
  name: string;
  age: number;
  gender: string;
  bio: string;
  personality: string;
  interests: string[];
  avatarUrl: string;
  matchScore: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: { id: string; text: string; trait: string }[];
}

export interface CafeScenario {
  id: string;
  title: string;
  description: string;
  options: { id: string; text: string; outcome: string }[];
}

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || 'placeholder' });

export const generateNPCs = async (userProfile: UserProfile): Promise<NPCProfile[]> => {
  return [
    {
      id: '1',
      name: 'Alex',
      age: 24,
      gender: 'Non-binary',
      bio: 'Loves art and coffee.',
      personality: 'Creative',
      interests: ['Art', 'Coffee'],
      avatarUrl: 'https://picsum.photos/seed/alex/200/200',
      matchScore: 85
    },
    {
      id: '2',
      name: 'Sam',
      age: 26,
      gender: 'Male',
      bio: 'Tech enthusiast and hiker.',
      personality: 'Adventurous',
      interests: ['Tech', 'Hiking'],
      avatarUrl: 'https://picsum.photos/seed/sam/200/200',
      matchScore: 92
    }
  ];
};

export const generateLoveQuiz = async (): Promise<QuizQuestion[]> => {
  return [
    {
      id: 'q1',
      question: 'What is your ideal date?',
      options: [
        { id: 'o1', text: 'A quiet dinner', trait: 'Introverted' },
        { id: 'o2', text: 'A wild party', trait: 'Extroverted' }
      ]
    }
  ];
};

export const generateCafeScenarios = async (): Promise<CafeScenario[]> => {
  return [
    {
      id: 's1',
      title: 'The Spilled Coffee',
      description: 'You accidentally spill coffee on someone.',
      options: [
        { id: 'o1', text: 'Apologize profusely', outcome: 'They laugh it off.' },
        { id: 'o2', text: 'Offer to buy them a new one', outcome: 'They accept and you chat.' }
      ]
    }
  ];
};

export const generateNPCResponse = async (
  npc: NPCProfile, 
  userMessage: string, 
  history?: any, 
  profile?: any, 
  ...args: any[]
): Promise<{ content: string, usage?: any }> => {
  return { content: `That's interesting! Tell me more about it.` };
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
