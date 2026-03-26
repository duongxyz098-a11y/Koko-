export interface KokoChar {
  id: string;
  name: string;
  gender: string;
  avatar: string;
  background: string;
  history: string;
  opening: string;
  personality: string;
  appearance: string;
  nationality: string;
  writingStyle: string;
  systemPrompts: string[];
  toneStyles: string[];
  topP: number;
  topK: number;
  contextSize: number;
  npcs: KokoNPC[];
}

export interface KokoNPC {
  id: string;
  name: string;
  gender: string;
  bio: string;
  age: string;
  relationship: string;
}

export interface KokoUserProfile {
  id: string;
  name: string;
  age: string;
  appearance: string;
  details: string;
  personality: string;
  hobbies: string;
  mbti: string;
  zodiac: string;
  petName: string;
  nickname: string;
  color: string;
  loveStyle: string;
  avatar: string;
  cover: string;
  posts: any[];
  followers: number;
  following: number;
  stories?: { id: string, image: string, name: string }[];
}

export interface KokoSettings {
  maxTokens: number;
  timeoutMinutes: number;
  unlimited: boolean;
}
