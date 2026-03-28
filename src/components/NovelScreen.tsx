import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, 
  Send, 
  BookOpen, 
  User, 
  Sparkles, 
  ChevronLeft, 
  Plus, 
  Trash2, 
  Image as ImageIcon, 
  Save,
  Library,
  X,
  Menu,
  ArrowLeft,
  Type,
  Heart,
  Rabbit,
  MessageSquare,
  Users,
  Book,
  Bot
} from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, doc, getDocs, setDoc, deleteDoc, onSnapshot, query } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

import { compressImage } from '../utils/imageUtils';

interface Chapter {
  id: string;
  title: string;
  content: string;
  timestamp: string;
}

interface NPCComment {
  id: string;
  npcName: string;
  npcAvatar: string;
  npcRole: string;
  npcBackground: string;
  content: string;
  timestamp: string;
}

interface Novel {
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
    responseHistory?: number[];
  };
  userPlot?: string;
  nextChapterLength?: number | '';
  botCharInfo?: string;
  userCharInfo?: string;
  writingPrompt?: string;
  npcCount?: number;
}

interface NovelScreenProps {
  onBack: () => void;
}

const NovelScreen: React.FC<NovelScreenProps> = ({ onBack }) => {
  // Library State
  const [novels, setNovels] = useState<Novel[]>([]);
  const [currentNovelId, setCurrentNovelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<FirebaseUser | null>(auth.currentUser);
  
  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login error:', error);
      setError('Lỗi đăng nhập. Vui lòng thử lại.');
    }
  };
  
  // UI States
  const [showSettings, setShowSettings] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [galleryBackground, setGalleryBackground] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [streamingContent, setStreamingContent] = useState('');
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(24);
  const [previewChapter, setPreviewChapter] = useState<Chapter | null>(null);
  const [userPlot, setUserPlot] = useState('');
  const [nextChapterLength, setNextChapterLength] = useState<number | ''>('');
  const [showDirectionModal, setShowDirectionModal] = useState(false);
  const [selectedDirection, setSelectedDirection] = useState('');
  
  useEffect(() => {
    console.log('NovelScreen: auth.currentUser changed:', auth.currentUser);
  }, [auth.currentUser]);

  // Missing states
  const [npcComments, setNpcComments] = useState<NPCComment[]>([]);
  const [isGeneratingGossip, setIsGeneratingGossip] = useState(false);
  const [npcProgress, setNpcProgress] = useState(0);
  const [showPlotPrompt, setShowPlotPrompt] = useState(false);
  const [showGossipGroup, setShowGossipGroup] = useState(false);

  const directions = ['Lãng mạn', 'Ghen tuông', 'Kịch tính', 'NSFW'];
  
  const novelAbortControllerRef = useRef<AbortController | null>(null);
  const gossipAbortControllerRef = useRef<AbortController | null>(null);

  // Current Novel State (Derived)
  const currentNovel = novels.find(n => n.id === currentNovelId);

  // Persistence with Firebase
  useEffect(() => {
    let unsubscribe: () => void;
    let unsubBg: () => void;

    const authUnsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        console.log('NovelScreen: No user.');
        setNovels([]);
        setLoading(false);
        return;
      }

      const userId = currentUser.uid;
      console.log('NovelScreen: Fetching novels for user:', userId);
      const q = query(collection(db, `users/${userId}/novels`));
      
      unsubscribe = onSnapshot(q, (snapshot) => {
        const novelsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Novel));
        console.log('NovelScreen: Fetched novels:', novelsData);
        setNovels(novelsData);
        setLoading(false);
      }, (err) => {
        console.error('Failed to fetch novels from Firebase', err);
        setError('Không thể tải dữ liệu từ máy chủ.');
        setLoading(false);
      });

      // Load gallery background
      unsubBg = onSnapshot(doc(db, `users/${userId}/settings`, 'gallery'), (doc) => {
        if (doc.exists()) {
          setGalleryBackground(doc.data().background);
        }
      });
    });

    return () => {
      authUnsubscribe();
      if (unsubscribe) unsubscribe();
      if (unsubBg) unsubBg();
    };
  }, []);

  const saveNovelToFirebase = async (novel: Novel) => {
    console.log('saveNovelToFirebase called, auth.currentUser:', auth.currentUser);
    if (!auth.currentUser) {
      console.error('No user logged in, cannot save novel.');
      return;
    }
    const userId = auth.currentUser.uid;
    console.log('Saving to path:', `users/${userId}/novels/${novel.id}`);
    try {
      await setDoc(doc(db, `users/${userId}/novels`, novel.id), novel);
      console.log('Novel saved successfully.');
    } catch (e) {
      console.error('Failed to save novel to Firebase', e);
      setError('Không thể lưu dữ liệu lên máy chủ.');
    }
  };

  const deleteNovelFromFirebase = async (id: string) => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    try {
      await deleteDoc(doc(db, `users/${userId}/novels`, id));
    } catch (e) {
      console.error('Failed to delete novel from Firebase', e);
      setError('Không thể xóa dữ liệu trên máy chủ.');
    }
  };

  // Auto-clear toasts
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Reset editor state when switching novels
  useEffect(() => {
    // Always clear content and editing ID when switching
    setContent('');
    setEditingChapterId(null);
    setNpcComments([]);

    if (currentNovelId) {
      const novel = novels.find(n => n.id === currentNovelId);
      if (novel) {
        setUserPlot(novel.userPlot || '');
        setNextChapterLength(novel.nextChapterLength ?? '');
      }
    } else {
      setUserPlot('');
      setNextChapterLength('');
    }
  }, [currentNovelId]);

  // Persist plot and length changes immediately
  useEffect(() => {
    if (currentNovelId) {
      const novel = novels.find(n => n.id === currentNovelId);
      if (novel && (novel.userPlot !== userPlot || novel.nextChapterLength !== nextChapterLength)) {
        updateCurrentNovel({ userPlot, nextChapterLength });
      }
    }
  }, [userPlot, nextChapterLength, currentNovelId]);

  // Fetch Models
  const fetchModels = async () => {
    if (!currentNovel) return;
    const { proxyEndpoint, proxyKey } = currentNovel.settings;
    if (!proxyEndpoint || !proxyKey) {
      setError('Vui lòng nhập đầy đủ Proxy Endpoint và API Key.');
      return;
    }
    
    setIsFetchingModels(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    try {
      setError(null);
      let url = proxyEndpoint.trim();
      if (!url.startsWith('http')) url = 'https://' + url;
      if (url.endsWith('/')) url = url.slice(0, -1);
      
      const modelsUrl = url.toLowerCase().endsWith('/v1') 
        ? `${url}/models` 
        : url.toLowerCase().includes('/v1/') 
          ? `${url.split('/v1/')[0]}/v1/models`
          : `${url}/v1/models`;

      const response = await fetch(modelsUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${proxyKey}`,
          'Accept': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Lỗi API: ${response.status}`);
      }
      
      const data = await response.json();
      const rawModels = data.data || data.models || [];
      const modelIds = rawModels.map((m: any) => (typeof m === 'string' ? m : m.id));
      setAvailableModels(modelIds);
      if (modelIds.length > 0) {
        setSuccessMessage(`Đã tải thành công ${modelIds.length} model.`);
      } else {
        setError('Không tìm thấy model nào trong phản hồi từ API.');
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error('Error fetching models:', err);
      if (err.name === 'AbortError') {
        setError('Lỗi: Kết nối quá hạn khi tải danh sách model.');
      } else {
        setError(`Lỗi kết nối API: ${err.message}`);
      }
    } finally {
      setIsFetchingModels(false);
    }
  };

  // Novel Management
  const createNewNovel = async () => {
    console.log('createNewNovel called, auth.currentUser:', auth.currentUser);
    if (!auth.currentUser) {
      setError('Bạn cần đăng nhập để tạo sổ mới.');
      handleLogin();
      return;
    }
    const newNovel: Novel = {
      id: Date.now().toString(),
      storyName: 'Tiểu thuyết mới',
      characterName: '',
      genre: '',
      chapterLength: 1000,
      chapters: [],
      coverImage: '',
      editorBackgroundImage: '',
      npcGlobalBackground: '',
      lastModified: Date.now(),
      settings: {
        proxyEndpoint: '',
        proxyKey: '',
        model: '',
        isSetupComplete: false,
        useStreaming: true,
        extremeCapacityMode: false,
        maxTokens: 32000,
        timeout: 15
      },
      botCharInfo: '',
      userCharInfo: '',
      writingPrompt: '',
      npcCount: 500
    };
    console.log('Saving novel to Firebase:', newNovel);
    await saveNovelToFirebase(newNovel);
    setCurrentNovelId(newNovel.id);
    setShowSettings(true);
  };

  const deleteNovel = (id: string) => {
    deleteNovelFromFirebase(id);
    if (currentNovelId === id) setCurrentNovelId(null);
    setDeleteConfirmId(null);
  };

  const updateCurrentNovel = (updates: Partial<Novel>) => {
    if (!currentNovelId || !currentNovel) return;
    const updatedNovel = { ...currentNovel, ...updates, lastModified: Date.now() };
    saveNovelToFirebase(updatedNovel);
  };

  const updateSettings = (updates: Partial<Novel['settings']>) => {
    if (!currentNovel) return;
    const updatedNovel = {
      ...currentNovel,
      settings: { ...currentNovel.settings, ...updates },
      lastModified: Date.now()
    };
    saveNovelToFirebase(updatedNovel);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState<'cover' | 'editorBg' | 'npcBg' | 'galleryBackground' | null>(null);

  const handleImageUrl = (type: 'cover' | 'editorBg' | 'npcBg' | 'galleryBackground') => {
    setUploadType(type);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadType) {
      try {
        const compressed = await compressImage(file, 1200, 1200, 0.7);
        if (uploadType === 'cover') updateCurrentNovel({ coverImage: compressed });
        else if (uploadType === 'editorBg') updateCurrentNovel({ editorBackgroundImage: compressed });
        else if (uploadType === 'npcBg') updateCurrentNovel({ npcGlobalBackground: compressed });
        else if (uploadType === 'galleryBackground') {
          setGalleryBackground(compressed);
          if (auth.currentUser) {
            setDoc(doc(db, `users/${auth.currentUser.uid}/settings`, 'gallery'), { background: compressed });
          }
        }
      } catch (err) {
        console.error("Image upload failed", err);
        setError("Lỗi tải ảnh. Vui lòng thử lại.");
      }
    }
    if (e.target) e.target.value = '';
    setUploadType(null);
  };

  // Editor Logic
  const [content, setContent] = useState('');
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'setup' | 'editor'>('setup');

  const handleGenerate = async () => {
    if (!currentNovel) return;

    // Check for unsaved changes before generating new content
    if (content.trim()) {
      let isUnsaved = false;
      if (editingChapterId) {
        const savedChapter = currentNovel.chapters.find(c => c.id === editingChapterId);
        if (savedChapter && savedChapter.content !== content) {
          isUnsaved = true;
        }
      } else {
        isUnsaved = true;
      }
      
      if (isUnsaved) {
        setConfirmConfig({
          title: 'Nội dung chưa lưu',
          message: 'Bạn có nội dung chưa lưu. Nếu tiếp tục sáng tác chương mới, nội dung hiện tại sẽ bị ghi đè. Bạn có muốn tiếp tục?',
          onConfirm: () => {
            setConfirmConfig(null);
            proceedWithGeneration();
          }
        });
        return;
      }
    }

    proceedWithGeneration();
  };

  const proceedWithGeneration = async () => {
    if (!currentNovel) return;
    const { proxyEndpoint, proxyKey, model, useStreaming = true, extremeCapacityMode = false, responseHistory = [] } = currentNovel.settings;
    if (!proxyEndpoint || !proxyKey || !model) {
      setError('Vui lòng hoàn tất cài đặt API.');
      setShowSettings(true);
      setActiveTab('setup');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setStreamingContent('');
    
    // HỆ THỐNG THỜI GIAN THÔNG MINH (Adaptive Timeout)
    // Tính toán thời gian dựa trên lịch sử và độ phức tạp
    const baseComplexity = (nextChapterLength || currentNovel.chapterLength || 1000) / 100; // 100 chữ ~ 1 đơn vị phức tạp
    const avgResponseTime = responseHistory.length > 0 
      ? responseHistory.reduce((a, b) => a + b, 0) / responseHistory.length 
      : 30; // Mặc định 30s cho 1000 chữ
    
    const calculatedTimeout = Math.min(
      extremeCapacityMode ? 60 * 60 * 1000 : 30 * 60 * 1000, // Max limit
      Math.max(2 * 60 * 1000, (avgResponseTime * baseComplexity * 2) * 1000) // Min 2p, hoặc gấp đôi trung bình
    );
    
    setEstimatedTime(Math.ceil(calculatedTimeout / 60000));

    const startTime = Date.now();
    novelAbortControllerRef.current = new AbortController();
    const timeoutId = setTimeout(() => {
      if (novelAbortControllerRef.current) {
        novelAbortControllerRef.current.abort('TIMEOUT');
      }
    }, calculatedTimeout);

    try {
      // Lấy bối cảnh rộng hơn từ các chương trước (tối đa 5 chương gần nhất)
      const context = currentNovel.chapters.slice(-5).map(ch => 
        `Chương ${ch.title}: ${(ch.content || '').substring(0, 500)}...`
      ).join('\n\n');

      const systemInstruction = `Bạn là một nhà văn chuyên nghiệp tài ba, có khả năng viết lách xuất sắc và tư duy cốt truyện logic.
QUY TẮC BẮT BUỘC:
1. TUYỆT ĐỐI KHÔNG bao giờ nhắc đến việc mình là AI, hệ thống, hay bất kỳ thông tin kỹ thuật nào. Bạn CHỈ là một nhà văn.
2. KHÔNG ĐƯỢC viết ngắt quãng. Phải hoàn thành toàn bộ chương truyện trong một lần trả lời duy nhất.
3. KHÔNG ĐƯỢC tự ý cắt câu hay kết thúc lửng lơ khi chưa đạt đủ dung lượng yêu cầu.
4. PHẢI ghi nhớ và liên kết chặt chẽ với các chương trước. Phát triển cốt truyện tiếp nối, không nhắc lại những gì đã xảy ra một cách thừa thãi.
5. Văn phong phải mượt mà, giàu hình ảnh, cảm xúc và phù hợp với thể loại truyện.
6. NẾU TÁC GIẢ CÓ YÊU CẦU CỐT TRUYỆN (PLOT), BẠN PHẢI TUÂN THỦ TUYỆT ĐỐI VÀ LẤY ĐÓ LÀM XƯƠNG SỐNG CHO CHƯƠNG NÀY.
7. THÔNG TIN NHÂN VẬT:
   - Bot Character: ${currentNovel.botCharInfo || 'Chưa xác định'}
   - User Character: ${currentNovel.userCharInfo || 'Chưa xác định'}
8. PHONG CÁCH VIẾT: ${currentNovel.writingPrompt || 'Tự nhiên, lôi cuốn'}`;

      const userPrompt = `Hãy viết chương tiếp theo cho tiểu thuyết "${currentNovel.storyName}".
THÔNG TIN TRUYỆN:
- Thể loại: ${currentNovel.genre}
- Nhân vật chính: ${currentNovel.characterName}
- Độ dài yêu cầu: Khoảng ${nextChapterLength || currentNovel.chapterLength} chữ/từ.

${userPlot ? `[QUAN TRỌNG NHẤT] YÊU CẦU CỐT TRUYỆN TỪ TÁC GIẢ:
"${userPlot}"
=> BẮT BUỘC PHẢI VIẾT CHƯƠNG NÀY THEO ĐÚNG DIỄN BIẾN VÀ Ý TƯỞNG TRÊN. Không được đi chệch hướng.` : ''}

BỐI CẢNH CÁC CHƯƠNG TRƯỚC:
${context || 'Đây là chương đầu tiên, hãy bắt đầu một cách ấn tượng.'}

YÊU CẦU NỘI DUNG:
- Viết chương mới hoàn chỉnh, không bị cắt ngang.
- Đảm bảo sự liên kết logic với bối cảnh đã cho.
- Tập trung vào diễn biến tâm lý và hành động của nhân vật ${currentNovel.characterName}.
- KHÔNG nhắc lại nội dung cũ, hãy triển khai tình tiết mới.
- PHẢI VIẾT ĐỦ ĐỘ DÀI YÊU CẦU (${nextChapterLength || currentNovel.chapterLength} chữ/từ), TUYỆT ĐỐI KHÔNG DỪNG LẠI CHO ĐẾN KHI ĐỦ DUNG LƯỢNG.`;

      let apiUrl = proxyEndpoint.trim();
      if (!apiUrl.startsWith('http')) apiUrl = 'https://' + apiUrl;
      if (apiUrl.endsWith('/')) apiUrl = apiUrl.slice(0, -1);
      
      const completionUrl = apiUrl.endsWith('/chat/completions') 
        ? apiUrl 
        : apiUrl.endsWith('/v1') 
          ? `${apiUrl}/chat/completions`
          : `${apiUrl}/v1/chat/completions`;

      const response = await fetch(completionUrl, {
        method: 'POST',
        signal: novelAbortControllerRef.current.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${proxyKey}`,
          ...(useStreaming ? { 'Accept': 'text/event-stream' } : {})
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          stream: useStreaming,
          // NÂNG CẤP SỨC CHỨA: Cho phép nhận tối đa 100.000 tokens nếu bật Extreme Mode
          max_tokens: extremeCapacityMode ? 100000 : 32000 
        })
      });

      if (response.status === 504) {
        throw new Error('Lỗi 504: Cổng kết nối hết hạn (Gateway Timeout). API Proxy hoặc Model đang quá tải hoặc phản hồi quá chậm. Hãy thử lại hoặc chọn Model khác nhanh hơn.');
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `API request failed with status ${response.status}`);
      }

      if (useStreaming) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder('utf-8');
        let generatedContent = '';
        let buffer = '';
        
        if (!reader) {
          throw new Error('Response body is not readable. Proxy của bạn có thể không hỗ trợ Streaming.');
        }

        setContent('');
        setActiveTab('editor');
        setEditingChapterId(null);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          
          // Giữ lại phần chưa hoàn chỉnh trong buffer
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('data: ') && trimmedLine !== 'data: [DONE]') {
              try {
                const data = JSON.parse(trimmedLine.slice(6));
                if (data.choices?.[0]?.delta?.content) {
                  const delta = data.choices[0].delta.content;
                  generatedContent += delta;
                  setStreamingContent(generatedContent);
                  setContent(generatedContent);
                }
              } catch (e) {
                // Bỏ qua lỗi parse JSON vì có thể chunk bị cắt ngang
              }
            }
          }
        }
        
        if (!generatedContent.trim()) {
           throw new Error('Streaming hoàn tất nhưng không nhận được nội dung. Hãy thử tắt chế độ Streaming trong Cài đặt.');
        }
      } else {
        // NÂNG CẤP SỨC CHỨA: Đọc dữ liệu thô (raw text) theo từng chunk để tránh tràn bộ nhớ RAM 
        // của trình duyệt khi nhận cục JSON khổng lồ (thay vì dùng response.json() trực tiếp)
        const reader = response.body?.getReader();
        const decoder = new TextDecoder('utf-8');
        let rawJsonText = '';

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            rawJsonText += decoder.decode(value, { stream: true });
          }
        } else {
          rawJsonText = await response.text();
        }

        let data;
        try {
          data = JSON.parse(rawJsonText);
        } catch (parseError) {
          console.error("JSON Parse Error:", parseError);
          console.log("Raw Text:", rawJsonText.substring(0, 1000) + "...");
          throw new Error('Hệ thống đã tải xong khối dữ liệu khổng lồ nhưng định dạng trả về bị hỏng (Invalid JSON). Dữ liệu quá lớn có thể đã bị cắt ngang giữa chừng.');
        }
        
        if (data.error) {
          throw new Error(data.error.message || 'API Error');
        }
        
        // Handle different API response formats (Chat vs Completions vs Gemini vs Anthropic)
        let generatedContent = '';
        if (data.choices?.[0]?.message?.content !== undefined) {
          generatedContent = data.choices[0].message.content;
        } else if (data.choices?.[0]?.text !== undefined) {
          generatedContent = data.choices[0].text;
        } else if (data.candidates?.[0]?.content?.parts?.[0]?.text !== undefined) {
          generatedContent = data.candidates[0].content.parts[0].text; // Gemini
        } else if (Array.isArray(data.content) && data.content[0]?.text !== undefined) {
          generatedContent = data.content[0].text; // Anthropic
        } else if (typeof data.content === 'string') {
          generatedContent = data.content;
        } else if (data.response !== undefined) {
          generatedContent = data.response; // Ollama generate endpoint
        } else if (data.message?.content !== undefined) {
          generatedContent = data.message.content; // Some custom proxies
        } else if (data.text !== undefined) {
          generatedContent = data.text; // Other custom proxies
        }
        
        if (!generatedContent || !generatedContent.trim()) {
          console.error('Full API Response:', data);
          
          // NÂNG CẤP: Bỏ thông báo đổ lỗi cho Proxy, hiển thị thông báo trung lập hơn
          if (data.usage?.completion_tokens > 0 && generatedContent === "") {
            setError(`Hệ thống App đã nâng cấp sức chứa và nhận thành công toàn bộ gói dữ liệu từ API. Tuy nhiên, gói dữ liệu trả về báo cáo có ${data.usage.completion_tokens} tokens nhưng phần nội dung văn bản (content) lại hoàn toàn trống rỗng. Dưới đây là dữ liệu gốc (Raw Context) để bạn kiểm tra.`);
          } else {
            setError('Đã hiển thị dữ liệu gốc (Raw Context) vì không nhận diện được định dạng trả về của Model.');
          }

          // FORCE DISPLAY RAW CONTEXT
          generatedContent = `[HỆ THỐNG ĐÃ NÂNG CẤP SỨC CHỨA - DỮ LIỆU GỐC TỪ API]\n\n${JSON.stringify(data, null, 2)}`;
        }
        
        setContent(generatedContent);
        setEditingChapterId(null);
        setActiveTab('editor');
      }

      // Ghi nhớ thời gian phản hồi để tự điều chỉnh cho lần sau
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000; // seconds
      const complexity = (nextChapterLength || currentNovel.chapterLength || 1000) / 100;
      const timePerUnit = duration / complexity;
      
      const newHistory = [...(currentNovel.settings.responseHistory || []), timePerUnit].slice(-10);
      updateSettings({ responseHistory: newHistory });

      // Không reset plot và độ dài để người dùng có thể chỉnh sửa lại nếu cần
    } catch (err: any) {
      if (err.name === 'AbortError' || err === 'TIMEOUT') {
        setError(err === 'TIMEOUT' ? 'Đã quá 15 phút chờ đợi. Kết nối bị ngắt để tránh treo máy.' : 'Đã hủy quá trình sáng tác.');
      } else {
        console.error(err);
        setError(err.message || 'Lỗi khi tạo nội dung. Vui lòng thử lại.');
      }
    } finally {
      clearTimeout(timeoutId);
      setIsGenerating(false);
      novelAbortControllerRef.current = null;
    }
  };

  const cancelGeneration = () => {
    if (novelAbortControllerRef.current) {
      novelAbortControllerRef.current.abort();
    }
  };

  const handleSave = () => {
    if (!currentNovel || !(content || '').trim()) return;
    
    let updatedNovel: Novel;
    if (editingChapterId) {
      const updatedChapters = currentNovel.chapters.map(ch => 
        ch.id === editingChapterId ? { ...ch, content: content || '' } : ch
      );
      updatedNovel = { 
        ...currentNovel,
        chapters: updatedChapters,
        userPlot,
        nextChapterLength,
        lastModified: Date.now()
      };
    } else {
      const newChapterId = Date.now().toString();
      const newChapter: Chapter = {
        id: newChapterId,
        title: (currentNovel.chapters.length + 1).toString(),
        content: content || '',
        timestamp: new Date().toLocaleString()
      };
      updatedNovel = { 
        ...currentNovel,
        chapters: [...currentNovel.chapters, newChapter],
        userPlot,
        nextChapterLength,
        lastModified: Date.now()
      };
      setEditingChapterId(newChapterId); // Giữ chương vừa lưu ở trạng thái đang sửa
    }
    
    saveNovelToFirebase(updatedNovel);
    setSuccessMessage('Đã lưu chương thành công!');
    // Không setContent('') để người dùng vẫn thấy nội dung vừa lưu
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const handleGenerateGossip = async () => {
    if (!currentNovel || !content.trim()) return;
    const { proxyEndpoint, proxyKey, model } = currentNovel.settings;
    if (!proxyEndpoint || !proxyKey || !model) return;

    setIsGeneratingGossip(true);
    setNpcProgress(0);
    setNpcComments([]);
    gossipAbortControllerRef.current = new AbortController();

    const totalNpcs = 5000;
    const batchSize = 50;
    let accumulatedComments: NPCComment[] = [];

    try {
      for (let i = 0; i < totalNpcs; i += batchSize) {
        if (gossipAbortControllerRef.current?.signal.aborted) break;

        const systemInstruction = `Bạn là một nhóm NPC (độc giả ảo) đang theo dõi câu chuyện "${currentNovel.storyName}".
Nhiệm vụ: Hãy tạo ra một cuộc hội thoại sôi nổi, cãi nhau, khen ngợi, bình luận về nội dung chương truyện vừa đọc.
YÊU CẦU:
1. Tạo ra ${batchSize} bình luận từ các NPC khác nhau.
2. Mỗi bình luận phải có: Tên NPC, Vai trò, và Nội dung bình luận.
3. Nội dung phải đa dạng: cãi nhau về tình tiết, khen nhân vật ${currentNovel.characterName}, chê tác giả viết chậm, dự đoán tương lai...
4. Trả về định dạng JSON: { "comments": [ { "npcName": "...", "npcRole": "...", "content": "..." }, ... ] }`;

        const userPrompt = `Nội dung chương truyện vừa xong:
${content.substring(0, 3000)}

Hãy cho các NPC "lắm chuyện" bắt đầu bàn tán! (Đợt ${i / batchSize + 1}/${totalNpcs / batchSize})`;

        let apiUrl = proxyEndpoint.trim();
        if (!apiUrl.startsWith('http')) apiUrl = 'https://' + apiUrl;
        if (apiUrl.endsWith('/')) apiUrl = apiUrl.slice(0, -1);
        
        const completionUrl = apiUrl.endsWith('/chat/completions') 
          ? apiUrl 
          : apiUrl.endsWith('/v1') 
            ? `${apiUrl}/chat/completions`
            : `${apiUrl}/v1/chat/completions`;

        const response = await fetch(completionUrl, {
          method: 'POST',
          signal: gossipAbortControllerRef.current.signal,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${proxyKey}`
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: 'system', content: systemInstruction },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.9
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Gossip API failed with status ${response.status}: ${errorText}`);
          throw new Error(`Gossip API failed with status ${response.status}: ${errorText}`);
        }
        const data = await response.json();
        
        let rawContent = '';
        if (data.choices?.[0]?.message?.content) {
          rawContent = data.choices[0].message.content;
        } else if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
          rawContent = data.candidates[0].content.parts[0].text;
        }
        
        rawContent = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        let result;
        try {
          result = JSON.parse(rawContent);
        } catch (e) {
          const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) result = JSON.parse(jsonMatch[0]);
          else throw new Error('Phản hồi từ NPC không đúng định dạng.');
        }
        
        const newComments: NPCComment[] = (result.comments || []).map((c: any) => ({
          id: Math.random().toString(36).substr(2, 9),
          npcName: c.npcName,
          npcAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.npcName}`,
          npcRole: c.npcRole,
          npcBackground: currentNovel.npcGlobalBackground || '',
          content: c.content,
          timestamp: new Date().toLocaleTimeString()
        }));

        accumulatedComments = [...accumulatedComments, ...newComments];
        setNpcComments(accumulatedComments);
        setNpcProgress(i + batchSize);
        
        // Add a small delay to avoid rate limits
        await sleep(1000);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError('Đã hủy kết nối hội nhóm NPC.');
      } else {
        console.error(err);
        setError(err.message || 'Không thể kết nối với hội nhóm lắm chuyện.');
      }
    } finally {
      setIsGeneratingGossip(false);
      gossipAbortControllerRef.current = null;
    }
  };

  const cancelGossipGeneration = () => {
    if (gossipAbortControllerRef.current) {
      gossipAbortControllerRef.current.abort();
    }
  };

  // Main Render
  return (
    <div className="h-full w-full overflow-hidden">
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />
      <AnimatePresence mode="wait">
        {!currentNovelId || !currentNovel ? (
          <motion.div 
            key="library"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full w-full bg-[#FAF7F2] p-6 overflow-y-auto custom-scrollbar bg-cover bg-center transition-all duration-700"
            style={{ backgroundImage: galleryBackground ? `url('${galleryBackground}')` : 'none' }}
          >
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-10 bg-white/40 backdrop-blur-md p-6 rounded-3xl border border-white/20 shadow-sm">
                <div className="flex items-center">
                  <button onClick={onBack} className="p-2 mr-4 text-stone-700 hover:bg-stone-200 rounded-full transition-colors">
                    <ArrowLeft size={24} />
                  </button>
                  <h1 className="text-3xl font-bold text-stone-800 flex items-center tracking-tight">
                    <Library className="mr-3 text-[#DB2777]" size={32} /> Thư viện của tôi
                  </h1>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handleImageUrl('galleryBackground')}
                    className="p-3 bg-white/40 text-stone-700 rounded-xl font-bold hover:bg-white/60 transition-all shadow-sm border border-white/40"
                    title="Thay đổi ảnh nền thư viện"
                  >
                    <ImageIcon size={20} />
                  </button>
                  <button 
                    onClick={createNewNovel}
                    className="flex items-center gap-2 px-6 py-3 bg-[#DB2777] text-white rounded-xl font-bold hover:bg-[#BE185D] transition-all shadow-lg hover:shadow-[#DB2777]/20"
                  >
                    <Plus size={20} />
                    <span>Cuốn sổ mới</span>
                  </button>
                </div>
              </div>

              {!user ? (
                <div className="flex flex-col items-center justify-center py-20 text-stone-400">
                  <User size={80} className="mb-6 opacity-10" />
                  <p className="text-xl font-medium mb-2">Bạn chưa đăng nhập</p>
                  <p className="text-sm mb-6">Vui lòng đăng nhập để lưu trữ và đồng bộ tiểu thuyết của bạn.</p>
                  <button 
                    onClick={handleLogin}
                    className="px-6 py-3 bg-[#DB2777] text-white rounded-xl font-bold hover:bg-[#BE185D] transition-all shadow-lg"
                  >
                    Đăng nhập bằng Google
                  </button>
                </div>
              ) : novels.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-stone-400">
                  <BookOpen size={80} className="mb-6 opacity-10" />
                  <p className="text-xl font-medium mb-2">Chưa có cuốn sổ nào</p>
                  <p className="text-sm">Hãy tạo cuốn sổ đầu tiên để bắt đầu hành trình sáng tác.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
                  {(novels || []).map((novel, idx) => (
                    <motion.div
                      key={novel.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      whileHover={{ y: -12, rotate: idx % 2 === 0 ? 1 : -1 }}
                      onClick={() => {
                        setCurrentNovelId(novel.id);
                        setActiveTab('setup');
                      }}
                      className="group relative h-[450px] rounded-[2.5rem] overflow-hidden shadow-2xl cursor-pointer bg-white border border-stone-100/50"
                    >
                      {novel.coverImage ? (
                        <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110" style={{ backgroundImage: `url('${novel.coverImage}')` }} />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-[#FDF2F8] via-white to-[#FCE7F3]" />
                      )}
                      
                      {/* Decorative Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                      
                      {/* Artsy Elements */}
                      <div className="absolute top-6 left-6 w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white">
                        <Book size={20} />
                      </div>
                      
                      <div className="absolute inset-0 p-8 flex flex-col justify-end text-white">
                        <div className="space-y-4">
                          <div className="inline-block px-3 py-1 bg-[#DB2777] text-[10px] font-bold rounded-full uppercase tracking-widest shadow-lg">
                            {novel.genre || 'Tiểu thuyết'}
                          </div>
                          <h3 className="text-2xl font-serif font-bold leading-tight line-clamp-2 italic">
                            {novel.storyName}
                          </h3>
                          <div className="flex items-center gap-4 text-xs opacity-80 font-medium">
                            <span className="flex items-center gap-1"><Users size={14} /> {novel.characterName}</span>
                            <span className="flex items-center gap-1"><Menu size={14} /> {novel.chapters.length} chương</span>
                          </div>
                          
                          <div className="pt-4 flex justify-between items-center border-t border-white/20">
                            <span className="text-[10px] uppercase tracking-wider font-bold opacity-60">
                              Cập nhật: {new Date(novel.lastModified).toLocaleDateString()}
                            </span>
                            <div className="flex gap-2">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirmId(novel.id);
                                }}
                                className="p-2 bg-white/10 hover:bg-red-500/20 rounded-full transition-all text-white/60 hover:text-red-400"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="editor"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full w-full text-stone-800 flex flex-col relative bg-cover bg-center transition-all duration-700"
            style={{ backgroundImage: currentNovel.editorBackgroundImage ? `url('${currentNovel.editorBackgroundImage}')` : 'none' }}
          >
            <div className={`absolute inset-0 transition-all duration-500 ${isFocusMode ? 'bg-white/95' : 'bg-[#FAF7F2]/80 backdrop-blur-md'}`} />
            
            <div className="relative z-10 w-full flex flex-col h-full">
              {/* Header */}
              <AnimatePresence>
                {!isFocusMode && (
                  <motion.div 
                    initial={{ y: -100 }}
                    animate={{ y: 0 }}
                    exit={{ y: -100 }}
                    className="flex items-center justify-between px-6 py-4 border-b border-stone-200/50 bg-white/40 backdrop-blur-sm"
                  >
                    <div className="flex items-center gap-6">
                      <button onClick={() => setCurrentNovelId(null)} className="p-2 text-stone-700 hover:bg-white/40 rounded-full transition-colors">
                        <Library size={24} />
                      </button>
                      <div className="flex items-center gap-2">
                        <BookOpen className="text-[#DB2777]" size={24} />
                        <h1 className="text-xl font-bold text-stone-800 tracking-tight">
                          {currentNovel.storyName || 'Novel App'}
                        </h1>
                      </div>
                      
                      {/* Tabs */}
                      <div className="flex bg-stone-200/50 p-1 rounded-xl ml-4">
                        <button 
                          onClick={() => setActiveTab('setup')}
                          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'setup' ? 'bg-white text-[#DB2777] shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                        >
                          Thiết lập
                        </button>
                        <button 
                          onClick={() => setActiveTab('editor')}
                          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'editor' ? 'bg-white text-[#DB2777] shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                        >
                          Sáng tác
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button onClick={() => handleImageUrl('cover')} title="Đổi ảnh bìa" className="p-2 text-stone-700 hover:bg-white/40 rounded-full transition-colors"><ImageIcon size={20} className="text-[#DB2777]" /></button>
                      <button onClick={() => handleImageUrl('editorBg')} title="Đổi ảnh nền viết truyện" className="p-2 text-stone-700 hover:bg-white/40 rounded-full transition-colors"><ImageIcon size={20} /></button>
                      <button onClick={() => setShowDrawer(!showDrawer)} title="Danh sách chương" className="p-2 text-stone-700 hover:bg-white/40 rounded-full transition-colors"><Menu size={20} /></button>
                      <button onClick={() => setShowSettings(!showSettings)} title="Cài đặt API" className="p-2 text-stone-700 hover:bg-white/40 rounded-full transition-colors"><Settings size={20} /></button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {activeTab === 'setup' ? (
              <motion.div 
                key="setup"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full w-full overflow-y-auto p-8 custom-scrollbar"
              >
                <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 pb-20">
                  {/* API Settings */}
                  <div className="bg-white/90 backdrop-blur-lg p-8 rounded-3xl border border-[#FBCFE8] shadow-xl">
                    <h2 className="font-bold text-[#BE185D] text-lg flex items-center mb-6">
                      <Settings className="mr-2" size={20} /> Cấu hình hệ thống
                    </h2>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-xs font-semibold text-stone-500 uppercase mb-1 ml-1">API Endpoint</label>
                        <input type="text" placeholder="https://api.example.com/v1" value={currentNovel.settings.proxyEndpoint} onChange={(e) => updateSettings({ proxyEndpoint: e.target.value })} className="w-full p-3 bg-white rounded-xl border border-[#FBCFE8] focus:ring-2 focus:ring-[#DB2777] outline-none transition-all" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-stone-500 uppercase mb-1 ml-1">API Key</label>
                        <input type="password" placeholder="sk-..." value={currentNovel.settings.proxyKey} onChange={(e) => updateSettings({ proxyKey: e.target.value })} className="w-full p-3 bg-white rounded-xl border border-[#FBCFE8] focus:ring-2 focus:ring-[#DB2777] outline-none transition-all" />
                      </div>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <label className="block text-xs font-semibold text-stone-500 uppercase ml-1">Chọn Model</label>
                          <button 
                            onClick={fetchModels} 
                            disabled={isFetchingModels}
                            className={`text-[10px] font-bold flex items-center gap-1 transition-all ${isFetchingModels ? 'text-stone-400' : 'text-[#DB2777] hover:underline'}`}
                          >
                            {isFetchingModels ? (
                              <>
                                <div className="w-2 h-2 border border-stone-400 border-t-transparent rounded-full animate-spin" />
                                Đang tải...
                              </>
                            ) : (
                              <>
                                <Sparkles size={10} /> Làm mới danh sách
                              </>
                            )}
                          </button>
                        </div>
                        
                        <div className="relative group">
                          <div className="flex overflow-x-auto gap-3 pb-4 custom-scrollbar snap-x">
                            {availableModels.length === 0 ? (
                              <div className="w-full p-8 border-2 border-dashed border-stone-100 rounded-2xl flex flex-col items-center justify-center text-stone-400 gap-2">
                                <Bot size={24} />
                                <span className="text-[10px] font-bold">Chưa có model nào. Hãy nhấn "Làm mới"</span>
                              </div>
                            ) : (
                              availableModels.map(m => (
                                <button 
                                  key={m}
                                  onClick={() => updateSettings({ model: m })}
                                  className={`flex-shrink-0 snap-start px-6 py-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 min-w-[140px] ${currentNovel.settings.model === m ? 'border-[#DB2777] bg-pink-50 shadow-md shadow-pink-100' : 'border-stone-100 bg-white hover:border-pink-200'}`}
                                >
                                  <div className={`p-2 rounded-xl ${currentNovel.settings.model === m ? 'bg-[#DB2777] text-white' : 'bg-stone-100 text-stone-400'}`}>
                                    <Bot size={20} />
                                  </div>
                                  <span className={`text-[10px] font-bold truncate w-full text-center ${currentNovel.settings.model === m ? 'text-[#DB2777]' : 'text-stone-600'}`}>{m}</span>
                                </button>
                              ))
                            )}
                          </div>
                          {/* Gradient Fades for Scroll */}
                          <div className="absolute top-0 left-0 bottom-4 w-8 bg-gradient-to-r from-white to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="absolute top-0 right-0 bottom-4 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>

                        {/* Manual Model Input */}
                        <div>
                          <input 
                            type="text" 
                            placeholder="Hoặc nhập tên Model thủ công..." 
                            value={currentNovel.settings.model} 
                            onChange={(e) => updateSettings({ model: e.target.value })} 
                            className="w-full p-3 bg-stone-50 rounded-xl border border-stone-100 focus:ring-2 focus:ring-[#DB2777] outline-none text-xs transition-all" 
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-4 bg-pink-50 rounded-xl border border-pink-100">
                        <input 
                          type="checkbox" 
                          id="useStreaming" 
                          checked={currentNovel.settings.useStreaming !== false} 
                          onChange={(e) => updateSettings({ useStreaming: e.target.checked })}
                          className="w-5 h-5 text-[#DB2777] rounded focus:ring-[#BE185D]"
                        />
                        <label htmlFor="useStreaming" className="text-sm font-medium text-stone-700 cursor-pointer">
                          Bật chế độ Streaming (Viết theo thời gian thực)
                          <p className="text-xs text-stone-500 font-normal mt-1">Khuyên dùng để tránh lỗi Proxy làm mất chữ khi viết chương dài (&gt; 5000 tokens).</p>
                        </label>
                      </div>
                      <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl border border-purple-100">
                        <input 
                          type="checkbox" 
                          id="extremeCapacityMode" 
                          checked={currentNovel.settings.extremeCapacityMode || false} 
                          onChange={(e) => updateSettings({ extremeCapacityMode: e.target.checked })}
                          className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                        />
                        <label htmlFor="extremeCapacityMode" className="text-sm font-medium text-stone-700 cursor-pointer">
                          Bật chế độ Siêu Sức Chứa (Extreme Capacity - 100.000+ Tokens)
                          <p className="text-xs text-stone-500 font-normal mt-1">Cho phép nhận văn bản cực lớn trong 1 lần trả lời. Thời gian chờ tối đa lên đến 60 phút.</p>
                        </label>
                      </div>

                      <div className="space-y-4 p-4 bg-stone-50 rounded-xl border border-stone-200">
                        <label className="block text-xs font-bold text-stone-500 uppercase">Cài đặt Token & Timeout</label>
                        <div className="flex flex-wrap gap-2">
                          {[30000, 50000, 100000].map(tokens => (
                            <button 
                              key={tokens}
                              onClick={() => updateSettings({ maxTokens: tokens })}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${currentNovel.settings.maxTokens === tokens ? 'bg-[#DB2777] text-white' : 'bg-white text-stone-600 border border-stone-200'}`}
                            >
                              {tokens.toLocaleString()} Tokens
                            </button>
                          ))}
                          <button 
                            onClick={() => updateSettings({ maxTokens: 200000 })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${currentNovel.settings.maxTokens === 200000 ? 'bg-[#DB2777] text-white' : 'bg-white text-stone-600 border border-stone-200'}`}
                          >
                            Vô hạn
                          </button>
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="text-xs font-bold text-stone-500 uppercase">Timeout (phút):</label>
                          <input 
                            type="number" 
                            value={currentNovel.settings.timeout || 15} 
                            onChange={(e) => updateSettings({ timeout: Number(e.target.value) })}
                            className="w-20 p-2 bg-white rounded-lg border border-stone-200 text-sm outline-none"
                          />
                        </div>
                      </div>
                      <button onClick={() => {
                        if (currentNovel.settings.proxyEndpoint && currentNovel.settings.proxyKey && currentNovel.settings.model) {
                          updateSettings({ isSetupComplete: true });
                          setSuccessMessage('Đã lưu cấu hình!');
                        } else {
                          setError('Vui lòng hoàn tất cài đặt.');
                        }
                      }} className="w-full p-3 bg-[#DB2777] text-white rounded-xl font-bold hover:bg-[#BE185D] transition-all shadow-lg">Lưu thiết lập</button>
                    </div>
                  </div>

                  {/* Visual Settings */}
                  <div className="bg-white/90 backdrop-blur-lg p-8 rounded-3xl border border-[#FBCFE8] shadow-xl">
                    <h2 className="font-bold text-[#BE185D] text-lg flex items-center mb-6">
                      <ImageIcon className="mr-2" size={20} /> Giao diện & Hình ảnh
                    </h2>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="block text-xs font-semibold text-stone-500 uppercase ml-1">Ảnh bìa cuốn sổ</label>
                        <div 
                          onClick={() => handleImageUrl('cover')}
                          className="aspect-[3/4] rounded-2xl border-2 border-dashed border-stone-200 hover:border-[#DB2777] transition-all cursor-pointer flex flex-col items-center justify-center bg-stone-50 overflow-hidden relative group"
                        >
                          {currentNovel.coverImage ? (
                            <>
                              <img src={currentNovel.coverImage} alt="Cover" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold text-center p-2">Thay đổi</div>
                            </>
                          ) : (
                            <>
                              <Plus size={24} className="text-stone-300 mb-2" />
                              <span className="text-[10px] font-bold text-stone-400">Chọn ảnh bìa</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="block text-xs font-semibold text-stone-500 uppercase ml-1">Ảnh nền trang viết</label>
                        <div 
                          onClick={() => handleImageUrl('editorBg')}
                          className="aspect-[3/4] rounded-2xl border-2 border-dashed border-stone-200 hover:border-[#DB2777] transition-all cursor-pointer flex flex-col items-center justify-center bg-stone-50 overflow-hidden relative group"
                        >
                          {currentNovel.editorBackgroundImage ? (
                            <>
                              <img src={currentNovel.editorBackgroundImage} alt="Editor BG" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold text-center p-2">Thay đổi</div>
                            </>
                          ) : (
                            <>
                              <Plus size={24} className="text-stone-300 mb-2" />
                              <span className="text-[10px] font-bold text-stone-400">Chọn ảnh nền</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-stone-500 uppercase">Hình nền NPC</label>
                        <div onClick={() => handleImageUrl('npcBg')} className="aspect-[3/4] rounded-2xl border-2 border-dashed border-stone-200 flex items-center justify-center bg-stone-50 overflow-hidden cursor-pointer hover:border-[#DB2777] transition-all">
                          {currentNovel.npcGlobalBackground ? <img src={currentNovel.npcGlobalBackground} className="w-full h-full object-cover" /> : <Plus size={24} className="text-stone-300" />}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Story Info */}
                  <div className="bg-white/90 backdrop-blur-lg p-8 rounded-3xl border border-[#FBCFE8] shadow-xl md:col-span-2">
                    <h2 className="font-bold text-[#BE185D] text-lg flex items-center mb-6">
                      <User className="mr-2" size={20} /> Thông tin truyện & Nhân vật
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-6">
                        <div>
                          <label className="block text-xs font-bold text-stone-500 uppercase mb-1 ml-1">Tên câu chuyện</label>
                          <input type="text" placeholder="Tên câu chuyện" value={currentNovel.storyName} onChange={(e) => updateCurrentNovel({ storyName: e.target.value })} className="w-full p-3 bg-white rounded-xl border border-[#FBCFE8] focus:ring-2 focus:ring-[#DB2777] outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-stone-500 uppercase mb-1 ml-1">Tên nhân vật chính</label>
                          <input type="text" placeholder="Tên nhân vật" value={currentNovel.characterName} onChange={(e) => updateCurrentNovel({ characterName: e.target.value })} className="w-full p-3 bg-white rounded-xl border border-[#FBCFE8] focus:ring-2 focus:ring-[#DB2777] outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-stone-500 uppercase mb-1 ml-1">Thể loại</label>
                          <input type="text" placeholder="Thể loại" value={currentNovel.genre} onChange={(e) => updateCurrentNovel({ genre: e.target.value })} className="w-full p-3 bg-white rounded-xl border border-[#FBCFE8] focus:ring-2 focus:ring-[#DB2777] outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-stone-500 uppercase mb-1 ml-1">Độ dài chương mặc định (từ)</label>
                          <input type="number" value={currentNovel.chapterLength} onChange={(e) => updateCurrentNovel({ chapterLength: Number(e.target.value) })} className="w-full p-3 bg-white rounded-xl border border-[#FBCFE8] focus:ring-2 focus:ring-[#DB2777] outline-none" />
                        </div>
                        <div>
                          <div className="flex justify-between items-center mb-1 ml-1">
                            <label className="block text-xs font-bold text-stone-500 uppercase">Số lượng NPC bàn tán</label>
                            <span className="text-xs font-bold text-[#DB2777]">{currentNovel.npcCount || 500}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <input 
                              type="range"
                              min="100"
                              max="10000"
                              step="100"
                              value={currentNovel.npcCount || 500}
                              onChange={(e) => updateCurrentNovel({ npcCount: Number(e.target.value) })}
                              className="flex-1 h-2 bg-stone-100 rounded-lg appearance-none cursor-pointer accent-[#DB2777]"
                            />
                            <div className="flex gap-2">
                              {[500, 5000].map(count => (
                                <button 
                                  key={count}
                                  onClick={() => updateCurrentNovel({ npcCount: count })}
                                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${currentNovel.npcCount === count ? 'bg-[#DB2777] text-white' : 'bg-stone-100 text-stone-600'}`}
                                >
                                  {count}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div>
                          <label className="block text-xs font-bold text-stone-500 uppercase mb-1 ml-1">Thông tin Bot Character</label>
                          <textarea placeholder="Mô tả tính cách, ngoại hình, hành động của Bot..." value={currentNovel.botCharInfo} onChange={(e) => updateCurrentNovel({ botCharInfo: e.target.value })} className="w-full p-3 bg-white rounded-xl border border-[#FBCFE8] focus:ring-2 focus:ring-[#DB2777] outline-none h-24 resize-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-stone-500 uppercase mb-1 ml-1">Thông tin User Character</label>
                          <textarea placeholder="Mô tả vai trò, mối quan hệ của bạn trong truyện..." value={currentNovel.userCharInfo} onChange={(e) => updateCurrentNovel({ userCharInfo: e.target.value })} className="w-full p-3 bg-white rounded-xl border border-[#FBCFE8] focus:ring-2 focus:ring-[#DB2777] outline-none h-24 resize-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-stone-500 uppercase mb-1 ml-1">Phong cách viết / Prompt bổ sung</label>
                          <textarea placeholder="Ví dụ: Viết theo phong cách u tối, lãng mạn, sử dụng nhiều ẩn dụ..." value={currentNovel.writingPrompt} onChange={(e) => updateCurrentNovel({ writingPrompt: e.target.value })} className="w-full p-3 bg-white rounded-xl border border-[#FBCFE8] focus:ring-2 focus:ring-[#DB2777] outline-none h-24 resize-none" />
                        </div>
                      </div>
                    </div>
                    
                    <button 
                      onClick={handleGenerate} 
                      disabled={isGenerating} 
                      className={`w-full mt-8 p-4 rounded-2xl font-bold text-white shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 ${isGenerating ? 'bg-stone-400 cursor-not-allowed' : 'bg-gradient-to-r from-[#DB2777] to-[#BE185D] hover:shadow-[#DB2777]/20'}`}
                    >
                      {isGenerating ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Đang sáng tác...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={20} />
                          <span>Bắt đầu sáng tác</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="editor"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`h-full w-full overflow-y-auto custom-scrollbar transition-all duration-500 ${isFocusMode ? 'bg-white' : ''}`}
              >
                <div className={`w-full min-h-full flex flex-col items-center py-10 ${isFocusMode ? '' : 'px-4'}`}>
                  {/* Standard Layout Container */}
                  <div 
                    className={`bg-white shadow-2xl rounded-[2rem] overflow-hidden flex flex-col transition-all duration-500 border border-stone-200/50 w-full max-w-5xl`}
                    style={{ 
                      minHeight: '80vh',
                      backgroundColor: '#FAF9F6' 
                    }}
                  >
                    {/* Editor Header */}
                    <div className="flex flex-wrap justify-between items-center px-4 md:px-8 py-4 md:py-6 border-b border-stone-100 bg-white/80 backdrop-blur-md sticky top-0 z-20 gap-4">
                      <div className="flex items-center gap-2 md:gap-4">
                        {isFocusMode && (
                          <button onClick={() => setIsFocusMode(false)} className="p-2 text-stone-400 hover:text-[#DB2777] rounded-full transition-all"><ArrowLeft className="w-5 h-5 md:w-6 md:h-6" /></button>
                        )}
                        <h2 className="text-lg md:text-xl font-serif font-bold text-stone-800 italic truncate max-w-[150px] md:max-w-none">
                          {editingChapterId ? `Chương ${currentNovel.chapters.find(c => c.id === editingChapterId)?.title}` : `Chương ${currentNovel.chapters.length + 1}`}
                        </h2>
                      </div>
                      <div className="flex items-center gap-2 md:gap-4">
                        <div className="hidden sm:flex items-center bg-stone-100 rounded-full px-3 py-1 gap-3">
                          <button onClick={() => setFontSize(Math.max(12, fontSize - 2))} className="text-stone-500 hover:text-[#DB2777] font-bold text-lg p-1">A-</button>
                          <span className="text-xs font-bold text-stone-400 w-8 text-center">{fontSize}</span>
                          <button onClick={() => setFontSize(Math.min(48, fontSize + 2))} className="text-stone-500 hover:text-[#DB2777] font-bold text-lg p-1">A+</button>
                        </div>
                        <button onClick={() => setIsFocusMode(!isFocusMode)} className={`p-2 rounded-full transition-all ${isFocusMode ? 'bg-[#DB2777] text-white' : 'text-stone-400 hover:text-[#DB2777]'}`}><Sparkles size={20} /></button>
                        <button onClick={handleSave} className="px-4 md:px-6 py-2 bg-[#DB2777] text-white rounded-full hover:bg-[#BE185D] transition-all shadow-md font-bold text-xs md:text-sm flex items-center gap-2"><Save className="w-4 h-4 md:w-[18px] md:h-[18px]" /> Lưu</button>
                      </div>
                    </div>

                    {/* Main Editor Body: Full Width */}
                    <div className="flex-1 flex flex-col p-12 relative">
                      {isGenerating && (
                        <div className="absolute inset-0 z-10 bg-white/40 backdrop-blur-[1px] flex flex-col items-center justify-center">
                          <div className="bg-white/90 backdrop-blur-md p-8 rounded-[2.5rem] shadow-2xl border border-pink-100 flex flex-col items-center gap-4 max-w-xs text-center">
                            <div className="relative">
                              <div className="w-16 h-16 border-4 border-pink-100 border-t-[#DB2777] rounded-full animate-spin" />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Sparkles size={20} className="text-[#DB2777] animate-pulse" />
                              </div>
                            </div>
                            <div>
                              <p className="text-[#DB2777] font-bold text-sm">AI đang sáng tác...</p>
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
                            <button 
                              onClick={cancelGeneration}
                              className="mt-2 text-[10px] font-bold text-stone-400 hover:text-red-500 transition-colors"
                            >
                              Hủy quá trình
                            </button>
                          </div>
                        </div>
                      )}
                      <textarea 
                        value={content || streamingContent || ''} 
                        onChange={(e) => setContent(e.target.value)}
                        className="flex-1 w-full bg-transparent text-[#555555] font-serif leading-[2] focus:outline-none resize-none custom-scrollbar min-h-[500px]"
                        placeholder="Nội dung chương truyện..."
                        style={{ fontSize: `${fontSize}px` }}
                      />
                      
                      {/* Stats & AI Suggestion Area */}
                      <div className="mt-8 pt-8 border-t border-stone-100 flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                          <div className="flex gap-4 text-[#777777] text-xs italic">
                            <span>{(content || '').split(/\s+/).filter(Boolean).length} từ</span>
                            <span>{(content || '').length} ký tự</span>
                          </div>
                          <button onClick={handleGenerate} disabled={isGenerating} className="text-[#DB2777] font-bold flex items-center gap-1 text-sm hover:underline"><Sparkles size={16} /> Viết tiếp</button>
                        </div>
                        
                        <div className="flex items-center gap-8">
                          {/* Decorative Text & Butterfly */}
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 text-[#EACFD5]">
                              <Rabbit size={24} className="opacity-50" />
                              <span className="text-[10px] font-serif italic text-stone-400">"The story continues..."</span>
                            </div>
                            <p className="text-xs text-stone-500 font-serif leading-relaxed">
                              Từng câu chữ được dệt nên từ tâm hồn, nơi những giấc mơ bắt đầu nảy mầm...
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Drawer: Chapter List */}
      <AnimatePresence>
        {showDrawer && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDrawer(false)}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="absolute top-0 right-0 bottom-0 w-80 bg-white shadow-2xl z-50 p-6 flex flex-col border-l border-[#FBCFE8]"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-bold text-stone-800 flex items-center">
                  <Menu className="mr-2 text-[#DB2777]" size={24} /> Mục lục
                </h3>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      let isUnsaved = false;
                      if (content.trim()) {
                        if (editingChapterId) {
                          const savedChapter = currentNovel.chapters.find(c => c.id === editingChapterId);
                          if (savedChapter && savedChapter.content !== content) {
                            isUnsaved = true;
                          }
                        } else {
                          isUnsaved = true;
                        }
                      }
                      
                      if (isUnsaved) {
                        setConfirmConfig({
                          title: 'Nội dung chưa lưu',
                          message: 'Nội dung hiện tại chưa lưu sẽ bị mất. Bạn có muốn tiếp tục?',
                          onConfirm: () => {
                            setConfirmConfig(null);
                            setEditingChapterId(null);
                            setContent('');
                            setShowDrawer(false);
                          }
                        });
                        return;
                      }
                      
                      setEditingChapterId(null);
                      setContent('');
                      setShowDrawer(false);
                    }}
                    className="p-2 text-[#DB2777] hover:bg-pink-50 rounded-full transition-colors"
                    title="Chương mới"
                  >
                    <Plus size={24} />
                  </button>
                  <button onClick={() => setShowDrawer(false)} className="text-stone-400 hover:text-stone-600"><X size={24} /></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                {currentNovel && (currentNovel.chapters || []).length === 0 ? (
                  <div className="text-center py-10 text-stone-400 italic">Chưa có chương nào</div>
                ) : (
                  currentNovel && (currentNovel.chapters || []).map((chapter, index) => (
                        <div 
                          key={chapter.id}
                          className={`group p-4 rounded-2xl border transition-all cursor-pointer ${editingChapterId === chapter.id ? 'bg-[#FDF2F8] border-[#FBCFE8]' : 'bg-stone-50 border-stone-100 hover:border-[#FBCFE8]'}`}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <div 
                              className="flex-1"
                              onClick={() => {
                                let isUnsaved = false;
                                if (content.trim()) {
                                  if (editingChapterId) {
                                    const savedChapter = currentNovel.chapters.find(c => c.id === editingChapterId);
                                    if (savedChapter && savedChapter.content !== content) {
                                      isUnsaved = true;
                                    }
                                  } else {
                                    isUnsaved = true;
                                  }
                                }
                                
                                if (isUnsaved) {
                                  setConfirmConfig({
                                    title: 'Nội dung chưa lưu',
                                    message: 'Nội dung hiện tại chưa lưu sẽ bị mất. Bạn có muốn tiếp tục?',
                                    onConfirm: () => {
                                      setConfirmConfig(null);
                                      setEditingChapterId(chapter.id);
                                      setContent(chapter.content);
                                      setShowDrawer(false);
                                    }
                                  });
                                  return;
                                }
                                
                                setEditingChapterId(chapter.id);
                                setContent(chapter.content);
                                setShowDrawer(false);
                              }}
                            >
                              <h4 className={`font-bold ${editingChapterId === chapter.id ? 'text-[#DB2777]' : 'text-stone-700'}`}>
                                Chương {chapter.title}
                              </h4>
                              <p className="text-xs text-stone-400 line-clamp-1">{(chapter.content || '').substring(0, 50)}</p>
                            </div>
                            <div className="flex gap-1">
                              <button 
                                onClick={() => setPreviewChapter(chapter)}
                                className="p-2 text-stone-400 hover:text-[#DB2777] hover:bg-pink-50 rounded-full transition-all"
                                title="Xem lại"
                              >
                                <BookOpen size={16} />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmConfig({
                                    title: 'Xóa chương',
                                    message: 'Bạn có chắc chắn muốn xóa chương này không?',
                                    onConfirm: () => {
                                      setConfirmConfig(null);
                                      const updatedChapters = currentNovel.chapters.filter(ch => ch.id !== chapter.id);
                                      updateCurrentNovel({ chapters: updatedChapters });
                                      if (editingChapterId === chapter.id) {
                                        setEditingChapterId(null);
                                        setContent('');
                                      }
                                    }
                                  });
                                }}
                                className="p-2 text-stone-300 hover:text-red-500 transition-all"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Chapter Preview Modal */}
      <AnimatePresence>
        {previewChapter && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewChapter(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="relative bg-white rounded-3xl p-8 max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h3 className="text-2xl font-bold text-stone-800">Chương {previewChapter.title}</h3>
                <button onClick={() => setPreviewChapter(null)} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 text-stone-700 font-serif text-lg leading-relaxed whitespace-pre-wrap">
                {previewChapter.content}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirmId(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center"
            >
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={40} />
              </div>
              <h3 className="text-2xl font-bold text-stone-800 mb-2">Xóa cuốn sổ?</h3>
              <p className="text-stone-500 mb-8">Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa cuốn sổ này không?</p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-3 px-6 rounded-xl font-bold text-stone-500 hover:bg-stone-100 transition-colors"
                >
                  Hủy
                </button>
                <button 
                  onClick={() => deleteNovel(deleteConfirmId)}
                  className="flex-1 py-3 px-6 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                >
                  Xóa ngay
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Plot Suggestion Prompt */}
      <AnimatePresence>
        {showPlotPrompt && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[150] w-[90%] max-w-2xl"
          >
            <div className="bg-white/95 backdrop-blur-xl border border-[#FBCFE8] shadow-2xl rounded-3xl p-6 relative">
              <button 
                onClick={() => setShowPlotPrompt(false)}
                className="absolute top-4 right-4 p-1 text-stone-400 hover:text-stone-600 transition-colors"
              >
                <X size={20} />
              </button>
              <h4 className="text-[#DB2777] font-bold mb-3 flex items-center gap-2">
                <Sparkles size={18} />
                Lên kế hoạch cho chương tiếp theo
              </h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1 ml-1">Ý tưởng cốt truyện (Plot)</label>
                  <textarea 
                    value={userPlot}
                    onChange={(e) => setUserPlot(e.target.value)}
                    placeholder="Nhập ý tưởng của bạn (để trống nếu muốn AI tự triển khai)..."
                    className="w-full p-4 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-2 focus:ring-[#DB2777] outline-none text-sm resize-none h-24 custom-scrollbar"
                  />
                </div>
                
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1 ml-1">Độ dài chương tiếp theo (số chữ)</label>
                    <input 
                      type="number"
                      value={nextChapterLength}
                      onChange={(e) => setNextChapterLength(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder={`Mặc định: ${currentNovel?.chapterLength || 1000}`}
                      className="w-full p-3 bg-stone-50 border border-stone-100 rounded-xl focus:ring-2 focus:ring-[#DB2777] outline-none text-sm"
                    />
                  </div>
                  <button 
                    onClick={() => {
                      setShowPlotPrompt(false);
                      handleGenerate();
                    }}
                    className="px-8 py-3 bg-[#DB2777] text-white rounded-xl hover:bg-[#BE185D] transition-all shadow-lg shadow-pink-100 font-bold flex items-center gap-2"
                  >
                    <Send size={18} />
                    <span>Sáng tác ngay</span>
                  </button>
                </div>
                <p className="text-[10px] text-stone-400 italic">* Hệ thống sẽ tuân thủ nghiêm ngặt độ dài và ý tưởng bạn yêu cầu.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reopen Plot Prompt Toggle (Rabbit Icon) */}
      {!showPlotPrompt && currentNovelId && activeTab === 'editor' && (
        <div className="fixed bottom-8 left-8 z-[150] flex flex-col gap-3">
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            onClick={() => setShowPlotPrompt(true)}
            className="p-2 bg-white text-[#DB2777] rounded-full shadow-lg border border-pink-50 hover:scale-110 transition-transform group relative"
            title="Gợi ý Plot cho chương sau"
          >
            <Sparkles size={16} />
            {userPlot && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-white" />
            )}
          </motion.button>

          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            onClick={() => {
              setShowGossipGroup(true);
              if (npcComments.length === 0) handleGenerateGossip();
            }}
            className="p-2 bg-white text-[#DB2777] rounded-full shadow-lg border border-pink-50 hover:scale-110 transition-transform group"
            title="Hội nhóm NPC bàn tán"
          >
            <Heart size={16} className="fill-[#DB2777]" />
          </motion.button>
        </div>
      )}

      {/* Gossip Group Modal */}
      <AnimatePresence>
        {showGossipGroup && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowGossipGroup(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl h-[80vh] bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-pink-100"
              style={{
                backgroundImage: currentNovel?.npcGlobalBackground ? `url(${currentNovel.npcGlobalBackground})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              <div className={`p-6 flex justify-between items-center border-b border-pink-100 ${currentNovel?.npcGlobalBackground ? 'bg-white/80 backdrop-blur-md' : 'bg-white'}`}>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-pink-50 text-[#DB2777] rounded-2xl">
                    <Users size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-stone-800">Hội Nhóm Lắm Chuyện</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">{currentNovel.npcCount || 500} NPC đang bàn tán</p>
                      <div className="flex gap-1">
                        {[500, 5000].map(count => (
                          <button 
                            key={count}
                            onClick={() => updateCurrentNovel({ npcCount: count })}
                            className={`text-[8px] px-1.5 py-0.5 rounded-full border transition-all ${currentNovel.npcCount === count ? 'bg-[#DB2777] text-white border-[#DB2777]' : 'bg-white text-stone-400 border-stone-200 hover:border-[#DB2777]'}`}
                          >
                            {count}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={handleGenerateGossip}
                    disabled={isGeneratingGossip}
                    className="p-3 text-[#DB2777] hover:bg-pink-50 rounded-2xl transition-all disabled:opacity-50"
                    title="Làm mới bình luận"
                  >
                    <Sparkles size={20} className={isGeneratingGossip ? 'animate-spin' : ''} />
                  </button>
                  <button onClick={() => setShowGossipGroup(false)} className="p-3 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-2xl transition-all">
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {isGeneratingGossip ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-10">
                    <div className="w-16 h-16 border-4 border-pink-100 border-t-[#DB2777] rounded-full animate-spin mb-6" />
                    <h4 className="text-xl font-bold text-stone-700 mb-2">Đang tạo NPC...</h4>
                    <p className="text-stone-400 mb-6">Đã tạo: {npcProgress}/5000</p>
                    <div className="w-full bg-stone-200 rounded-full h-2.5 mb-6">
                      <div className="bg-[#DB2777] h-2.5 rounded-full" style={{ width: `${(npcProgress / 5000) * 100}%` }}></div>
                    </div>
                    <button 
                      onClick={cancelGossipGeneration}
                      className="px-6 py-2 bg-white text-stone-500 hover:text-red-500 hover:bg-red-50 rounded-full font-bold shadow-sm border border-stone-200 transition-all"
                    >
                      Hủy kết nối
                    </button>
                  </div>
                ) : npcComments.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-10">
                    <MessageSquare size={64} className="text-stone-200 mb-6" />
                    <h4 className="text-xl font-bold text-stone-400 mb-2">Chưa có ai bàn tán</h4>
                    <p className="text-stone-300">Hãy viết xong một chương để các NPC có chuyện để nói!</p>
                  </div>
                ) : (
                  (npcComments || []).map((comment) => (
                    <motion.div 
                      key={comment.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex gap-4 group"
                    >
                      <img src={comment.npcAvatar} alt={comment.npcName} className="w-12 h-12 rounded-2xl shadow-md border-2 border-white flex-shrink-0" />
                      <div className="flex-1">
                        <div className="bg-white/90 backdrop-blur-sm p-4 rounded-3xl rounded-tl-none shadow-sm border border-pink-50 group-hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-stone-800 text-sm">{comment.npcName}</span>
                              <span className="px-2 py-0.5 bg-pink-50 text-[#DB2777] text-[10px] font-bold rounded-full uppercase tracking-tighter">{comment.npcRole}</span>
                            </div>
                            <span className="text-[10px] text-stone-400">{comment.timestamp}</span>
                          </div>
                          <p className="text-stone-600 text-sm leading-relaxed">{comment.content}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              <div className={`p-6 border-t border-pink-100 ${currentNovel?.npcGlobalBackground ? 'bg-white/80 backdrop-blur-md' : 'bg-white'}`}>
                <div className="flex gap-3">
                  <input 
                    type="text" 
                    placeholder="Bạn cũng muốn tham gia cãi nhau? (Tính năng sắp ra mắt)" 
                    disabled
                    className="flex-1 p-4 bg-stone-50 border border-stone-100 rounded-2xl text-sm outline-none opacity-50 cursor-not-allowed"
                  />
                  <button disabled className="p-4 bg-stone-200 text-stone-400 rounded-2xl cursor-not-allowed">
                    <Send size={20} />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Direction Selection Modal */}
      <AnimatePresence>
        {showDirectionModal && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl"
            >
              <h3 className="text-xl font-bold text-stone-800 mb-6 text-center">Chọn hướng triển khai</h3>
              <div className="space-y-3">
                {directions.map(dir => (
                  <button 
                    key={dir}
                    onClick={() => {
                      setSelectedDirection(dir);
                      setShowDirectionModal(false);
                      // Trigger generation logic here with dir
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-stone-50 hover:bg-[#FBCFE8] hover:text-[#DB2777] transition-all font-medium flex items-center justify-between group"
                  >
                    {dir}
                    <Heart size={16} className="text-transparent group-hover:text-[#DB2777] transition-colors" />
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-2xl shadow-2xl z-[300] flex items-center gap-3"
          >
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
              <Sparkles size={14} />
            </div>
            <span className="font-medium">{successMessage}</span>
            <button onClick={() => setSuccessMessage(null)} className="ml-4 text-white/60 hover:text-white transition-colors"><X size={16} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Confirmation Modal */}
      <AnimatePresence>
        {confirmConfig && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmConfig(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center"
            >
              <h3 className="text-2xl font-bold text-stone-800 mb-2">{confirmConfig.title}</h3>
              <p className="text-stone-500 mb-8">{confirmConfig.message}</p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setConfirmConfig(null)}
                  className="flex-1 py-3 px-6 rounded-xl font-bold text-stone-500 hover:bg-stone-100 transition-colors"
                >
                  Hủy
                </button>
                <button 
                  onClick={confirmConfig.onConfirm}
                  className="flex-1 py-3 px-6 rounded-xl font-bold bg-[#DB2777] text-white hover:bg-[#BE185D] transition-colors shadow-lg shadow-[#DB2777]/20"
                >
                  Xác nhận
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Error Toast */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-2xl shadow-2xl z-[300] flex items-center gap-3"
          >
            <X size={20} />
            <span className="font-medium">{error}</span>
            <button onClick={() => setError(null)} className="ml-4 underline text-xs">Đóng</button>
          </motion.div>
        )}
      </AnimatePresence>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NovelScreen;
