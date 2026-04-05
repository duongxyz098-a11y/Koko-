export interface Chapter {
  id: string;
  title: string;
  content: string;
  timestamp: string;
}

export interface NPCComment {
  id: string;
  npcName: string;
  npcAvatar: string;
  npcRole: string;
  npcBackground: string;
  content: string;
  timestamp: string;
}

export interface Novel {
  id: string;
  storyName: string;
  characterName: string;
  genre: string;
  chapterLength: number;
  chapters: Chapter[];
  coverImage: string;
  editorBackgroundImage: string;
  npcGlobalBackground: string;
  lastModified: number;
  settings: {
    proxyEndpoint: string;
    proxyKey: string;
    model: string;
    isSetupComplete: boolean;
    useStreaming?: boolean;
    extremeCapacityMode?: boolean;
    maxTokens?: number;
    timeout?: number;
    fontSize?: number;
    responseHistory?: number[];
  };
  userPlot?: string;
  nextChapterLength?: number | '';
  botCharInfo?: string;
  userCharInfo?: string;
  writingPrompt?: string;
  selectedStyles?: string[];
  npcCount?: number;
  longTermMemory?: string;
  characterMemory?: string;
}
