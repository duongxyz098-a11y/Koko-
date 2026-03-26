import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Plus, 
  Save, 
  Settings, 
  Image as ImageIcon, 
  Heart, 
  MessageCircle, 
  ChevronRight, 
  ChevronLeft,
  Send,
  Trash2,
  BookOpen,
  Sparkles,
  User,
  Bot
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { compressImage } from '../utils/imageUtils';
import { getAllStories, saveStory, deleteStory as deleteStoryFromDB } from '../utils/db';

interface KikokoChapter {
  id: string;
  title: string;
  content: string;
  npcComments?: {
    id: string;
    author: string;
    avatar: string;
    text: string;
    type: 'npc' | 'bot' | 'user';
  }[];
  images: {
    top: string;
    middle: string;
    bottom: string;
    heart: string;
    butterfly: string;
  };
  createdAt: number;
}

interface ApiSettings {
  apiKey: string;
  proxyEndpoint: string;
  model: string;
  maxTokens: number;
  timeout: number; // in minutes
  isUnlimited: boolean;
  responseHistory?: number[];
  nextChars?: string;
  nextCharCount?: number;
}

interface KikokoStory {
  id: string;
  title: string;
  plot: string;
  botChar: string;
  userChar: string;
  prompt: string;
  memory?: string;
  style: string;
  chapters: KikokoChapter[];
  background: string;
  charLimit: number;
  tokenLimit: number;
  targetCharCount?: number;
  createdAt: number;
}

const LOADING_MESSAGES = [
  "Lạch cạch... Lạch cạch... AI đang gõ phím...",
  "Đang dệt mộng, chờ chút nhennn~",
  "Kikoko đang tìm ý tưởng mới...",
  "Đang pha trà cho AI, chờ tí nhé...",
  "Sách Thế Giới đang xoay chuyển...",
  "Đang viết tiếp chương mới, hồi hộp quá...",
  "Đừng rời mắt nhé, sắp xong rồi!"
];

export default function KikokoNovelScreen({ onBack }: { onBack: () => void }) {
  const [stories, setStories] = useState<KikokoStory[]>([]);

  useEffect(() => {
    const loadStories = async () => {
      const savedStories = await getAllStories();
      if (savedStories.length > 0) {
        setStories(savedStories);
      } else {
        // Migration: Try to load from old localStorage if IndexedDB is empty
        const savedIds = localStorage.getItem('kikoko_story_ids');
        if (savedIds) {
          try {
            const ids = JSON.parse(savedIds);
            const migratedStories = ids.map((id: string) => {
              const savedStory = localStorage.getItem(`kikoko_story_${id}`);
              return savedStory ? JSON.parse(savedStory) : null;
            }).filter(Boolean);
            
            // Save to IndexedDB
            for (const story of migratedStories) {
              await saveStory(story);
            }
            setStories(migratedStories);
            
            // Cleanup localStorage
            localStorage.removeItem('kikoko_story_ids');
            ids.forEach((id: string) => localStorage.removeItem(`kikoko_story_${id}`));
          } catch (e) {
            console.error('Migration failed:', e);
          }
        }
      }
    };
    loadStories();
  }, []);
  const [currentStoryId, setCurrentStoryId] = useState<string | null>(null);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState('');
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [loadingMessageIdx, setLoadingMessageIdx] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      interval = setInterval(() => {
        setLoadingMessageIdx(prev => (prev + 1) % LOADING_MESSAGES.length);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showNPCs, setShowNPCs] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [activeImageSlot, setActiveImageSlot] = useState<keyof KikokoChapter['images'] | 'background' | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [npcCount, setNpcCount] = useState(500);
  const [customNpcCount, setCustomNpcCount] = useState('500');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [streamingContent, setStreamingContent] = useState('');
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [galleryBackground, setGalleryBackground] = useState<string>(() => {
    return localStorage.getItem('kikoko_gallery_background') || '';
  });
  
  const [apiSettings, setApiSettings] = useState<ApiSettings>(() => {
    const saved = localStorage.getItem('kikoko_api_settings');
    return saved ? JSON.parse(saved) : {
      apiKey: '',
      proxyEndpoint: 'https://api.openai.com/v1/chat/completions',
      model: 'gpt-3.5-turbo',
      maxTokens: 30000,
      timeout: 5,
      isUnlimited: false
    };
  });

  const [activeSettingsTab, setActiveSettingsTab] = useState<'general' | 'api'>('general');

  const fileInputRefs = {
    top: useRef<HTMLInputElement>(null),
    middle: useRef<HTMLInputElement>(null),
    bottom: useRef<HTMLInputElement>(null),
    heart: useRef<HTMLInputElement>(null),
    butterfly: useRef<HTMLInputElement>(null),
    background: useRef<HTMLInputElement>(null),
    galleryBackground: useRef<HTMLInputElement>(null),
  };

  const currentStory = stories.find(s => s.id === currentStoryId);
  const currentChapter = currentStory?.chapters[currentChapterIndex];

  useEffect(() => {
    // Cleanup old localStorage data if it exists
    const savedIds = localStorage.getItem('kikoko_story_ids');
    if (savedIds) {
      try {
        const ids = JSON.parse(savedIds);
        localStorage.removeItem('kikoko_story_ids');
        ids.forEach((id: string) => localStorage.removeItem(`kikoko_story_${id}`));
      } catch (e) {
        console.error('Cleanup failed:', e);
      }
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('kikoko_api_settings', JSON.stringify(apiSettings));
    } catch (e) {
      console.error('Failed to save API settings to localStorage:', e);
    }
  }, [apiSettings]);

  useEffect(() => {
    try {
      localStorage.setItem('kikoko_gallery_background', galleryBackground);
    } catch (e) {
      console.error('Failed to save gallery background to localStorage:', e);
    }
  }, [galleryBackground]);

  useEffect(() => {
    setCurrentChapterIndex(0);
  }, [currentStoryId]);

  const createNewStory = () => {
    const newStory: KikokoStory = {
      id: Date.now().toString(),
      title: 'Tiểu thuyết Kikoko mới',
      plot: '',
      botChar: '',
      userChar: '',
      prompt: '',
      style: 'Lãng mạn, nhẹ nhàng',
      chapters: [{
        id: 'ch1',
        title: 'Chương 1',
        content: 'Bắt đầu câu chuyện của bạn...',
        images: {
          top: '',
          middle: '',
          bottom: '',
          heart: '',
          butterfly: ''
        },
        createdAt: Date.now()
      }],
      background: '',
      charLimit: 1000000000,
      tokenLimit: 1000000000,
      createdAt: Date.now()
    };
    setStories([newStory, ...stories]);
    saveStory(newStory);
    setCurrentStoryId(newStory.id);
    setCurrentChapterIndex(0);
    setIsEditing(true);
  };

  const updateStory = (updates: Partial<KikokoStory>) => {
    if (!currentStoryId) return;
    const updatedStories = stories.map(s => s.id === currentStoryId ? { ...s, ...updates } : s);
    setStories(updatedStories);
    const updatedStory = updatedStories.find(s => s.id === currentStoryId);
    if (updatedStory) saveStory(updatedStory);
  };

  const updateChapter = (updates: Partial<KikokoChapter>) => {
    if (!currentStoryId || !currentStory) return;
    const newChapters = [...currentStory.chapters];
    const chapterToUpdate = newChapters[currentChapterIndex];
    if (!chapterToUpdate) return;
    
    newChapters[currentChapterIndex] = { ...chapterToUpdate, ...updates };
    updateStory({ chapters: newChapters });
  };

  const addChapter = () => {
    if (!currentStory) return;
    const newChapter: KikokoChapter = {
      id: Date.now().toString(),
      title: `Chương ${currentStory.chapters.length + 1}`,
      content: '',
      images: {
        top: '',
        middle: '',
        bottom: '',
        heart: '',
        butterfly: ''
      },
      createdAt: Date.now()
    };
    updateStory({ chapters: [...currentStory.chapters, newChapter] });
    setCurrentChapterIndex(currentStory.chapters.length);
  };

  const handleImageUpload = (type: keyof KikokoChapter['images'] | 'background') => {
    setActiveImageSlot(type);
    setImageUrlInput('');
    setShowImageModal(true);
  };

  const triggerFileInput = () => {
    if (!activeImageSlot) return;
    if (activeImageSlot === 'background') {
      fileInputRefs.background.current?.click();
    } else {
      fileInputRefs[activeImageSlot].current?.click();
    }
    setShowImageModal(false);
  };

  const handleUrlSubmit = () => {
    if (!activeImageSlot || !imageUrlInput.trim()) return;
    
    if (activeImageSlot === 'background') {
      updateStory({ background: imageUrlInput.trim() });
    } else {
      if (!currentChapter) return;
      updateChapter({
        images: {
          ...currentChapter.images,
          [activeImageSlot]: imageUrlInput.trim()
        }
      });
    }
    setShowImageModal(false);
    setImageUrlInput('');
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: keyof KikokoChapter['images'] | 'background' | 'galleryBackground') => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        // Compress images to a smaller size for gallery background
        const compressed = await compressImage(file, 600, 600, 0.5);
        
        if (type === 'galleryBackground') {
          setGalleryBackground(compressed);
        } else if (type === 'background') {
          // Keep background slightly larger
          const compressedBg = await compressImage(file, 1000, 1000, 0.6);
          updateStory({ background: compressedBg });
        } else {
          if (!currentChapter) return;
          // Keep chapter images smaller
          const compressedChapter = await compressImage(file, 800, 800, 0.6);
          updateChapter({
            images: {
              ...currentChapter.images,
              [type]: compressedChapter
            }
          });
        }
      } catch (e) {
        console.error("Compression failed", e);
      }
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  };

  const fetchModels = async () => {
    if (!apiSettings.proxyEndpoint || !apiSettings.apiKey) {
      alert('Vui lòng nhập đầy đủ Proxy Endpoint và API Key.');
      return;
    }
    
    setIsFetchingModels(true);
    try {
      let apiUrl = apiSettings.proxyEndpoint.trim();
      if (!apiUrl.startsWith('http')) apiUrl = 'https://' + apiUrl;
      if (apiUrl.endsWith('/')) apiUrl = apiUrl.slice(0, -1);
      
      const modelsUrl = apiUrl.endsWith('/chat/completions') 
        ? apiUrl.replace('/chat/completions', '/models')
        : apiUrl.endsWith('/v1') 
          ? `${apiUrl}/models`
          : apiUrl.includes('/v1/')
            ? `${apiUrl.split('/v1/')[0]}/v1/models`
            : `${apiUrl}/v1/models`;

      const response = await fetch(modelsUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiSettings.apiKey}`,
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const rawModels = data.data || data.models || [];
        const modelIds = rawModels.map((m: any) => (typeof m === 'string' ? m : m.id));
        setAvailableModels(modelIds);
        if (modelIds.length > 0) {
          alert(`Đã tải thành công ${modelIds.length} model.`);
        } else {
          alert('Không tìm thấy model nào trong phản hồi từ API.');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Lỗi API: ${response.status}`);
      }
    } catch (err: any) {
      console.error('Error fetching models:', err);
      alert(`Lỗi khi tải danh sách model: ${err.message}`);
    } finally {
      setIsFetchingModels(false);
    }
  };

  const generateContent = async () => {
    if (!currentStory || isGenerating) return;
    
    if (!apiSettings.apiKey) {
      alert('Vui lòng cài đặt API Key trong phần Cài đặt hệ thống');
      return;
    }

    setIsGenerating(true);
    setStreamingContent('');
    
    // HỆ THỐNG THỜI GIAN THÔNG MINH (Adaptive Timeout)
    const baseComplexity = (currentStory.charLimit || 1000) / 100;
    const avgResponseTime = (apiSettings.responseHistory || []).length > 0 
      ? apiSettings.responseHistory!.reduce((a, b) => a + b, 0) / apiSettings.responseHistory!.length 
      : 30;
    
    let maxTokensToUse = apiSettings.nextCharCount 
      ? Math.ceil(apiSettings.nextCharCount * 1.5) 
      : (apiSettings.isUnlimited ? 100000 : apiSettings.maxTokens);

    let timeoutLimit = 2 * 60 * 1000; // 2 minutes
    if (maxTokensToUse >= 100000) {
        timeoutLimit = 5 * 60 * 1000; // 5 minutes
    }
    
    // Use user defined timeout if available
    if (apiSettings.timeout) {
       timeoutLimit = apiSettings.timeout * 60 * 1000;
    }

    const calculatedTimeout = Math.min(
      timeoutLimit, 
      Math.max(30 * 1000, (avgResponseTime * baseComplexity * 2) * 1000)
    );
    
    setEstimatedTime(Math.ceil(calculatedTimeout / 60000));

    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), calculatedTimeout);

    try {
      const previousChapters = currentStory.chapters.slice(0, currentChapterIndex);
      const previousContext = previousChapters.length > 0 
        ? `\n\n[NỘI DUNG CÁC CHƯƠNG TRƯỚC ĐỂ THAM KHẢO VÀ NỐI TIẾP MẠCH TRUYỆN]\n${previousChapters.map((ch, i) => `--- Chương ${i + 1} ---\n${ch.content}`).join('\n\n')}`
        : '';

      const prompt = `Hãy viết tiếp chương này cho tiểu thuyết "${currentStory.title}".
      Cốt truyện: ${currentStory.plot}
      Nhân vật Bot: ${currentStory.botChar}
      Nhân vật User: ${currentStory.userChar}
      Phong cách: ${currentStory.style}
      Prompt bổ sung: ${currentStory.prompt}
      ${currentStory.memory ? `Ghi nhớ tóm tắt các chương trước: ${currentStory.memory}` : ''}
      ${previousContext}
      
      [NỘI DUNG CHƯƠNG HIỆN TẠI ĐANG VIẾT DỞ]
      ${currentChapter?.content}
      
      Yêu cầu: 
      1. Viết tiếp câu chuyện một cách tự nhiên, lôi cuốn, liền mạch với các chương trước. 
      2. BẮT BUỘC: Viết đúng độ dài khoảng ${apiSettings.nextCharCount || currentStory.charLimit} ký tự. KHÔNG ĐƯỢC VIẾT NGẮN HƠN HOẶC DÀI HƠN QUÁ NHIỀU.
      3. TRẢ VỀ KẾT QUẢ LÀ VĂN BẢN THUẦN, KHÔNG CÓ CẤU TRÚC JSON, CODE HAY BẤT KỲ KÝ TỰ ĐẶC BIỆT NÀO KHÁC.
      4. Nếu có thể, hãy tạo ra khoảng 10-20 bình luận ngắn từ các NPC (người qua đường, bạn bè...) đan xen trong câu chuyện hoặc ở cuối chương theo định dạng: [NPC: Tên]: Nội dung bình luận.
      ${apiSettings.nextChars ? `5. BẮT ĐẦU VĂN BẢN BẰNG CHÍNH XÁC CÁC KÝ TỰ SAU: "${apiSettings.nextChars}". Đừng thêm bất kỳ ký tự nào trước nó.` : ''}`;

      let apiUrl = apiSettings.proxyEndpoint.trim();
      if (!apiUrl.startsWith('http')) apiUrl = 'https://' + apiUrl;
      if (apiUrl.endsWith('/')) apiUrl = apiUrl.slice(0, -1);
      
      const completionUrl = apiUrl.endsWith('/chat/completions') 
        ? apiUrl 
        : apiUrl.endsWith('/v1') 
          ? `${apiUrl}/chat/completions`
          : apiUrl.includes('/v1/')
            ? `${apiUrl.split('/v1/')[0]}/v1/chat/completions`
            : `${apiUrl}/v1/chat/completions`;

      console.log('Calling API:', completionUrl, 'with model:', apiSettings.model);

      const response = await fetch(completionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiSettings.apiKey}`,
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({
          model: apiSettings.model,
          messages: [
            { role: 'system', content: 'Bạn là một nhà văn viết tiểu thuyết chuyên nghiệp. Hãy viết tiếp câu chuyện dựa trên yêu cầu của người dùng.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: maxTokensToUse,
          temperature: 0.7,
          stream: true
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Lỗi API: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      let generatedText = '';
      let buffer = '';

      if (!reader) throw new Error('Proxy không hỗ trợ Streaming.');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('data: ') && trimmedLine !== 'data: [DONE]') {
            try {
              const data = JSON.parse(trimmedLine.slice(6));
              if (data.choices?.[0]?.delta?.content) {
                generatedText += data.choices[0].delta.content;
                setStreamingContent(generatedText);
              }
            } catch (e) {}
          }
        }
      }

      const text = generatedText;

      if (text) {
        // Ghi nhớ thời gian phản hồi
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        const complexity = (currentStory.charLimit || 1000) / 100;
        const timePerUnit = duration / complexity;
        
        const newHistory = [...(apiSettings.responseHistory || []), timePerUnit].slice(-10);
        setApiSettings(prev => ({ ...prev, responseHistory: newHistory }));
        // Parse NPC comments if any
        const npcRegex = /\[NPC: (.*?)\]: (.*?)(?=\n|\[NPC:|$)/g;
        const comments: any[] = [];
        let match;
        let cleanText = text;
        const maxNewComments = 100;

        while ((match = npcRegex.exec(text)) !== null && comments.length < maxNewComments) {
          if (match[1] && match[2]) {
            comments.push({
              id: Math.random().toString(36).substr(2, 9),
              author: match[1].trim(),
              avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(match[1].trim())}`,
              text: match[2].trim(),
              type: 'npc'
            });
            cleanText = cleanText.replace(match[0], '');
          }
        }

        const newContent = (currentChapter?.content || '') + '\n\n' + cleanText.trim();
        const existingComments = currentChapter?.npcComments || [];
        
        updateChapter({ 
          content: newContent,
          npcComments: [...existingComments, ...comments]
        });
      }
    } catch (error: any) {
      console.error(error);
      if (error.name === 'AbortError') {
        alert('Thời gian chờ quá lâu. Hệ thống đã tự động ngắt kết nối để tránh treo máy.');
      } else {
        alert(`Lỗi: ${error.message || 'Không thể kết nối với API'}`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const summarizeChapter = async () => {
    if (!currentChapter || isSummarizing) return;
    setIsSummarizing(true);
    setSummary('');
    
    try {
      const prompt = `Hãy tóm tắt nội dung chương truyện sau đây một cách ngắn gọn, súc tích, tập trung vào các sự kiện chính và diễn biến tâm lý nhân vật để làm ghi nhớ cho chương tiếp theo:
      Tiêu đề: ${currentChapter.title}
      Nội dung: ${currentChapter.content}
      
      Yêu cầu:
      1. Tóm tắt dưới 500 ký tự.
      2. KHÔNG TRẢ VỀ JSON, CHỈ TRẢ VỀ VĂN BẢN THUẦN.`;

      let apiUrl = apiSettings.proxyEndpoint.trim();
      if (!apiUrl.startsWith('http')) apiUrl = 'https://' + apiUrl;
      if (apiUrl.endsWith('/')) apiUrl = apiUrl.slice(0, -1);
      
      const completionUrl = apiUrl.endsWith('/chat/completions') 
        ? apiUrl 
        : `${apiUrl}/v1/chat/completions`;

      const response = await fetch(completionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiSettings.apiKey}`
        },
        body: JSON.stringify({
          model: apiSettings.model,
          messages: [
            { role: 'system', content: 'Bạn là một trợ lý tóm tắt tiểu thuyết chuyên nghiệp.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 500,
        }),
      });

      if (!response.ok) throw new Error('Lỗi API');

      const data = await response.json();
      const summaryText = data.choices[0].message.content;
      setSummary(summaryText);
      setShowSummaryModal(true);
    } catch (error) {
      console.error(error);
      alert('Không thể tóm tắt chương này.');
    } finally {
      setIsSummarizing(false);
    }
  };

  const generateNpcInteractions = async () => {
    if (!currentStory || isGenerating) return;
    setIsGenerating(true);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), apiSettings.timeout * 60 * 1000);

    try {
      const prompt = `Hãy tạo ra ${npcCount} bình luận ngắn (khoảng 10-20 chữ mỗi câu) từ các NPC (người qua đường, độc giả, nhân vật phụ) về chương truyện này:
      Tiêu đề: ${currentChapter?.title}
      Nội dung: ${currentChapter?.content?.substring(0, 1000)}...
      
      Yêu cầu:
      1. Các bình luận phải đa dạng, khen chê, tò mò, hào hứng.
      2. Định dạng mỗi dòng: [NPC: Tên]: Nội dung.
      3. KHÔNG TRẢ VỀ JSON, CHỈ TRẢ VỀ VĂN BẢN THUẦN.`;

      const response = await fetch(apiSettings.proxyEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiSettings.apiKey}`
        },
        body: JSON.stringify({
          model: apiSettings.model,
          messages: [
            { role: 'user', content: prompt }
          ],
          max_tokens: apiSettings.isUnlimited ? 100000 : apiSettings.maxTokens,
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error('Lỗi API');

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;

      if (text) {
        const npcRegex = /\[NPC: (.*?)\]: (.*?)(?=\n|\[NPC:|$)/g;
        const comments: any[] = [];
        let match;
        const maxNewComments = 200;

        while ((match = npcRegex.exec(text)) !== null && comments.length < maxNewComments) {
          if (match[1] && match[2]) {
            comments.push({
              id: Math.random().toString(36).substr(2, 9),
              author: match[1].trim(),
              avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(match[1].trim())}`,
              text: match[2].trim(),
              type: 'npc'
            });
          }
        }

        const existingComments = currentChapter?.npcComments || [];
        updateChapter({ npcComments: [...existingComments, ...comments] });
        setShowNPCs(false);
      }
    } catch (error: any) {
      console.error(error);
      alert('Lỗi khi tạo tương tác NPC.');
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteStory = (id: string) => {
    setStories(stories.filter(s => s.id !== id));
    deleteStoryFromDB(id);
    setDeleteConfirmId(null);
  };

  return (
    <div className="h-full w-full relative overflow-hidden">
      <AnimatePresence mode="wait">
        {!currentStoryId ? (
          <motion.div 
            key="library"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#FAF9F6] flex flex-col"
            style={{ 
              backgroundImage: galleryBackground ? `url(${galleryBackground})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            <div className="p-6 flex items-center justify-between border-b border-[#EACFD5] bg-white/80 backdrop-blur-md">
              <button onClick={onBack} className="p-2 hover:bg-white rounded-full transition-colors">
                <ArrowLeft size={24} className="text-[#555555]" />
              </button>
              <h1 className="text-2xl font-serif italic text-[#555555]">Kikoko Novel</h1>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'application/json';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                          try {
                            const data = JSON.parse(e.target?.result as string);
                            setStories(data);
                          } catch (e) {
                            alert('Tệp tin không hợp lệ.');
                          }
                        };
                        reader.readAsText(file);
                      }
                    };
                    input.click();
                  }}
                  className="p-2 text-[#F9C6D4] hover:bg-pink-50 rounded-full transition-colors"
                  title="Nhập dữ liệu (Khôi phục)"
                >
                  <BookOpen size={24} />
                </button>
                <button 
                  onClick={() => {
                    const data = JSON.stringify(stories);
                    const blob = new Blob([data], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'kikoko_backup.json';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="p-2 text-[#F9C6D4] hover:bg-pink-50 rounded-full transition-colors"
                  title="Xuất dữ liệu (Sao lưu)"
                >
                  <Save size={24} />
                </button>
                <button 
                  onClick={() => fileInputRefs.galleryBackground.current?.click()} 
                  className="p-2 text-[#F9C6D4] hover:bg-pink-50 rounded-full transition-colors"
                  title="Thay đổi ảnh nền trang trưng bày"
                >
                  <ImageIcon size={24} />
                </button>
                <button 
                  onClick={() => setShowGuide(true)} 
                  className="p-2 text-[#F9C6D4] hover:bg-pink-50 rounded-full transition-colors"
                  title="Hướng dẫn sử dụng"
                >
                  <BookOpen size={24} />
                </button>
                <button onClick={createNewStory} className="p-2 bg-[#F9C6D4] text-white rounded-full shadow-lg hover:scale-105 transition-transform">
                  <Plus size={24} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 gap-6">
              {(stories || []).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4">
                  <BookOpen size={64} strokeWidth={1} />
                  <p>Chưa có tiểu thuyết nào. Hãy tạo mới!</p>
                </div>
              ) : (
                (stories || []).map(story => (
                  <motion.div 
                    key={story.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => setCurrentStoryId(story.id)}
                    className="bg-white rounded-2xl p-4 shadow-sm border border-[#EACFD5] cursor-pointer hover:shadow-md transition-shadow flex gap-4"
                  >
                    <div className="w-24 h-32 bg-[#FAF9F6] rounded-lg flex items-center justify-center border border-dashed border-[#EACFD5] overflow-hidden">
                      {story.chapters[0]?.images.top ? (
                        <img src={story.chapters[0].images.top} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <BookOpen size={32} className="text-[#EACFD5]" />
                      )}
                    </div>
                    <div className="flex-1 flex flex-col justify-between py-1">
                      <div>
                        <h3 className="text-lg font-serif font-bold text-[#555555] line-clamp-1">{story.title}</h3>
                        <p className="text-sm text-[#777777] line-clamp-2 mt-1 italic">{story.plot || 'Chưa có cốt truyện...'}</p>
                      </div>
                      <div className="flex items-center justify-between text-xs text-[#777777]">
                        <span>{story.chapters.length} chương</span>
                        <span>{new Date(story.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmId(story.id);
                      }}
                      className="p-2 text-red-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="editor"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#FAF9F6] flex flex-col overflow-hidden"
            style={{ 
              backgroundImage: currentStory?.background ? `url(${currentStory.background})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
      {/* Loading Overlay */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white/20 backdrop-blur-[2px] z-[200] flex flex-col items-center justify-center gap-4 pointer-events-none"
          >
            <div className="pointer-events-auto w-16 h-16 border-4 border-[#F9C6D4] border-t-transparent rounded-full animate-spin shadow-lg" />
            <div className="pointer-events-auto text-center space-y-2">
              <p className="text-xl font-serif font-bold text-[#F9C6D4] animate-pulse">Kikoko đang dệt mộng...</p>
              <p className="text-sm text-[#777777]">Vui lòng đợi trong giây lát, nội dung đang được tải xuống</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="z-10 p-4 flex items-center justify-between bg-white/80 backdrop-blur-sm border-b border-[#EACFD5]">
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentStoryId(null)} className="p-2 hover:bg-white rounded-full transition-colors">
            <ArrowLeft size={20} className="text-[#555555]" />
          </button>
          <span className="font-serif italic text-[#555555] truncate max-w-[150px]">{currentStory.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSettings(true)} className="p-2 hover:bg-white rounded-full transition-colors">
            <Settings size={20} className="text-[#555555]" />
          </button>
          <button onClick={() => setIsEditing(!isEditing)} className="p-2 bg-[#F9C6D4] text-white rounded-lg px-4 text-sm font-bold flex items-center gap-2 shadow-sm active:scale-95 transition-all">
            {isEditing ? <><Save size={16} /> Lưu</> : <><Sparkles size={16} /> Sửa</>}
          </button>
        </div>
      </div>

      {/* Main Content Area - Responsive Container */}
      <div className="flex-1 relative overflow-auto p-2 md:p-4 flex justify-center custom-scrollbar">
        <div className="w-full max-w-[1080px] bg-white/90 shadow-2xl rounded-3xl overflow-hidden flex flex-col md:flex-row relative" style={{ minHeight: 'fit-content' }}>
          
          {/* Left Column (Text Area) - 65% */}
          <div className="w-full md:w-[65%] p-4 md:p-12 flex flex-col gap-6 md:gap-8">
            {/* Title Block */}
            <div className="h-[80px] md:h-[160px] flex items-center gap-4">
              {isEditing ? (
                <input 
                  value={currentChapter?.title}
                  onChange={(e) => updateChapter({ title: e.target.value })}
                  className="w-full text-2xl md:text-6xl font-serif font-bold text-[#555555] bg-transparent border-b border-[#F9C6D4] outline-none tracking-[1px] md:tracking-[2px]"
                  placeholder="Tiêu đề chương..."
                />
              ) : (
                <h2 className="text-2xl md:text-6xl font-serif font-bold text-[#555555] tracking-[1px] md:tracking-[2px] flex items-center gap-4">
                  {currentChapter?.title}
                  <span className="text-xl md:text-2xl">🌸</span>
                </h2>
              )}
            </div>

            {/* Text Content */}
            <div className="flex-1 min-h-[300px] relative">
              {isGenerating && (
                <div className="absolute inset-0 z-50 bg-white/40 backdrop-blur-[1px] flex flex-col items-center justify-center overflow-y-auto">
                  <div className="bg-white/90 backdrop-blur-md p-8 m-4 rounded-[2.5rem] shadow-2xl border border-pink-100 flex flex-col items-center gap-4 max-w-xs text-center">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-pink-100 border-t-[#DB2777] rounded-full animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Sparkles size={20} className="text-[#DB2777] animate-pulse" />
                      </div>
                    </div>
                    <div>
                      <p className="text-[#DB2777] font-bold text-sm animate-pulse">{LOADING_MESSAGES[loadingMessageIdx]}</p>
                      <p className="text-[10px] text-stone-400 mt-1">
                        {estimatedTime ? `Dự kiến hoàn thành trong ${estimatedTime} phút` : 'Đang khởi tạo kết nối...'}
                      </p>
                    </div>
                    <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden mt-2">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        transition={{ duration: (estimatedTime || 1) * 60, ease: "linear" }}
                        className="h-full bg-gradient-to-r from-[#DB2777] to-[#BE185D]"
                      />
                    </div>
                  </div>
                </div>
              )}
              {isEditing ? (
                <textarea 
                  value={currentChapter?.content || streamingContent || ''}
                  onChange={(e) => updateChapter({ content: e.target.value })}
                  className="w-full h-full text-lg md:text-2xl font-serif text-[#555555] leading-[1.6] md:leading-[1.8] bg-transparent outline-none resize-none"
                  placeholder="Viết nội dung ở đây..."
                />
              ) : (
                <div className="text-lg md:text-2xl font-serif text-[#555555] leading-[1.6] md:leading-[1.8] whitespace-pre-wrap">
                  {currentChapter?.content || streamingContent || ''}
                </div>
              )}
            </div>

            {/* NPC Comments Area */}
            {currentChapter?.npcComments && currentChapter.npcComments.length > 0 && (
              <div className="mt-8 space-y-4 border-t border-[#EACFD5] pt-8">
                <h3 className="text-xl font-serif font-bold text-[#F9C6D4] flex items-center gap-2">
                  <MessageCircle size={20} /> Bình luận từ NPC ({currentChapter.npcComments.length})
                </h3>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {(currentChapter.npcComments || []).slice(-100).map((comment) => (
                    <motion.div 
                      key={comment.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex gap-3 items-start"
                    >
                      <img src={comment.avatar} className="w-10 h-10 rounded-full bg-pink-50 border border-pink-100" />
                      <div className="flex-1">
                        <div className="bg-[#FAF9F6] p-3 rounded-2xl rounded-tl-none border border-[#EACFD5] shadow-sm">
                          <p className="text-xs font-bold text-[#F9C6D4] mb-1">{comment.author}</p>
                          <p className="text-sm text-[#555555] leading-relaxed">{comment.text}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Collage (Left) - Responsive */}
            <div className="mt-auto flex flex-wrap items-end gap-4 md:gap-6 pb-6 md:pb-12">
              {/* Heart Frame */}
              <div 
                onClick={() => isEditing && handleImageUpload('heart')}
                className="w-full max-w-[300px] aspect-[4/3] bg-[#FAF9F6] rounded-[30px] md:rounded-[40px] border-2 border-[#F9C6D4] overflow-hidden relative cursor-pointer group"
              >
                {currentChapter?.images.heart ? (
                  <img src={currentChapter.images.heart} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-[#F9C6D4]">
                    <Heart className="w-10 h-10 md:w-12 md:h-12" fill="currentColor" />
                  </div>
                )}
                {isEditing && (
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <ImageIcon className="text-white" />
                  </div>
                )}
              </div>

              {/* Butterfly */}
              <div 
                onClick={() => isEditing && handleImageUpload('butterfly')}
                className="w-[120px] md:w-[160px] h-[90px] md:h-[120px] bg-[#FAF9F6] rounded-2xl border border-[#EACFD5] overflow-hidden relative cursor-pointer group"
              >
                {currentChapter?.images.butterfly ? (
                  <img src={currentChapter.images.butterfly} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-[#EACFD5]">
                    <Sparkles className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                )}
                {isEditing && (
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <ImageIcon className="text-white" />
                  </div>
                )}
              </div>
            </div>

            {/* Text Decor Boxes */}
            <div className="flex flex-wrap gap-2 md:gap-4 mb-4 md:mb-8">
              {['will', 'our', 'reunite?'].map((word, i) => (
                <div key={i} className="bg-[#FAF9F6] border border-[#EACFD5] px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-[#777777] font-serif text-base md:text-xl">
                  {word}
                </div>
              ))}
            </div>
          </div>

          {/* Right Column (Image Stack) - 35% */}
          <div className="w-full md:w-[35%] p-4 md:p-6 border-t md:border-t-0 md:border-l border-[#EACFD5] flex flex-col gap-4 md:gap-6 bg-[#FAF9F6]/50">
            {/* Top Image */}
            <div 
              onClick={() => isEditing && handleImageUpload('top')}
              className="w-full h-[200px] md:h-[300px] bg-white rounded-xl shadow-sm border border-[#EACFD5] overflow-hidden relative cursor-pointer group"
            >
              {currentChapter?.images.top ? (
                <img src={currentChapter.images.top} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                  <ImageIcon className="w-7 h-7 md:w-8 md:h-8" />
                </div>
              )}
              {isEditing && (
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <ImageIcon className="text-white" />
                </div>
              )}
            </div>

            {/* Middle Image (Person) */}
            <div 
              onClick={() => isEditing && handleImageUpload('middle')}
              className="w-full h-[300px] md:h-[420px] bg-white rounded-xl shadow-sm border border-[#EACFD5] overflow-hidden relative cursor-pointer group"
            >
              {currentChapter?.images.middle ? (
                <img src={currentChapter.images.middle} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                  <User className="w-10 h-10 md:w-12 md:h-12" />
                </div>
              )}
              {/* Heart Sticker Overlay */}
              <div className="absolute top-4 right-4 text-[#F9C6D4] drop-shadow-md">
                <Heart className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" />
              </div>
              {isEditing && (
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <ImageIcon className="text-white" />
                </div>
              )}
            </div>

            {/* Bottom Image */}
            <div 
              onClick={() => isEditing && handleImageUpload('bottom')}
              className="w-full h-[180px] md:h-[260px] bg-white rounded-xl shadow-sm border border-[#EACFD5] overflow-hidden relative cursor-pointer group"
            >
              {currentChapter?.images.bottom ? (
                <img src={currentChapter.images.bottom} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                  <ImageIcon className="w-7 h-7 md:w-8 md:h-8" />
                </div>
              )}
              {isEditing && (
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <ImageIcon className="text-white" />
                </div>
              )}
            </div>

            {/* NPC Interaction Button */}
            <div className="mt-auto flex flex-col gap-4">
              <button 
                onClick={() => setShowNPCs(true)}
                className="w-full py-3 md:py-4 bg-[#F9C6D4] text-white rounded-xl shadow-lg flex items-center justify-center gap-2 hover:scale-105 transition-transform"
              >
                <Heart className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" />
                <span className="font-bold text-sm md:text-base">Tương tác NPC</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Controls */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-4 z-50">
        <button 
          onClick={generateContent}
          disabled={isGenerating}
          className="w-14 h-14 bg-white text-[#F9C6D4] rounded-full shadow-xl flex items-center justify-center hover:scale-110 transition-transform disabled:opacity-50"
        >
          {isGenerating ? (
            <div className="w-6 h-6 border-2 border-[#F9C6D4] border-t-transparent rounded-full animate-spin" />
          ) : (
            <Sparkles size={28} />
          )}
        </button>
        <button 
          onClick={addChapter}
          className="w-14 h-14 bg-[#F9C6D4] text-white rounded-full shadow-xl flex items-center justify-center hover:scale-110 transition-transform"
        >
          <Plus size={28} />
        </button>
      </div>

      {/* Chapter Navigation */}
      <div className="p-4 bg-white/80 backdrop-blur-sm border-t border-[#EACFD5] flex items-center justify-between z-10">
        <button 
          disabled={currentChapterIndex === 0}
          onClick={() => setCurrentChapterIndex(currentChapterIndex - 1)}
          className="flex items-center gap-1 text-[#555555] disabled:opacity-30"
        >
          <ChevronLeft size={20} />
          <span>Trước</span>
        </button>
        <span className="text-sm font-medium text-[#777777]">
          Chương {currentChapterIndex + 1} / {currentStory.chapters.length}
        </span>
        <button 
          onClick={summarizeChapter}
          disabled={isSummarizing}
          className="text-xs font-bold text-[#F9C6D4] hover:text-[#F9C6D4]/80 transition-colors"
        >
          {isSummarizing ? 'Đang tóm tắt...' : 'Tóm tắt'}
        </button>
        <button 
          disabled={currentChapterIndex === currentStory.chapters.length - 1}
          onClick={() => setCurrentChapterIndex(currentChapterIndex + 1)}
          className="flex items-center gap-1 text-[#555555] disabled:opacity-30"
        >
          <span>Sau</span>
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Summary Modal */}
      <AnimatePresence>
        {showSummaryModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 space-y-4"
            >
              <h2 className="text-xl font-serif font-bold text-[#777777]">Tóm tắt chương</h2>
              <p className="text-[#555555] bg-[#FAF9F6] p-4 rounded-xl border border-[#EACFD5]">{summary}</p>
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => {
                    const newMemory = currentStory.memory ? `${currentStory.memory}\n\n[Chương ${currentChapterIndex + 1}]: ${summary}` : `[Chương ${currentChapterIndex + 1}]: ${summary}`;
                    updateStory({ memory: newMemory });
                    alert('Đã lưu vào Ghi nhớ tóm tắt!');
                    setShowSummaryModal(false);
                  }}
                  className="w-full py-3 bg-[#F9C6D4] text-white rounded-xl font-bold hover:bg-[#F9C6D4]/90 transition-colors"
                >
                  Lưu vào Ghi nhớ truyện
                </button>
                <div className="flex gap-2">
                  <button 
                    onClick={() => { navigator.clipboard.writeText(summary); alert('Đã sao chép!'); }}
                    className="flex-1 py-3 bg-white border border-[#F9C6D4] text-[#F9C6D4] rounded-xl font-bold hover:bg-[#FAF9F6] transition-colors"
                  >
                    Sao chép
                  </button>
                  <button 
                    onClick={() => setShowSummaryModal(false)}
                    className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-colors"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-[#EACFD5] flex items-center justify-between bg-[#FAF9F6]">
                <div className="flex gap-4">
                  <button 
                    onClick={() => setActiveSettingsTab('general')}
                    className={`text-lg font-serif font-bold transition-colors ${activeSettingsTab === 'general' ? 'text-[#F9C6D4]' : 'text-[#777777]'}`}
                  >
                    Cài đặt chung
                  </button>
                  <button 
                    onClick={() => setActiveSettingsTab('api')}
                    className={`text-lg font-serif font-bold transition-colors ${activeSettingsTab === 'api' ? 'text-[#F9C6D4]' : 'text-[#777777]'}`}
                  >
                    Hệ thống API
                  </button>
                </div>
                <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-white rounded-full transition-colors">
                  <ArrowLeft size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {activeSettingsTab === 'general' ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-[#777777] uppercase tracking-wider">Tên tiểu thuyết</label>
                      <input 
                        value={currentStory.title}
                        onChange={(e) => updateStory({ title: e.target.value })}
                        className="w-full p-3 bg-[#FAF9F6] border border-[#EACFD5] rounded-xl outline-none focus:border-[#F9C6D4] transition-colors"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-[#777777] uppercase tracking-wider">Cốt truyện mở đầu</label>
                      <textarea 
                        value={currentStory.plot}
                        onChange={(e) => updateStory({ plot: e.target.value })}
                        className="w-full p-3 bg-[#FAF9F6] border border-[#EACFD5] rounded-xl outline-none focus:border-[#F9C6D4] transition-colors h-24 resize-none"
                        placeholder="Nhập phần mở đầu cốt truyện..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-[#777777] uppercase tracking-wider flex items-center gap-2">
                          <Bot size={14} /> Nhân vật Bot
                        </label>
                        <input 
                          value={currentStory.botChar}
                          onChange={(e) => updateStory({ botChar: e.target.value })}
                          className="w-full p-3 bg-[#FAF9F6] border border-[#EACFD5] rounded-xl outline-none focus:border-[#F9C6D4] transition-colors"
                          placeholder="Tên, tính cách..."
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-[#777777] uppercase tracking-wider flex items-center gap-2">
                          <User size={14} /> Nhân vật User
                        </label>
                        <input 
                          value={currentStory.userChar}
                          onChange={(e) => updateStory({ userChar: e.target.value })}
                          className="w-full p-3 bg-[#FAF9F6] border border-[#EACFD5] rounded-xl outline-none focus:border-[#F9C6D4] transition-colors"
                          placeholder="Tên, vai trò..."
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-[#777777] uppercase tracking-wider">Phong cách viết / Prompt</label>
                      <textarea 
                        value={currentStory.prompt}
                        onChange={(e) => updateStory({ prompt: e.target.value })}
                        className="w-full p-3 bg-[#FAF9F6] border border-[#EACFD5] rounded-xl outline-none focus:border-[#F9C6D4] transition-colors h-20 resize-none"
                        placeholder="VD: Viết theo ngôi thứ nhất, giọng văn u buồn..."
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-[#777777] uppercase tracking-wider flex items-center gap-2">
                        Ghi nhớ tóm tắt (Memory)
                        <span className="text-xs font-normal text-gray-400 normal-case">Giúp AI nhớ các sự kiện quan trọng</span>
                      </label>
                      <textarea 
                        value={currentStory.memory || ''}
                        onChange={(e) => updateStory({ memory: e.target.value })}
                        className="w-full p-3 bg-[#FAF9F6] border border-[#EACFD5] rounded-xl outline-none focus:border-[#F9C6D4] transition-colors h-24 resize-none"
                        placeholder="Dán tóm tắt các chương trước vào đây để AI nhớ mạch truyện..."
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-[#777777] uppercase tracking-wider">Giới hạn ký tự</label>
                        <input 
                          type="number"
                          value={currentStory.charLimit}
                          onChange={(e) => updateStory({ charLimit: parseInt(e.target.value) })}
                          className="w-full p-3 bg-[#FAF9F6] border border-[#EACFD5] rounded-xl outline-none focus:border-[#F9C6D4] transition-colors"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-[#777777] uppercase tracking-wider">Giới hạn Token</label>
                        <input 
                          type="number"
                          value={currentStory.tokenLimit}
                          onChange={(e) => updateStory({ tokenLimit: parseInt(e.target.value) })}
                          className="w-full p-3 bg-[#FAF9F6] border border-[#EACFD5] rounded-xl outline-none focus:border-[#F9C6D4] transition-colors"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-[#777777] uppercase tracking-wider">Mục tiêu ký tự</label>
                        <input 
                          type="number"
                          value={currentStory.targetCharCount || ''}
                          onChange={(e) => updateStory({ targetCharCount: parseInt(e.target.value) })}
                          className="w-full p-3 bg-[#FAF9F6] border border-[#EACFD5] rounded-xl outline-none focus:border-[#F9C6D4] transition-colors"
                          placeholder="Không bắt buộc"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-[#777777] uppercase tracking-wider">Hình nền ứng dụng</label>
                      <div className="flex gap-2">
                        <input 
                          value={currentStory.background}
                          onChange={(e) => updateStory({ background: e.target.value })}
                          className="flex-1 p-3 bg-[#FAF9F6] border border-[#EACFD5] rounded-xl outline-none focus:border-[#F9C6D4] transition-colors"
                          placeholder="Dán link ảnh nền..."
                        />
                        <button 
                          onClick={() => handleImageUpload('background')}
                          className="p-3 bg-white border border-[#EACFD5] rounded-xl hover:bg-[#FAF9F6] transition-colors"
                        >
                          <ImageIcon size={20} />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-[#777777] uppercase tracking-wider">API Key (Proxy/Direct)</label>
                      <input 
                        type="password"
                        value={apiSettings.apiKey}
                        onChange={(e) => setApiSettings({ ...apiSettings, apiKey: e.target.value })}
                        className="w-full p-3 bg-[#FAF9F6] border border-[#EACFD5] rounded-xl outline-none focus:border-[#F9C6D4] transition-colors"
                        placeholder="sk-..."
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-[#777777] uppercase tracking-wider">Proxy Endpoint</label>
                      <input 
                        value={apiSettings.proxyEndpoint}
                        onChange={(e) => setApiSettings({ ...apiSettings, proxyEndpoint: e.target.value })}
                        className="w-full p-3 bg-[#FAF9F6] border border-[#EACFD5] rounded-xl outline-none focus:border-[#F9C6D4] transition-colors"
                        placeholder="https://api.openai.com/v1/chat/completions"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-[#777777] uppercase tracking-wider">Số lượng ký tự mong muốn (Char Count)</label>
                      <input 
                        type="number"
                        value={apiSettings.nextCharCount || ''}
                        onChange={(e) => setApiSettings({ ...apiSettings, nextCharCount: parseInt(e.target.value) || undefined })}
                        className="w-full p-3 bg-[#FAF9F6] border border-[#EACFD5] rounded-xl outline-none focus:border-[#F9C6D4] transition-colors"
                        placeholder="Ví dụ: 1000"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-[#777777] uppercase tracking-wider">Ký tự bắt đầu (Next Chars)</label>
                      <input 
                        value={apiSettings.nextChars || ''}
                        onChange={(e) => setApiSettings({ ...apiSettings, nextChars: e.target.value })}
                        className="w-full p-3 bg-[#FAF9F6] border border-[#EACFD5] rounded-xl outline-none focus:border-[#F9C6D4] transition-colors"
                        placeholder="Ví dụ: 'Cô ấy nói: '"
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-bold text-[#777777] uppercase tracking-wider">Chọn Model</label>
                        <button 
                          onClick={fetchModels} 
                          disabled={isFetchingModels}
                          className={`text-[10px] font-bold flex items-center gap-1 transition-all ${isFetchingModels ? 'text-gray-400' : 'text-[#DB2777] hover:underline'}`}
                        >
                          {isFetchingModels ? (
                            <>
                              <div className="w-2 h-2 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                              Đang tải...
                            </>
                          ) : (
                            <>
                              <Sparkles size={10} /> Làm mới
                            </>
                          )}
                        </button>
                      </div>
                      <div className="flex overflow-x-auto gap-3 pb-2 custom-scrollbar snap-x">
                        {availableModels.length === 0 ? (
                          <div className="w-full p-4 border-2 border-dashed border-gray-100 rounded-xl flex flex-col items-center justify-center text-gray-400 gap-1">
                            <Bot size={20} />
                            <span className="text-[10px]">Chưa có model. Hãy nhấn "Làm mới"</span>
                          </div>
                        ) : (
                          availableModels.map(m => (
                            <button 
                              key={m}
                              onClick={() => setApiSettings({ ...apiSettings, model: m })}
                              className={`flex-shrink-0 snap-start px-4 py-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 min-w-[120px] ${apiSettings.model === m ? 'border-[#DB2777] bg-pink-50' : 'border-[#EACFD5] bg-white'}`}
                            >
                              <Bot size={16} className={apiSettings.model === m ? 'text-[#DB2777]' : 'text-gray-400'} />
                              <span className={`text-[10px] font-bold truncate w-full text-center ${apiSettings.model === m ? 'text-[#DB2777]' : 'text-gray-600'}`}>{m}</span>
                            </button>
                          ))
                        )}
                      </div>
                      <input 
                        type="text" 
                        placeholder="Hoặc nhập tên Model thủ công..." 
                        value={apiSettings.model} 
                        onChange={(e) => setApiSettings({ ...apiSettings, model: e.target.value })} 
                        className="w-full p-3 bg-[#FAF9F6] border border-[#EACFD5] rounded-xl outline-none focus:border-[#F9C6D4] transition-colors text-sm" 
                      />
                    </div>

                    <div className="space-y-4">
                      <label className="text-sm font-bold text-[#777777] uppercase tracking-wider">Cấu hình Token (Output)</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[30000, 50000, 70000].map(val => (
                          <button 
                            key={val}
                            onClick={() => setApiSettings({ ...apiSettings, maxTokens: val, isUnlimited: false })}
                            className={`p-2 rounded-lg border text-xs font-bold transition-all ${apiSettings.maxTokens === val && !apiSettings.isUnlimited ? 'bg-[#F9C6D4] text-white border-[#F9C6D4]' : 'bg-white text-[#777777] border-[#EACFD5]'}`}
                          >
                            {val.toLocaleString()}
                          </button>
                        ))}
                      </div>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative">
                          <input 
                            type="checkbox"
                            checked={apiSettings.isUnlimited}
                            onChange={(e) => setApiSettings({ ...apiSettings, isUnlimited: e.target.checked })}
                            className="sr-only"
                          />
                          <div className={`w-10 h-6 rounded-full transition-colors ${apiSettings.isUnlimited ? 'bg-[#F9C6D4]' : 'bg-gray-200'}`} />
                          <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${apiSettings.isUnlimited ? 'translate-x-4' : ''}`} />
                        </div>
                        <span className="text-sm font-bold text-[#555555]">Không giới hạn (Max Token Vĩnh Viễn)</span>
                      </label>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-[#777777] uppercase tracking-wider">Thời gian chờ tối đa (Phút)</label>
                      <div className="flex items-center gap-4">
                        <input 
                          type="range"
                          min="1"
                          max="30"
                          value={apiSettings.timeout}
                          onChange={(e) => setApiSettings({ ...apiSettings, timeout: parseInt(e.target.value) })}
                          className="flex-1 accent-[#F9C6D4]"
                        />
                        <span className="w-12 text-center font-bold text-[#F9C6D4]">{apiSettings.timeout}m</span>
                      </div>
                      <p className="text-[10px] text-gray-400 italic">* Tăng thời gian chờ nếu bạn yêu cầu nội dung cực dài (100k+ token)</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 bg-[#FAF9F6] border-t border-[#EACFD5]">
                <button 
                  onClick={() => setShowSettings(false)}
                  className="w-full py-4 bg-[#F9C6D4] text-white rounded-xl font-bold shadow-lg hover:scale-[1.02] transition-transform"
                >
                  {activeSettingsTab === 'general' ? 'Lưu cài đặt' : 'Lưu hệ thống API'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NPC Interaction Modal */}
      <AnimatePresence>
        {showNPCs && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-end justify-center"
            onClick={() => setShowNPCs(false)}
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white w-full max-w-lg rounded-t-[40px] p-8 flex flex-col gap-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto" />
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-serif font-bold text-[#555555]">Tương tác NPC</h2>
                <p className="text-[#777777]">Chọn số lượng NPC tham gia bình luận câu chuyện của bạn</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setNpcCount(500)}
                  className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${npcCount === 500 ? 'border-[#F9C6D4] bg-[#F9C6D4]/10' : 'border-gray-100 bg-gray-50'}`}
                >
                  <span className="text-2xl font-bold text-[#F9C6D4]">500</span>
                  <span className="text-sm text-[#777777]">NPC</span>
                </button>
                <button 
                  onClick={() => setNpcCount(5000)}
                  className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${npcCount === 5000 ? 'border-[#F9C6D4] bg-[#F9C6D4]/10' : 'border-gray-100 bg-gray-50'}`}
                >
                  <span className="text-2xl font-bold text-[#F9C6D4]">5000</span>
                  <span className="text-sm text-[#777777]">NPC</span>
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-[#777777] uppercase tracking-wider">Tự điều chỉnh số lượng</label>
                <div className="flex gap-2">
                  <input 
                    type="number"
                    value={customNpcCount}
                    onChange={(e) => setCustomNpcCount(e.target.value)}
                    className="flex-1 p-4 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-[#F9C6D4] transition-colors"
                    placeholder="Nhập số lượng..."
                  />
                  <button 
                    onClick={() => setNpcCount(parseInt(customNpcCount) || 0)}
                    className="px-6 bg-[#F9C6D4] text-white rounded-xl font-bold"
                  >
                    Áp dụng
                  </button>
                </div>
              </div>

              <div className="bg-[#FAF9F6] p-4 rounded-2xl border border-[#EACFD5] flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-[#F9C6D4] shadow-sm">
                  <MessageCircle size={24} />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-[#555555] italic">"Đang có {npcCount.toLocaleString()} NPC đang theo dõi và bình luận về chương này..."</p>
                </div>
              </div>

              <button 
                onClick={generateNpcInteractions}
                disabled={isGenerating}
                className="w-full py-4 bg-[#F9C6D4] text-white rounded-xl font-bold shadow-lg hover:scale-[1.02] transition-transform mt-4 disabled:opacity-50"
              >
                {isGenerating ? 'Đang xử lý dữ liệu lớn...' : 'Bắt đầu tương tác'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden File Inputs */}
      <div className="hidden">
        <input type="file" accept="image/*" ref={fileInputRefs.top} onChange={(e) => onFileChange(e, 'top')} />
        <input type="file" accept="image/*" ref={fileInputRefs.middle} onChange={(e) => onFileChange(e, 'middle')} />
        <input type="file" accept="image/*" ref={fileInputRefs.bottom} onChange={(e) => onFileChange(e, 'bottom')} />
        <input type="file" accept="image/*" ref={fileInputRefs.heart} onChange={(e) => onFileChange(e, 'heart')} />
        <input type="file" accept="image/*" ref={fileInputRefs.butterfly} onChange={(e) => onFileChange(e, 'butterfly')} />
        <input type="file" accept="image/*" ref={fileInputRefs.background} onChange={(e) => onFileChange(e, 'background')} />
        <input type="file" accept="image/*" ref={fileInputRefs.galleryBackground} onChange={(e) => onFileChange(e, 'galleryBackground')} />
      </div>

      {/* Guidebook Modal */}
      <AnimatePresence>
        {showGuide && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-md z-[300] flex items-center justify-center p-4"
            onClick={() => setShowGuide(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#FAF9F6] w-full max-w-4xl h-[85vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col border border-[#FBCFE8]"
              onClick={e => e.stopPropagation()}
            >
              {/* Guide Header */}
              <div className="p-6 border-b border-[#EACFD5] flex items-center justify-between bg-white/80 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#F9C6D4] text-white rounded-xl">
                    <BookOpen size={24} />
                  </div>
                  <h2 className="text-xl font-serif font-bold text-[#555555]">Sổ Tay Hướng Dẫn Kikoko</h2>
                </div>
                <button onClick={() => setShowGuide(false)} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
                  <ArrowLeft size={24} className="text-[#555555]" />
                </button>
              </div>

              {/* Guide Content */}
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-12">
                {/* Introduction */}
                <div className="text-center space-y-4 max-w-2xl mx-auto">
                  <p className="text-[#DB2777] font-serif italic text-lg">"Nơi những giấc mơ được dệt nên từ những gam màu dịu dàng nhất..."</p>
                  <p className="text-stone-500 text-sm leading-relaxed">Chào mừng bạn đến với cẩm nang thiết kế Kikoko. Dưới đây là các thông số chuẩn để tạo nên những trang truyện mang phong cách "Aesthetic Airy" đặc trưng.</p>
                </div>

                {/* 1. KHUNG TỔNG */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-[#F3B4C2] pb-2">
                    <span className="text-2xl">🖼️</span>
                    <h3 className="text-lg font-bold text-[#2E2E2E] uppercase tracking-widest font-serif">1. KHUNG TỔNG (Canvas chuẩn)</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div className="space-y-4 text-[#6E6A6A] text-sm">
                      <p>• <span className="font-bold text-[#2E2E2E]">Tỉ lệ:</span> 1:1 (Vuông)</p>
                      <p>• <span className="font-bold text-[#2E2E2E]">Kích thước:</span> 1080 × 1080 px hoặc 1242 × 1242 px (HD)</p>
                      <p>• <span className="font-bold text-[#2E2E2E]">Padding:</span> 60–80 px mỗi cạnh (giữ khoảng trắng airy)</p>
                      <p>• <span className="font-bold text-[#2E2E2E]">Background:</span> #FAF9F6 chủ đạo</p>
                      <p>• <span className="font-bold text-[#2E2E2E]">Overlay:</span> #F9C6D4 (Opacity 5–8%)</p>
                    </div>
                    <div className="aspect-square bg-[#FAF9F6] rounded-3xl border border-[#F9C6D4]/20 shadow-inner flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-[#F9C6D4]/8" />
                      <div className="w-3/4 h-3/4 border-2 border-dashed border-[#F3B4C2]/30 rounded-2xl flex items-center justify-center text-[#F3B4C2] text-xs font-bold">
                        1080 x 1080 (1:1)
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. KHUNG TRÁI */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-[#F3B4C2] pb-2">
                    <span className="text-2xl">🎀</span>
                    <h3 className="text-lg font-bold text-[#2E2E2E] uppercase tracking-widest font-serif">2. KHUNG TRÁI (ẢNH CHÍNH)</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div className="order-2 md:order-1 flex justify-center py-8">
                      <div className="relative w-[240px] h-[260px]">
                        {/* Pink Layer Behind */}
                        <div className="absolute -top-[15px] -left-[15px] w-full h-full bg-[#F3B4C2] opacity-25 rounded-[28px]" />
                        {/* Main Image Frame */}
                        <div className="absolute inset-0 bg-white rounded-[28px] shadow-[0_8px_20px_rgba(0,0,0,0.06)] border border-stone-100 flex items-center justify-center overflow-hidden">
                          <ImageIcon size={48} className="text-[#F9C6D4]" />
                        </div>
                      </div>
                    </div>
                    <div className="order-1 md:order-2 space-y-4 text-[#6E6A6A] text-sm">
                      <p>• <span className="font-bold text-[#2E2E2E]">Kích thước:</span> ~ 480 × 520 px</p>
                      <p>• <span className="font-bold text-[#2E2E2E]">Bo góc:</span> 20–28 px</p>
                      <p>• <span className="font-bold text-[#2E2E2E]">Shadow:</span> 0 8px 20px rgba(0,0,0,0.06)</p>
                      <p>• <span className="font-bold text-[#2E2E2E]">Lớp giấy hồng phía sau:</span> Lệch -15px X / -15px Y, Màu #F3B4C2 (25% Opacity)</p>
                    </div>
                  </div>
                </div>

                {/* 3. KHUNG PHẢI */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-[#F3B4C2] pb-2">
                    <span className="text-2xl">✨</span>
                    <h3 className="text-lg font-bold text-[#2E2E2E] uppercase tracking-widest font-serif">3. KHUNG PHẢI (TEXT + CONTENT)</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    <div className="space-y-6 p-8 bg-white rounded-[40px] border border-stone-100 shadow-sm">
                      <h4 className="text-[48px] font-serif font-bold text-[#2E2E2E] leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>Tiêu đề</h4>
                      <p className="text-[20px] text-[#6E6A6A] leading-[1.6] font-serif">Nội dung câu chuyện được trình bày một cách thanh thoát, dễ đọc với khoảng cách dòng rộng rãi...</p>
                    </div>
                    <div className="space-y-4 text-[#6E6A6A] text-sm">
                      <p>• <span className="font-bold text-[#2E2E2E]">Chiều rộng:</span> ~ 420–480 px (Căn lề trái)</p>
                      <p>• <span className="font-bold text-[#2E2E2E]">Tiêu đề:</span> Size 48–56 px, Màu #2E2E2E (Font: Playfair Display)</p>
                      <p>• <span className="font-bold text-[#2E2E2E]">Nội dung:</span> Size 20–24 px, Line-height 1.6–1.8, Màu #6E6A6A</p>
                    </div>
                  </div>
                </div>

                {/* 4. TAG / LABEL BOX */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-[#F3B4C2] pb-2">
                    <span className="text-2xl">🏷️</span>
                    <h3 className="text-lg font-bold text-[#2E2E2E] uppercase tracking-widest font-serif">4. TAG / LABEL BOX</h3>
                  </div>
                  <div className="flex flex-wrap gap-4 items-center">
                    <div className="h-[40px] px-5 bg-[#E6DDD8] rounded-[10px] flex items-center justify-center text-white font-bold text-[16px]">
                      iuo and me
                    </div>
                    <div className="h-[40px] px-5 bg-[#D8C9C6] rounded-[10px] flex items-center justify-center text-[#333] font-bold text-[16px]">
                      sweet story
                    </div>
                    <div className="flex-1 text-[#6E6A6A] text-sm ml-4">
                      <p>• <span className="font-bold text-[#2E2E2E]">Kích thước:</span> Cao 36–44 px, Bo góc 10 px</p>
                      <p>• <span className="font-bold text-[#2E2E2E]">Màu nền:</span> #E6DDD8 hoặc #D8C9C6</p>
                      <p>• <span className="font-bold text-[#2E2E2E]">Text:</span> Size 16–18 px, Màu #fff hoặc #333</p>
                    </div>
                  </div>
                </div>

                {/* 5. TEXT NHỎ / FOOTER */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-[#F3B4C2] pb-2">
                    <span className="text-2xl">🧸</span>
                    <h3 className="text-lg font-bold text-[#2E2E2E] uppercase tracking-widest font-serif">5. TEXT NHỎ / FOOTER</h3>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="p-4 bg-white rounded-2xl border border-stone-100 flex-1 text-right">
                      <p className="text-[#A8A3A3] text-[14px] font-serif italic">Design by Kikoko • 2026</p>
                    </div>
                    <div className="space-y-4 text-[#6E6A6A] text-sm flex-1">
                      <p>• <span className="font-bold text-[#2E2E2E]">Size:</span> 14–16 px</p>
                      <p>• <span className="font-bold text-[#2E2E2E]">Màu:</span> #A8A3A3</p>
                      <p>• <span className="font-bold text-[#2E2E2E]">Vị trí:</span> Bottom center hoặc right</p>
                    </div>
                  </div>
                </div>

                {/* 6. PALETTE CHUẨN */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-[#F3B4C2] pb-2">
                    <span className="text-2xl">🎨</span>
                    <h3 className="text-lg font-bold text-[#2E2E2E] uppercase tracking-widest font-serif">6. PALETTE CHUẨN</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { hex: '#F9C6D4', name: 'Chính 1' },
                      { hex: '#F3B4C2', name: 'Chính 2' },
                      { hex: '#FAF9F6', name: 'Nền 1' },
                      { hex: '#FFFFFF', name: 'Nền 2' },
                      { hex: '#E6DDD8', name: 'Neutral 1' },
                      { hex: '#D8C9C6', name: 'Neutral 2' },
                      { hex: '#EAE3E1', name: 'Neutral 3' },
                    ].map(color => (
                      <div key={color.hex} className="space-y-2">
                        <div className="h-16 rounded-2xl shadow-sm border border-stone-100" style={{ backgroundColor: color.hex }} />
                        <div className="text-center">
                          <p className="text-[10px] font-bold text-stone-400 uppercase">{color.name}</p>
                          <p className="text-xs font-mono text-stone-600">{color.hex}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 7. GRID CĂN CHUẨN */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-[#F3B4C2] pb-2">
                    <span className="text-2xl">📐</span>
                    <h3 className="text-lg font-bold text-[#2E2E2E] uppercase tracking-widest font-serif">7. GRID CĂN CHUẨN</h3>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm space-y-4">
                    <div className="flex h-20 gap-[40px]">
                      <div className="w-[55%] bg-[#F9C6D4]/10 rounded-xl flex items-center justify-center text-[10px] font-bold text-[#F3B4C2] uppercase">Trái: 55%</div>
                      <div className="w-[45%] bg-stone-50 rounded-xl flex items-center justify-center text-[10px] font-bold text-stone-300 uppercase">Phải: 45%</div>
                    </div>
                    <div className="text-[#6E6A6A] text-sm">
                      <p>• <span className="font-bold text-[#2E2E2E]">Layout:</span> 2 cột (Trái 55% / Phải 45%)</p>
                      <p>• <span className="font-bold text-[#2E2E2E]">Gap giữa 2 khung:</span> 40–60 px</p>
                    </div>
                  </div>
                </div>

                {/* Footer Info */}
                <div className="pt-8 text-center">
                  <p className="text-[#A8A3A3] text-sm font-serif italic">Design Guide by Kikoko • 2026</p>
                </div>
              </div>

              {/* Guide Footer */}
              <div className="p-6 bg-white border-t border-[#EACFD5] flex justify-center">
                <button 
                  onClick={() => setShowGuide(false)}
                  className="px-12 py-3 bg-[#F9C6D4] text-white rounded-full font-bold shadow-lg hover:scale-105 transition-transform"
                >
                  Đã hiểu
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-md z-[500] flex items-center justify-center p-6"
            onClick={() => setDeleteConfirmId(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden p-8 flex flex-col items-center text-center gap-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
                <Trash2 size={40} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-serif font-bold text-[#555555]">Xóa tiểu thuyết?</h3>
                <p className="text-sm text-[#777777]">Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa không?</p>
              </div>
              <div className="flex w-full gap-3">
                <button 
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                >
                  Hủy
                </button>
                <button 
                  onClick={() => deleteStory(deleteConfirmId)}
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-200"
                >
                  Xác nhận
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Selection Modal */}
      <AnimatePresence>
        {showImageModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-md z-[400] flex items-center justify-center p-6"
            onClick={() => setShowImageModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden p-8 flex flex-col gap-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="text-center space-y-2">
                <h3 className="text-xl font-serif font-bold text-[#555555]">Chọn hình ảnh</h3>
                <p className="text-sm text-[#777777]">Bạn có thể tải ảnh từ máy hoặc dán link ảnh trực tiếp</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#777777] uppercase tracking-wider">Dán link ảnh</label>
                  <div className="flex gap-2">
                    <input 
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      className="flex-1 p-3 bg-[#FAF9F6] border border-[#EACFD5] rounded-xl outline-none focus:border-[#F9C6D4] transition-colors text-sm"
                      placeholder="https://example.com/image.jpg"
                    />
                    <button 
                      onClick={handleUrlSubmit}
                      className="px-4 bg-[#F9C6D4] text-white rounded-xl font-bold text-sm shadow-sm active:scale-95 transition-all"
                    >
                      Lưu
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-400">Hoặc</span></div>
                </div>

                <button 
                  onClick={triggerFileInput}
                  className="w-full py-4 bg-white border-2 border-dashed border-[#F9C6D4] text-[#F9C6D4] rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-pink-50 transition-colors active:scale-[0.98]"
                >
                  <ImageIcon size={20} />
                  Tải ảnh từ thiết bị
                </button>
              </div>

              <button 
                onClick={() => setShowImageModal(false)}
                className="w-full py-3 text-gray-400 font-medium text-sm hover:text-gray-600 transition-colors"
              >
                Hủy bỏ
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
