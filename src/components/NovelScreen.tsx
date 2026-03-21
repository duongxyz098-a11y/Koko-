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
  Heart
} from 'lucide-react';

interface Chapter {
  id: string;
  title: string;
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
  lastModified: number;
  settings: {
    proxyEndpoint: string;
    proxyKey: string;
    model: string;
    isSetupComplete: boolean;
  };
}

interface NovelScreenProps {
  onBack: () => void;
}

const NovelScreen: React.FC<NovelScreenProps> = ({ onBack }) => {
  // Library State
  const [novels, setNovels] = useState<Novel[]>(() => {
    const saved = localStorage.getItem('novel_library_v3');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentNovelId, setCurrentNovelId] = useState<string | null>(null);
  
  // UI States
  const [showSettings, setShowSettings] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(24);
  const [previewChapter, setPreviewChapter] = useState<Chapter | null>(null);
  const [userPlot, setUserPlot] = useState('');
  const [nextChapterLength, setNextChapterLength] = useState<number | ''>('');
  const [showPlotPrompt, setShowPlotPrompt] = useState(false);
  
  const coverInputRef = useRef<HTMLInputElement>(null);
  const editorBgInputRef = useRef<HTMLInputElement>(null);

  // Current Novel State (Derived)
  const currentNovel = novels.find(n => n.id === currentNovelId);

  // Persistence
  useEffect(() => {
    localStorage.setItem('novel_library_v3', JSON.stringify(novels));
  }, [novels]);

  // Fetch Models
  const fetchModels = async () => {
    if (!currentNovel) return;
    const { proxyEndpoint, proxyKey } = currentNovel.settings;
    if (!proxyEndpoint || !proxyKey) return;
    
    try {
      setError(null);
      let url = proxyEndpoint.trim();
      if (!url.startsWith('http')) url = 'https://' + url;
      
      const modelsUrl = url.toLowerCase().endsWith('/v1') 
        ? `${url}/models` 
        : url.toLowerCase().includes('/v1/') 
          ? `${url.split('/v1/')[0]}/v1/models`
          : `${url}/v1/models`;

      const response = await fetch(modelsUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${proxyKey}`,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Không thể tải danh sách model.');
      const data = await response.json();
      const rawModels = data.data || data.models || [];
      const modelIds = rawModels.map((m: any) => (typeof m === 'string' ? m : m.id));
      setAvailableModels(modelIds);
    } catch (err) {
      console.error('Error fetching models:', err);
      setError('Lỗi kết nối API.');
    }
  };

  // Novel Management
  const createNewNovel = () => {
    const newNovel: Novel = {
      id: Date.now().toString(),
      storyName: 'Tiểu thuyết mới',
      characterName: '',
      genre: '',
      chapterLength: 1000,
      chapters: [],
      coverImage: '',
      editorBackgroundImage: '',
      lastModified: Date.now(),
      settings: {
        proxyEndpoint: '',
        proxyKey: '',
        model: '',
        isSetupComplete: false
      }
    };
    setNovels([newNovel, ...novels]);
    setCurrentNovelId(newNovel.id);
    setShowSettings(true);
  };

  const deleteNovel = (id: string) => {
    setNovels(novels.filter(n => n.id !== id));
    if (currentNovelId === id) setCurrentNovelId(null);
    setDeleteConfirmId(null);
  };

  const updateCurrentNovel = (updates: Partial<Novel>) => {
    if (!currentNovelId) return;
    setNovels(novels.map(n => 
      n.id === currentNovelId 
        ? { ...n, ...updates, lastModified: Date.now() } 
        : n
    ));
  };

  const updateSettings = (updates: Partial<Novel['settings']>) => {
    if (!currentNovel) return;
    updateCurrentNovel({
      settings: { ...currentNovel.settings, ...updates }
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'cover' | 'editorBg') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'cover') {
          updateCurrentNovel({ coverImage: reader.result as string });
        } else {
          updateCurrentNovel({ editorBackgroundImage: reader.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Editor Logic
  const [content, setContent] = useState('');
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'setup' | 'editor'>('setup');

  const handleGenerate = async () => {
    if (!currentNovel) return;
    const { proxyEndpoint, proxyKey, model } = currentNovel.settings;
    if (!proxyEndpoint || !proxyKey || !model) {
      setError('Vui lòng hoàn tất cài đặt API.');
      setShowSettings(true);
      setActiveTab('setup');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Lấy bối cảnh rộng hơn từ các chương trước (tối đa 5 chương gần nhất)
      const context = currentNovel.chapters.slice(-5).map(ch => 
        `Chương ${ch.title}: ${ch.content.substring(0, 1000)}...`
      ).join('\n\n');

      const systemInstruction = `Bạn là một nhà văn chuyên nghiệp tài ba, có khả năng viết lách xuất sắc và tư duy cốt truyện logic.
QUY TẮC BẮT BUỘC:
1. TUYỆT ĐỐI KHÔNG bao giờ nhắc đến việc mình là AI, hệ thống, hay bất kỳ thông tin kỹ thuật nào. Bạn CHỈ là một nhà văn.
2. KHÔNG ĐƯỢC viết ngắt quãng. Phải hoàn thành toàn bộ chương truyện trong một lần trả lời duy nhất.
3. KHÔNG ĐƯỢC tự ý cắt câu hay kết thúc lửng lơ khi chưa đạt đủ dung lượng yêu cầu.
4. PHẢI ghi nhớ và liên kết chặt chẽ với các chương trước. Phát triển cốt truyện tiếp nối, không nhắc lại những gì đã xảy ra một cách thừa thãi.
5. Văn phong phải mượt mà, giàu hình ảnh, cảm xúc và phù hợp với thể loại truyện.`;

      const userPrompt = `Hãy viết chương tiếp theo cho tiểu thuyết "${currentNovel.storyName}".
THÔNG TIN TRUYỆN:
- Thể loại: ${currentNovel.genre}
- Nhân vật chính: ${currentNovel.characterName}
- Độ dài yêu cầu: Khoảng ${nextChapterLength || currentNovel.chapterLength} chữ/từ.

${userPlot ? `YÊU CẦU CỐT TRUYỆN RIÊNG TỪ TÁC GIẢ (ƯU TIÊN):
${userPlot}
Hãy triển khai chương này dựa trên ý tưởng trên của tác giả.` : ''}

BỐI CẢNH CÁC CHƯƠNG TRƯỚC:
${context || 'Đây là chương đầu tiên, hãy bắt đầu một cách ấn tượng.'}

YÊU CẦU NỘI DUNG:
- Viết chương mới hoàn chỉnh, không bị cắt ngang.
- Đảm bảo sự liên kết logic với bối cảnh đã cho.
- Tập trung vào diễn biến tâm lý và hành động của nhân vật ${currentNovel.characterName}.
- KHÔNG nhắc lại nội dung cũ, hãy triển khai tình tiết mới.
- PHẢI VIẾT ĐỦ ĐỘ DÀI YÊU CẦU (${nextChapterLength || currentNovel.chapterLength} chữ/từ), không được dừng lại cho đến khi đủ dung lượng.`;

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
          temperature: 0.7,
          max_tokens: Math.max(3000, (nextChapterLength || currentNovel.chapterLength) * 3) // Tăng max_tokens để đảm bảo đủ độ dài
        })
      });

      if (!response.ok) throw new Error('API request failed');
      const data = await response.json();
      const generatedContent = data.choices[0].message.content;
      setContent(generatedContent);
      setEditingChapterId(null);
      setActiveTab('editor');
      setShowPlotPrompt(true); 
      // Reset plot và độ dài sau khi tạo xong chương mới
      setUserPlot('');
      setNextChapterLength('');
    } catch (err) {
      console.error(err);
      setError('Lỗi khi tạo nội dung.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    if (!currentNovel || !content.trim()) return;
    
    if (editingChapterId) {
      const updatedChapters = currentNovel.chapters.map(ch => 
        ch.id === editingChapterId ? { ...ch, content } : ch
      );
      updateCurrentNovel({ chapters: updatedChapters });
    } else {
      const newChapter: Chapter = {
        id: Date.now().toString(),
        title: (currentNovel.chapters.length + 1).toString(),
        content,
        timestamp: new Date().toLocaleString()
      };
      updateCurrentNovel({ chapters: [...currentNovel.chapters, newChapter] });
    }
    
    alert('Đã lưu chương thành công!');
    setContent('');
    setEditingChapterId(null);
  };

  // Library View
  if (!currentNovelId) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-full w-full bg-[#FAF7F2] p-6 overflow-y-auto custom-scrollbar"
      >
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center">
              <button onClick={onBack} className="p-2 mr-4 text-stone-700 hover:bg-stone-200 rounded-full transition-colors">
                <ArrowLeft size={24} />
              </button>
              <h1 className="text-3xl font-bold text-stone-800 flex items-center tracking-tight">
                <Library className="mr-3 text-[#DB2777]" size={32} /> Thư viện của tôi
              </h1>
            </div>
            <button 
              onClick={createNewNovel}
              className="flex items-center gap-2 px-6 py-3 bg-[#DB2777] text-white rounded-xl font-bold hover:bg-[#BE185D] transition-all shadow-lg hover:shadow-[#DB2777]/20"
            >
              <Plus size={20} />
              <span>Cuốn sổ mới</span>
            </button>
          </div>

          {novels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-stone-400">
              <BookOpen size={80} className="mb-6 opacity-10" />
              <p className="text-xl font-medium mb-2">Chưa có cuốn sổ nào</p>
              <p className="text-sm">Hãy tạo cuốn sổ đầu tiên để bắt đầu hành trình sáng tác.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {novels.map(novel => (
                <motion.div
                  key={novel.id}
                  whileHover={{ y: -10 }}
                  onClick={() => {
                    setCurrentNovelId(novel.id);
                    setActiveTab('setup');
                  }}
                  className="group relative h-[400px] rounded-2xl overflow-hidden shadow-xl cursor-pointer bg-white border border-stone-100"
                >
                  {novel.coverImage ? (
                    <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" style={{ backgroundImage: `url('${novel.coverImage}')` }} />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#FDF2F8] to-[#FCE7F3]" />
                  )}
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
                  
                  <div className="absolute inset-0 p-6 flex flex-col justify-end text-white">
                    <div className="backdrop-blur-md bg-black/30 p-4 rounded-xl border border-white/20">
                      <h3 className="text-xl font-bold mb-1 line-clamp-1">{novel.storyName}</h3>
                      <p className="text-xs opacity-80 mb-3">{novel.genre || 'Chưa chọn thể loại'} • {novel.chapters.length} chương</p>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] uppercase tracking-wider font-bold opacity-60">
                          Sửa: {new Date(novel.lastModified).toLocaleDateString()}
                        </span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(novel.id);
                          }}
                          className="p-2 text-white/60 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // Editor View
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
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
                <input type="file" accept="image/*" className="hidden" ref={coverInputRef} onChange={(e) => handleImageUpload(e, 'cover')} />
                <input type="file" accept="image/*" className="hidden" ref={editorBgInputRef} onChange={(e) => handleImageUpload(e, 'editorBg')} />
                <button onClick={() => coverInputRef.current?.click()} title="Đổi ảnh bìa" className="p-2 text-stone-700 hover:bg-white/40 rounded-full transition-colors"><ImageIcon size={20} className="text-[#DB2777]" /></button>
                <button onClick={() => editorBgInputRef.current?.click()} title="Đổi ảnh nền viết truyện" className="p-2 text-stone-700 hover:bg-white/40 rounded-full transition-colors"><ImageIcon size={20} /></button>
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
                <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
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
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="block text-xs font-semibold text-stone-500 uppercase mb-1 ml-1">Chọn Model</label>
                          <select value={currentNovel.settings.model} onChange={(e) => updateSettings({ model: e.target.value })} className="w-full p-3 bg-white rounded-xl border border-[#FBCFE8] focus:ring-2 focus:ring-[#DB2777] outline-none transition-all appearance-none">
                            <option value="">-- Chọn Model --</option>
                            {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </div>
                        <div className="flex items-end">
                          <button onClick={fetchModels} className="px-6 py-3 bg-[#BE185D] text-white rounded-xl font-bold hover:bg-[#9D174D] transition-colors shadow-lg">Tải Model</button>
                        </div>
                      </div>
                      <button onClick={() => {
                        if (currentNovel.settings.proxyEndpoint && currentNovel.settings.proxyKey && currentNovel.settings.model) {
                          updateSettings({ isSetupComplete: true });
                          alert('Đã lưu cấu hình!');
                        } else {
                          alert('Vui lòng hoàn tất cài đặt.');
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
                          onClick={() => coverInputRef.current?.click()}
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
                          onClick={() => editorBgInputRef.current?.click()}
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
                    </div>
                  </div>

                  {/* Story Info */}
                  <div className="bg-white/90 backdrop-blur-lg p-8 rounded-3xl border border-[#FBCFE8] shadow-xl">
                    <h2 className="font-bold text-[#BE185D] text-lg flex items-center mb-6">
                      <User className="mr-2" size={20} /> Thông tin truyện
                    </h2>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1 ml-1">Tên câu chuyện</label>
                        <input type="text" placeholder="Tên câu chuyện" value={currentNovel.storyName} onChange={(e) => updateCurrentNovel({ storyName: e.target.value })} className="w-full p-3 bg-white rounded-xl border border-[#FBCFE8] focus:ring-2 focus:ring-[#DB2777] outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1 ml-1">Tên nhân vật</label>
                        <input type="text" placeholder="Tên nhân vật" value={currentNovel.characterName} onChange={(e) => updateCurrentNovel({ characterName: e.target.value })} className="w-full p-3 bg-white rounded-xl border border-[#FBCFE8] focus:ring-2 focus:ring-[#DB2777] outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1 ml-1">Thể loại</label>
                        <input type="text" placeholder="Thể loại" value={currentNovel.genre} onChange={(e) => updateCurrentNovel({ genre: e.target.value })} className="w-full p-3 bg-white rounded-xl border border-[#FBCFE8] focus:ring-2 focus:ring-[#DB2777] outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1 ml-1">Độ dài chương (từ)</label>
                        <input type="number" value={currentNovel.chapterLength} onChange={(e) => updateCurrentNovel({ chapterLength: Number(e.target.value) })} className="w-full p-3 bg-white rounded-xl border border-[#FBCFE8] focus:ring-2 focus:ring-[#DB2777] outline-none" />
                      </div>
                      
                      <button 
                        onClick={handleGenerate} 
                        disabled={isGenerating} 
                        className={`w-full p-4 rounded-2xl font-bold text-white shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 ${isGenerating ? 'bg-stone-400 cursor-not-allowed' : 'bg-gradient-to-r from-[#DB2777] to-[#BE185D] hover:shadow-[#DB2777]/20'}`}
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
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="editor"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`h-full w-full overflow-y-auto custom-scrollbar transition-all duration-500 ${isFocusMode ? 'p-0 bg-white' : 'p-0'}`}
              >
                <div className="w-full h-full flex flex-col">
                  <div className={`flex flex-col relative transition-all duration-500 h-full ${isFocusMode ? 'p-4 md:p-8' : 'p-8 md:p-16 bg-white/40'}`}>
                    <div className={`flex justify-between items-center mb-8 pb-4 border-b border-stone-200/50 ${isFocusMode ? 'max-w-5xl mx-auto w-full' : ''}`}>
                      <div className="flex items-center gap-4">
                        {isFocusMode && (
                          <button 
                            onClick={() => setIsFocusMode(false)}
                            className="p-2 text-stone-400 hover:text-[#DB2777] hover:bg-pink-50 rounded-full transition-all"
                            title="Thoát chế độ tập trung"
                          >
                            <ArrowLeft size={24} />
                          </button>
                        )}
                        <h2 className="text-2xl font-serif font-bold text-stone-800 italic">
                          {editingChapterId ? `Chương ${currentNovel.chapters.find(c => c.id === editingChapterId)?.title}` : `Chương ${currentNovel.chapters.length + 1}`}
                        </h2>
                      </div>
                      <div className="flex items-center gap-6">
                        {/* Font Size Controls */}
                        <div className="flex items-center bg-stone-100 rounded-full px-3 py-1 gap-3">
                          <button 
                            onClick={() => setFontSize(Math.max(12, fontSize - 2))}
                            className="text-stone-500 hover:text-[#DB2777] font-bold text-lg p-1"
                          >
                            A-
                          </button>
                          <span className="text-xs font-bold text-stone-400 w-8 text-center">{fontSize}</span>
                          <button 
                            onClick={() => setFontSize(Math.min(48, fontSize + 2))}
                            className="text-stone-500 hover:text-[#DB2777] font-bold text-lg p-1"
                          >
                            A+
                          </button>
                        </div>

                        <div className="flex gap-3">
                          <button 
                            onClick={() => setShowDrawer(true)}
                            className="p-3 text-stone-400 hover:text-[#DB2777] hover:bg-pink-50 rounded-full transition-all"
                            title="Mục lục & Xem lại"
                          >
                            <Menu size={24} />
                          </button>
                          <button 
                            onClick={() => setIsFocusMode(!isFocusMode)}
                            className={`p-3 rounded-full transition-all ${isFocusMode ? 'bg-[#DB2777] text-white' : 'text-stone-400 hover:text-[#DB2777] hover:bg-pink-50'}`}
                            title={isFocusMode ? "Thoát chế độ tập trung" : "Chế độ tập trung"}
                          >
                            <Sparkles size={24} />
                          </button>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(content);
                              alert('Đã sao chép!');
                            }}
                            className="p-3 text-stone-400 hover:text-stone-600 hover:bg-stone-50 rounded-full transition-all"
                            title="Sao chép"
                          >
                            <Type size={24} />
                          </button>
                          <button 
                            onClick={handleSave} 
                            className="flex items-center gap-2 px-8 py-3 bg-[#DB2777] text-white rounded-full hover:bg-[#BE185D] transition-all shadow-md hover:shadow-lg font-bold"
                          >
                            <Save size={20} />
                            <span>Lưu chương</span>
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {isGenerating && (
                      <div className={`absolute inset-0 z-10 bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center ${isFocusMode ? '' : ''}`}>
                        <div className="w-12 h-12 border-4 border-[#DB2777]/20 border-t-[#DB2777] rounded-full animate-spin mb-4" />
                        <p className="text-[#DB2777] font-bold animate-pulse">AI đang mài giũa từng câu chữ...</p>
                      </div>
                    )}

                    <div className={`flex-1 flex flex-col ${isFocusMode ? 'max-w-5xl mx-auto w-full' : ''}`}>
                      <textarea 
                        value={content} 
                        onChange={(e) => setContent(e.target.value)}
                        className="flex-1 w-full bg-transparent text-stone-700 font-serif leading-[2.2] focus:outline-none resize-none custom-scrollbar"
                        placeholder="Nội dung chương truyện sẽ hiện ra ở đây..."
                        style={{ 
                          fontSize: `${fontSize}px`,
                          minHeight: '100%' 
                        }}
                      />
                    </div>
                    
                    <div className={`mt-8 pt-6 border-t border-stone-200/50 flex justify-between items-center text-stone-400 italic text-sm ${isFocusMode ? 'max-w-5xl mx-auto w-full' : ''}`}>
                      <div className="flex gap-6">
                        <span>{content.split(/\s+/).filter(Boolean).length} từ</span>
                        <span>{content.length} ký tự</span>
                      </div>
                      <div className="flex gap-4">
                        <button 
                          onClick={handleGenerate}
                          className="text-[#DB2777] hover:underline font-bold flex items-center gap-1"
                        >
                          <Sparkles size={16} /> Viết tiếp...
                        </button>
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
                <button onClick={() => setShowDrawer(false)} className="text-stone-400 hover:text-stone-600"><X size={24} /></button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                {currentNovel.chapters.length === 0 ? (
                  <div className="text-center py-10 text-stone-400 italic">Chưa có chương nào</div>
                ) : (
                      currentNovel.chapters.map((chapter, index) => (
                        <div 
                          key={chapter.id}
                          className={`group p-4 rounded-2xl border transition-all cursor-pointer ${editingChapterId === chapter.id ? 'bg-[#FDF2F8] border-[#FBCFE8]' : 'bg-stone-50 border-stone-100 hover:border-[#FBCFE8]'}`}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <div 
                              className="flex-1"
                              onClick={() => {
                                if (content.trim() && !window.confirm('Nội dung hiện tại chưa lưu sẽ bị mất. Bạn có muốn tiếp tục?')) return;
                                setEditingChapterId(chapter.id);
                                setContent(chapter.content);
                                setShowDrawer(false);
                              }}
                            >
                              <h4 className={`font-bold ${editingChapterId === chapter.id ? 'text-[#DB2777]' : 'text-stone-700'}`}>
                                Chương {chapter.title}
                              </h4>
                              <p className="text-xs text-stone-400 line-clamp-1">{chapter.content.substring(0, 50)}</p>
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
                                  if (window.confirm('Xóa chương này?')) {
                                    const updatedChapters = currentNovel.chapters.filter(ch => ch.id !== chapter.id);
                                    updateCurrentNovel({ chapters: updatedChapters });
                                    if (editingChapterId === chapter.id) {
                                      setEditingChapterId(null);
                                      setContent('');
                                    }
                                  }
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

      {/* Reopen Plot Prompt Toggle (Heart Icon) */}
      {!showPlotPrompt && currentNovelId && activeTab === 'editor' && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={() => setShowPlotPrompt(true)}
          className="fixed bottom-8 left-8 z-[150] p-2 bg-white text-[#DB2777] rounded-full shadow-lg border border-pink-50 hover:scale-110 transition-transform group"
          title="Gợi ý Plot cho chương sau"
        >
          <Heart size={16} className={userPlot ? "fill-[#DB2777]" : ""} />
          {userPlot && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-white" />
          )}
        </motion.button>
      )}

      {/* Error Toast */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-2xl shadow-2xl z-[100] flex items-center gap-3"
          >
            <X size={20} />
            <span className="font-medium">{error}</span>
            <button onClick={() => setError(null)} className="ml-4 underline text-xs">Đóng</button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default NovelScreen;
