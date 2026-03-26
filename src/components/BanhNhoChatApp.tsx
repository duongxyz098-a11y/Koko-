import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Settings, Database, List, Instagram, Clock, Key, CreditCard, Info, Image as ImageIcon, Youtube, Users, BookOpen, FileText, Shield, Wallet, Mic, Video, Globe, Plus } from 'lucide-react';
import { safeSetItem } from '../utils/storage';
import { compressImage } from '../utils/imageUtils';
import { fetchAvailableModels, ApiProxySettings } from '../utils/apiProxy';
import { saveToDB, getAllFromDB } from '../utils/indexedDB';
import Tab1CreateBot from './banhnho/Tab1CreateBot';
import CarrdProfile from './CarrdProfile';

interface Character {
  id: string;
  name: string;
  createdAt: number;
}

// Helper component for tab layout with background support
const TabWrapper = ({ children, bg, onBgUpload }: { children: React.ReactNode, bg?: string, onBgUpload: (e: React.ChangeEvent<HTMLInputElement>) => void }) => {
  return (
    <div className="h-full relative bg-[#FAF9F6] overflow-hidden">
      {/* Background Image */}
      {bg && (
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{ 
            backgroundImage: `url('${bg}')`
          }}
        />
      )}
      
      {/* Grain / noise nhẹ */}
      <div className="absolute inset-0 z-0 opacity-[0.02] pointer-events-none mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

      {/* Upload Button */}
      <div className="absolute top-4 right-4 z-20">
        <label 
          className="p-2 bg-white/40 rounded-full hover:bg-white/60 shadow-sm border border-white/20 transition-all cursor-pointer flex items-center justify-center"
          title="Đổi ảnh nền"
        >
          <ImageIcon size={20} className="text-[#F3B4C2]" />
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            onChange={onBgUpload} 
          />
        </label>
      </div>

      {/* Content Area */}
      <div className="relative z-10 h-full overflow-y-auto">
        {children}
      </div>
    </div>
  );
};

export default function BanhNhoChatApp({ onBack }: { onBack: () => void }) {
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('banhnho_active_tab') || 'tab1');
  const [subTab, setSubTab] = useState<string | null>(() => localStorage.getItem('banhnho_sub_tab'));

  // Multi-character state
  const [characters, setCharacters] = useState<Character[]>(() => {
    const saved = localStorage.getItem('banhnho_characters');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    // Default character if none exist
    return [{ id: 'default', name: 'Nhân vật mặc định', createdAt: Date.now() }];
  });

  const [activeCharacterId, setActiveCharacterId] = useState(() => {
    return localStorage.getItem('banhnho_active_character_id') || 'default';
  });

  useEffect(() => {
    localStorage.setItem('banhnho_characters', JSON.stringify(characters));
  }, [characters]);

  useEffect(() => {
    localStorage.setItem('banhnho_active_character_id', activeCharacterId);
  }, [activeCharacterId]);

  const handleCreateCharacter = () => {
    const newId = `char_${Date.now()}`;
    const newChar: Character = {
      id: newId,
      name: 'Nhân vật mới',
      createdAt: Date.now()
    };
    setCharacters(prev => [...prev, newChar]);
    setActiveCharacterId(newId);
    setSubTab(null); // Go to setup
    showToast("Đã tạo nhân vật mới! Hãy bắt đầu thiết lập.");
  };

  const handleDeleteCharacter = (id: string) => {
    if (id === 'default' && characters.length === 1) {
      showToast("Không thể xóa nhân vật cuối cùng.");
      return;
    }
    const updated = characters.filter(c => c.id !== id);
    setCharacters(updated);
    if (activeCharacterId === id) {
      setActiveCharacterId(updated[0]?.id || 'default');
    }
    showToast("Đã xóa nhân vật.");
  };

  const updateCharacterName = (id: string, newName: string) => {
    setCharacters(prev => prev.map(c => c.id === id ? { ...c, name: newName } : c));
  };

  useEffect(() => {
    localStorage.setItem('banhnho_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (subTab) {
      localStorage.setItem('banhnho_sub_tab', subTab);
    } else {
      localStorage.removeItem('banhnho_sub_tab');
    }
  }, [subTab]);

  // API Proxy Settings
  const [apiSettings, setApiSettings] = useState<ApiProxySettings>(() => {
    const saved = localStorage.getItem('banhnho_api_settings');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      endpoint: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-3.5-turbo',
      maxTokens: 30000,
      isUnlimited: false,
      timeoutMinutes: 2
    };
  });

  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);

  const handleFetchModels = async () => {
    setIsFetchingModels(true);
    try {
      const models = await fetchAvailableModels(apiSettings.endpoint, apiSettings.apiKey);
      if (models.length > 0) {
        setAvailableModels(models);
        if (!models.includes(apiSettings.model)) {
          setApiSettings({ ...apiSettings, model: models[0] });
        }
        showToast(`Đã tải thành công ${models.length} models! Vui lòng chọn model ở bên dưới.`);
      } else {
        showToast("Không tìm thấy model nào từ API này. Bạn có thể nhập tên model thủ công.");
      }
    } catch (error: any) {
      showToast(`Không thể lấy danh sách model tự động: ${error.message}`);
    } finally {
      setIsFetchingModels(false);
    }
  };

  const saveApiSettings = () => {
    safeSetItem('banhnho_api_settings', JSON.stringify(apiSettings));
    setIsSettingsSaved(true);
    showToast('Đã lưu cấu hình API thành công! Hệ thống đã sẵn sàng xử lý dữ liệu lớn.');
    setTimeout(() => setIsSettingsSaved(false), 2000);
  };

  // Saved Profiles
  const [savedProfiles, setSavedProfiles] = useState<ApiProxySettings[]>(() => {
    const saved = localStorage.getItem('banhnho_api_profiles');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });
  const [profileName, setProfileName] = useState('');
  const [isProfileSaved, setIsProfileSaved] = useState(false);
  const [isSettingsSaved, setIsSettingsSaved] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveProfile = () => {
    if (!profileName.trim()) {
      showToast("Vui lòng nhập tên cho cấu hình này (VD: OpenAI, Claude...)");
      return;
    }
    
    const newProfile: ApiProxySettings = {
      ...apiSettings,
      id: Date.now().toString(),
      name: profileName.trim()
    };
    
    const updatedProfiles = [...savedProfiles, newProfile];
    setSavedProfiles(updatedProfiles);
    safeSetItem('banhnho_api_profiles', JSON.stringify(updatedProfiles));
    const savedName = newProfile.name;
    setProfileName('');
    
    setIsProfileSaved(true);
    showToast(`Đã lưu cấu hình "${savedName}" thành công!`);
    setTimeout(() => setIsProfileSaved(false), 2000);
  };

  const handleLoadProfile = (profile: ApiProxySettings) => {
    setApiSettings(profile);
    safeSetItem('banhnho_api_settings', JSON.stringify(profile));
    showToast(`Đã tải cấu hình "${profile.name}".`);
  };

  const handleDeleteProfile = (id: string) => {
    // Custom confirm logic is hard without a modal component, so we just delete directly for now 
    // or we can add a simple state for it. Let's just delete directly and show a toast.
    const updatedProfiles = savedProfiles.filter(p => p.id !== id);
    setSavedProfiles(updatedProfiles);
    safeSetItem('banhnho_api_profiles', JSON.stringify(updatedProfiles));
    showToast("Đã xóa cấu hình.");
  };

  // Backgrounds for all 20 tabs - stored in IndexedDB to avoid quota issues
  const [tabBgs, setTabBgs] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadBgs = async () => {
      try {
        const bgs = await getAllFromDB('backgrounds');
        let migrated = false;
        // Migrate from localStorage if needed
        for (let i = 1; i <= 20; i++) {
          const key = `banhnho_bg_tab${i}`;
          const saved = localStorage.getItem(key);
          if (saved && !bgs[`tab${i}`]) {
            bgs[`tab${i}`] = saved;
            await saveToDB('backgrounds', `tab${i}`, saved);
            localStorage.removeItem(key);
            migrated = true;
          }
        }
        
        // Fallback for old storage format
        const oldSaved = localStorage.getItem('banhnho_tab_bgs');
        if (oldSaved) {
          try {
            const parsed = JSON.parse(oldSaved);
            for (const [k, v] of Object.entries(parsed)) {
              if (!bgs[k]) {
                bgs[k] = v as string;
                await saveToDB('backgrounds', k, v);
              }
            }
            localStorage.removeItem('banhnho_tab_bgs');
            migrated = true;
          } catch(e) {}
        }
        
        setTabBgs(bgs);
      } catch (e) {
        console.error("Failed to load backgrounds from DB", e);
      }
    };
    loadBgs();
  }, []);

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        // High resolution for "DỮ LIỆU KHỦNG"
        const compressed = await compressImage(file, 3840, 2160, 0.9);
        await saveToDB('backgrounds', activeTab, compressed);
        
        const newBgs = { ...tabBgs, [activeTab]: compressed };
        setTabBgs(newBgs);
        showToast("Đã lưu ảnh nền thành công!");
      } catch (error) {
        console.error("Failed to compress or save background:", error);
        showToast("Có lỗi xảy ra khi xử lý ảnh nền.");
      }
      e.target.value = '';
    }
  };

  const renderTabContent = () => {
    const bg = tabBgs[activeTab];
    
    const content = (() => {
      switch (activeTab) {
        case 'tab1':
          return subTab === '1.0' ? (
            <div className="h-full flex flex-col">
              <div className="p-4 flex items-center gap-4 bg-white/30 border-b border-[#F9C6D4]/30">
                <button onClick={() => setSubTab(null)} className="text-[#F3B4C2] font-bold bg-white/50 px-4 py-2 rounded-full shadow-sm hover:bg-white/80 transition-all flex items-center gap-2">
                  <ArrowLeft size={18} /> Quay lại thiết lập
                </button>
                <h2 className="text-xl font-bold text-[#8A7D85]">Trưng Bày: {characters.find(c => c.id === activeCharacterId)?.name}</h2>
              </div>
              <div className="flex-1 overflow-y-auto">
                <CarrdProfile characterId={activeCharacterId} />
              </div>
            </div>
          ) : (
            <Tab1CreateBot 
              activeCharacterId={activeCharacterId}
              characters={characters}
              onSelectCharacter={setActiveCharacterId}
              onCreateCharacter={handleCreateCharacter}
              onDeleteCharacter={handleDeleteCharacter}
              onUpdateName={updateCharacterName}
              onSaveComplete={() => setSubTab('1.0')} 
            />
          );
        case 'tab2':
          return (
            <div className="p-4">
              <h2 className="text-xl font-bold text-[#8A7D85]">Diễn đàn</h2>
            </div>
          );
        case 'tab3':
          return (
            <div className="p-4">
              <h2 className="text-xl font-bold text-[#8A7D85]">Blog của Bot char</h2>
            </div>
          );
        case 'tab4':
          return (
            <div className="p-4">
              <h2 className="text-xl font-bold text-[#8A7D85]">Bộ Nhớ Dài hạn</h2>
            </div>
          );
        case 'tab5':
          return subTab === '5.0' ? (
            <div className="p-4">
              <button onClick={() => setSubTab(null)} className="mb-4 text-[#F3B4C2] font-bold bg-white/50 px-3 py-1 rounded-full">← Quay lại</button>
              <h2 className="text-xl font-bold text-[#8A7D85]">Thiết lập nhân vật chi tiết</h2>
            </div>
          ) : subTab === '5.1' ? (
            <div className="p-4">
              <button onClick={() => setSubTab(null)} className="mb-4 text-[#F3B4C2] font-bold bg-white/50 px-3 py-1 rounded-full">← Quay lại</button>
              <h2 className="text-xl font-bold text-[#8A7D85]">Gắn Prompt/Preset, SYSTEM</h2>
            </div>
          ) : (
            <div className="p-4">
              <h2 className="text-xl font-bold text-[#8A7D85] mb-4">Danh sách giao diện bot char</h2>
              <div className="flex flex-col gap-3">
                <button onClick={() => setSubTab('5.0')} className="p-3 bg-[#F9C6D4] text-white rounded-xl font-bold shadow-md">
                  Thiết lập nhân vật chi tiết (Tab 5.0)
                </button>
                <button onClick={() => setSubTab('5.1')} className="p-3 bg-[#F9C6D4] text-white rounded-xl font-bold shadow-md">
                  Gắn Prompt/Preset, SYSTEM (Tab 5.1)
                </button>
              </div>
            </div>
          );
        case 'tab6':
          return subTab === '6.1' ? (
            <div className="p-4">
              <button onClick={() => setSubTab(null)} className="mb-4 text-[#F3B4C2] font-bold bg-white/50 px-3 py-1 rounded-full">← Quay lại</button>
              <h2 className="text-xl font-bold text-[#8A7D85]">Chi tiết Instagram</h2>
            </div>
          ) : (
            <div className="p-4">
              <h2 className="text-xl font-bold text-[#8A7D85] mb-4">Instagram của bot Char</h2>
              <button onClick={() => setSubTab('6.1')} className="p-3 bg-[#F9C6D4] text-white rounded-xl font-bold shadow-md">
                Xem chi tiết (Tab 6.1)
              </button>
            </div>
          );
        case 'tab7':
          return subTab === '7.1' ? (
            <div className="p-4">
              <button onClick={() => setSubTab(null)} className="mb-4 text-[#F3B4C2] font-bold bg-white/50 px-3 py-1 rounded-full">← Quay lại</button>
              <h2 className="text-xl font-bold text-[#8A7D85]">Tương lai 10, 20, 30 năm sau</h2>
            </div>
          ) : (
            <div className="p-4">
              <h2 className="text-xl font-bold text-[#8A7D85] mb-4">Tương lai cuộc đời (5 năm sau)</h2>
              <button onClick={() => setSubTab('7.1')} className="p-3 bg-[#F9C6D4] text-white rounded-xl font-bold shadow-md">
                Xem xa hơn (Tab 7.1)
              </button>
            </div>
          );
        case 'tab8':
          return (
            <div className="p-4 max-w-md mx-auto">
              <h2 className="text-2xl font-bold text-[#8A7D85] mb-6 text-center">API Proxy Key Setup</h2>
              
              <div className="bg-white/80 p-6 rounded-2xl shadow-sm border border-[#F9C6D4] flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-bold text-[#8A7D85] mb-1">Endpoint URL (v1)</label>
                  <input 
                    type="text" 
                    value={apiSettings.endpoint}
                    onChange={(e) => setApiSettings({...apiSettings, endpoint: e.target.value})}
                    placeholder="https://api.openai.com/v1"
                    className="w-full p-3 rounded-xl border border-[#F9C6D4] focus:outline-none focus:ring-2 focus:ring-[#F3B4C2] bg-white/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#8A7D85] mb-1">API Key</label>
                  <input 
                    type="password" 
                    value={apiSettings.apiKey}
                    onChange={(e) => setApiSettings({...apiSettings, apiKey: e.target.value})}
                    placeholder="sk-..."
                    className="w-full p-3 rounded-xl border border-[#F9C6D4] focus:outline-none focus:ring-2 focus:ring-[#F3B4C2] bg-white/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#8A7D85] mb-1">Model</label>
                  <div className="flex gap-2 mb-2">
                    <button 
                      onClick={handleFetchModels}
                      disabled={isFetchingModels}
                      className="px-4 py-2 bg-[#F9C6D4] text-white rounded-xl font-bold text-sm hover:bg-[#F3B4C2] transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      {isFetchingModels ? 'Đang tải...' : 'Gọi API Lấy Model'}
                    </button>
                  </div>
                  {availableModels.length > 0 ? (
                    <select 
                      value={apiSettings.model}
                      onChange={(e) => setApiSettings({...apiSettings, model: e.target.value})}
                      className="w-full p-3 rounded-xl border border-[#F9C6D4] focus:outline-none focus:ring-2 focus:ring-[#F3B4C2] bg-white/50"
                    >
                      {availableModels.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  ) : (
                    <input 
                      type="text" 
                      value={apiSettings.model}
                      onChange={(e) => setApiSettings({...apiSettings, model: e.target.value})}
                      placeholder="gpt-3.5-turbo, claude-3-opus..."
                      className="w-full p-3 rounded-xl border border-[#F9C6D4] focus:outline-none focus:ring-2 focus:ring-[#F3B4C2] bg-white/50"
                    />
                  )}
                </div>

                <div className="pt-4 border-t border-[#F9C6D4]/50">
                  <h3 className="font-bold text-[#8A7D85] mb-3">Cấu hình Token & Xử lý lớn</h3>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    <button 
                      onClick={() => setApiSettings({...apiSettings, maxTokens: 30000, isUnlimited: false})}
                      className={`px-3 py-2 rounded-xl text-sm font-bold transition-all ${!apiSettings.isUnlimited && apiSettings.maxTokens === 30000 ? 'bg-[#F3B4C2] text-white shadow-md' : 'bg-white/50 text-[#8A7D85] border border-[#F9C6D4]'}`}
                    >
                      30.000 Token
                    </button>
                    <button 
                      onClick={() => setApiSettings({...apiSettings, maxTokens: 50000, isUnlimited: false})}
                      className={`px-3 py-2 rounded-xl text-sm font-bold transition-all ${!apiSettings.isUnlimited && apiSettings.maxTokens === 50000 ? 'bg-[#F3B4C2] text-white shadow-md' : 'bg-white/50 text-[#8A7D85] border border-[#F9C6D4]'}`}
                    >
                      50.000 Token
                    </button>
                    <button 
                      onClick={() => setApiSettings({...apiSettings, maxTokens: 100000, isUnlimited: false})}
                      className={`px-3 py-2 rounded-xl text-sm font-bold transition-all ${!apiSettings.isUnlimited && apiSettings.maxTokens === 100000 ? 'bg-[#F3B4C2] text-white shadow-md' : 'bg-white/50 text-[#8A7D85] border border-[#F9C6D4]'}`}
                    >
                      100.000 Token
                    </button>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer mb-4">
                    <input 
                      type="checkbox" 
                      checked={apiSettings.isUnlimited}
                      onChange={(e) => setApiSettings({...apiSettings, isUnlimited: e.target.checked})}
                      className="w-5 h-5 rounded border-[#F9C6D4] text-[#F3B4C2] focus:ring-[#F3B4C2]"
                    />
                    <span className="text-sm font-bold text-[#8A7D85]">Không giới hạn (Max Token Vĩnh Viễn)</span>
                  </label>

                  <div>
                    <label className="block text-sm font-bold text-[#8A7D85] mb-1">Thời gian chờ tối đa (Timeout - Phút)</label>
                    <input 
                      type="number" 
                      min="1"
                      max="2"
                      value={apiSettings.timeoutMinutes}
                      onChange={(e) => {
                        let val = parseInt(e.target.value) || 2;
                        if (val > 2) val = 2; // Strict max 2 minutes
                        setApiSettings({...apiSettings, timeoutMinutes: val});
                      }}
                      className="w-full p-3 rounded-xl border border-[#F9C6D4] focus:outline-none focus:ring-2 focus:ring-[#F3B4C2] bg-white/50"
                    />
                    <p className="text-xs text-[#9E919A] mt-1">Tối đa 2 phút để đảm bảo không lỗi frontend và không ngắt quãng.</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#F9C6D4]/50">
                  <h3 className="font-bold text-[#8A7D85] mb-3">Lưu trữ Cấu hình (Profiles)</h3>
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="Tên cấu hình (VD: OpenAI GPT-4...)"
                      className="flex-1 p-3 rounded-xl border border-[#F9C6D4] focus:outline-none focus:ring-2 focus:ring-[#F3B4C2] bg-white/50 text-sm"
                    />
                    <button
                      onClick={handleSaveProfile}
                      disabled={isProfileSaved}
                      className={`px-4 py-2 text-white rounded-xl font-bold text-sm transition-colors whitespace-nowrap shadow-sm ${isProfileSaved ? 'bg-[#4CAF50]' : 'bg-[#F3B4C2] hover:bg-[#F9C6D4]'}`}
                    >
                      {isProfileSaved ? '✓ Đã lưu' : 'Lưu mới'}
                    </button>
                  </div>

                  {savedProfiles.length > 0 && (
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2 scrollbar-hide">
                      {savedProfiles.map(profile => (
                        <div key={profile.id} className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-[#F9C6D4]/50">
                          <div className="flex flex-col overflow-hidden mr-2">
                            <span className="font-bold text-sm text-[#8A7D85] truncate">{profile.name}</span>
                            <span className="text-xs text-[#9E919A] truncate">{profile.endpoint}</span>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button onClick={() => handleLoadProfile(profile)} className="p-2 bg-[#E8F5E9] text-[#2E7D32] rounded-lg hover:bg-[#C8E6C9] text-xs font-bold transition-colors">Chọn</button>
                            <button onClick={() => handleDeleteProfile(profile.id!)} className="p-2 bg-[#FFEBEE] text-[#C62828] rounded-lg hover:bg-[#FFCDD2] text-xs font-bold transition-colors">Xóa</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button 
                  onClick={saveApiSettings}
                  disabled={isSettingsSaved}
                  className={`w-full mt-2 p-4 text-white rounded-xl font-bold shadow-md transition-all ${isSettingsSaved ? 'bg-[#4CAF50]' : 'bg-gradient-to-r from-[#F9C6D4] to-[#F3B4C2] hover:shadow-lg active:scale-95'}`}
                >
                  {isSettingsSaved ? '✓ Đã lưu cấu hình' : 'Lưu Cấu Hình API Hiện Tại'}
                </button>
              </div>
            </div>
          );
        case 'tab9':
          return (
            <div className="p-4">
              <h2 className="text-xl font-bold text-[#8A7D85]">Ngân Hàng của bot char</h2>
            </div>
          );
        case 'tab10':
          return (
            <div className="p-4">
              <h2 className="text-xl font-bold text-[#8A7D85]">About</h2>
            </div>
          );
        case 'tab11':
          return (
            <div className="p-4">
              <h2 className="text-xl font-bold text-[#8A7D85]">Xem YouTube</h2>
            </div>
          );
        case 'tab12':
          return (
            <div className="p-4">
              <h2 className="text-xl font-bold text-[#8A7D85]">Người nhà + Người thân nhận xét về Bot char</h2>
            </div>
          );
        case 'tab13':
          return (
            <div className="p-4">
              <h2 className="text-xl font-bold text-[#8A7D85]">Viết Tiểu Thuyết Novel</h2>
            </div>
          );
        case 'tab14':
          return (
            <div className="p-4">
              <h2 className="text-xl font-bold text-[#8A7D85]">Bài Đăng + NPC</h2>
            </div>
          );
        case 'tab15':
          return (
            <div className="p-4">
              <h2 className="text-xl font-bold text-[#8A7D85]">Văn Phong + Bắt Buộc Bot char tuân thủ theo các quy định</h2>
            </div>
          );
        case 'tab16':
          return (
            <div className="p-4">
              <h2 className="text-xl font-bold text-[#8A7D85]">Sổ Chi Tiêu</h2>
            </div>
          );
        case 'tab17':
          return (
            <div className="p-4">
              <h2 className="text-xl font-bold text-[#8A7D85]">Phỏng Vấn và bot char trả lời</h2>
            </div>
          );
        case 'tab18':
          return (
            <div className="p-4">
              <h2 className="text-xl font-bold text-[#8A7D85]">Livestream Tiktok</h2>
            </div>
          );
        case 'tab19':
          return (
            <div className="p-4">
              <h2 className="text-xl font-bold text-[#8A7D85]">Weibo</h2>
            </div>
          );
        case 'tab20':
          return (
            <div className="p-4">
              <h2 className="text-xl font-bold text-[#8A7D85]">Hội Anti fan và Fan Cuồng</h2>
            </div>
          );
        default:
          return null;
      }
    })();

    return (
      <TabWrapper bg={bg} onBgUpload={handleBgUpload}>
        {content}
      </TabWrapper>
    );
  };

  const tabs = [
    { id: 'tab1', icon: <img src="https://i.postimg.cc/yNkB85Dd/662847c19c8cd32d8ffaea098e8d03f2-(1).png" className="w-10 h-10 object-cover rounded-full" />, label: 'Tạo Bot' },
    { id: 'tab2', icon: <img src="https://i.postimg.cc/05FqVZXX/bcfce2f2ee2a8e9718bf4168700a9083.png" className="w-10 h-10 object-cover rounded-full" />, label: 'Diễn đàn' },
    { id: 'tab3', icon: <List size={24} />, label: 'Blog' },
    { id: 'tab4', icon: <Database size={24} />, label: 'Bộ nhớ' },
    { id: 'tab5', icon: <Settings size={24} />, label: 'Danh sách' },
    { id: 'tab6', icon: <Instagram size={24} />, label: 'Instagram' },
    { id: 'tab7', icon: <Clock size={24} />, label: 'Tương lai' },
    { id: 'tab8', icon: <Key size={24} />, label: 'API Proxy' },
    { id: 'tab9', icon: <CreditCard size={24} />, label: 'Ngân hàng' },
    { id: 'tab10', icon: <Info size={24} />, label: 'About' },
    { id: 'tab11', icon: <Youtube size={24} />, label: 'YouTube' },
    { id: 'tab12', icon: <Users size={24} />, label: 'Nhận xét' },
    { id: 'tab13', icon: <BookOpen size={24} />, label: 'Tiểu thuyết' },
    { id: 'tab14', icon: <FileText size={24} />, label: 'Bài đăng NPC' },
    { id: 'tab15', icon: <Shield size={24} />, label: 'Quy định' },
    { id: 'tab16', icon: <Wallet size={24} />, label: 'Sổ chi tiêu' },
    { id: 'tab17', icon: <Mic size={24} />, label: 'Phỏng vấn' },
    { id: 'tab18', icon: <Video size={24} />, label: 'Tiktok Live' },
    { id: 'tab19', icon: <Globe size={24} />, label: 'Weibo' },
    { id: 'tab20', icon: <Users size={24} />, label: 'Fan/Anti' },
  ];

  return (
    <div className="w-full h-screen flex flex-col font-sans overflow-hidden bg-[#FAF9F6] relative">
      <div className="absolute top-4 left-4 z-50 flex items-center gap-2">
        <button onClick={onBack} className="bg-white/80 px-3 py-1 rounded-full text-sm font-bold text-[#F3B4C2] shadow-sm border border-[#F9C6D4] hover:bg-white transition-all">
          ← Thoát
        </button>
        
        {/* Global Character Selector */}
        <div className="flex items-center gap-1 bg-white/80 border border-[#F9C6D4] rounded-full px-2 py-1 shadow-sm overflow-hidden max-w-[200px] md:max-w-[400px]">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {characters.map(char => (
              <button
                key={char.id}
                onClick={() => setActiveCharacterId(char.id)}
                className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-all border ${
                  activeCharacterId === char.id 
                    ? 'bg-[#F9DDE3] text-[#8A7D85] border-[#F3C6D1] shadow-sm' 
                    : 'bg-[#FEF9E7] text-[#8A7D85] border-[#F9E79F] hover:bg-[#FFF9C4]'
                }`}
              >
                {char.name}
              </button>
            ))}
          </div>
          <button 
            onClick={handleCreateCharacter}
            className="p-1 text-[#F3B4C2] hover:bg-[#FDF2F5] rounded-full transition-all"
            title="Thêm nhân vật mới"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden pb-[80px]">
        {renderTabContent()}
      </div>

      {/* Scrollable Bottom Navigation */}
      <div className="absolute bottom-0 w-full h-[80px] bg-white/90 backdrop-blur-md border-t-2 border-[#F9C6D4] z-50">
        <div className="flex items-center h-full overflow-x-auto px-4 gap-6 scrollbar-hide snap-x">
          {tabs.map(tab => (
            <button 
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSubTab(null); }}
              className={`flex flex-col items-center justify-center min-w-[70px] snap-center transition-all ${activeTab === tab.id ? 'text-[#F3B4C2] scale-110' : 'text-[#9E919A] opacity-70'}`}
            >
              <div className={`w-12 h-12 flex items-center justify-center rounded-2xl ${activeTab === tab.id ? 'bg-[#FDF2F5] shadow-sm border border-[#F9C6D4]' : ''}`}>
                {tab.icon}
              </div>
              <span className="text-[10px] font-bold mt-1 whitespace-nowrap">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed top-10 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-md border border-[#F9DDE3] text-[#8A7D85] px-6 py-3 rounded-full shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-4 z-[100]">
          <div className="w-2 h-2 rounded-full bg-[#4CAF50]"></div>
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
