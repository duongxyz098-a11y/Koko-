import React, { useState, useEffect, useRef } from 'react';
import { Settings, User, MessageCircle, PlusCircle, Home, Users, Image as ImageIcon } from 'lucide-react';
import HubTab from './components/HubTab';
import CreateCharTab from './components/CreateCharTab';
import MemoryTab from './components/MemoryTab';
import UserProfileTab from './components/UserProfileTab';
import SettingsTab from './components/SettingsTab';
import NotebooksView from './components/NotebooksView';
import NpcTab from './components/NpcTab';

import { compressImage } from '../utils/imageUtils';

export default function KokoApp({ onBack }: { onBack: () => void }) {
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('koko_active_tab') || 'hub');

  useEffect(() => {
    try {
      localStorage.setItem('koko_active_tab', activeTab);
    } catch (e) {
      console.error('Failed to save active tab to localStorage:', e);
    }
  }, [activeTab]);

  const [selectedChar, setSelectedChar] = useState<any>(null);
  const [npcChatting, setNpcChatting] = useState(false);
  const [editingChar, setEditingChar] = useState<any>(null);
  const [bgImage, setBgImage] = useState('');
  const bgInputRef = useRef<HTMLInputElement>(null);

  const isFullPage = selectedChar || npcChatting;

  useEffect(() => {
    const saved = localStorage.getItem('koko_api_settings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        if (settings.bgImage) setBgImage(settings.bgImage);
      } catch(e){}
    }
  }, []);

  const handleEditChar = (char: any) => {
    setEditingChar(char);
    setActiveTab('create');
  };

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 1024, 1024, 0.6);
        setBgImage(compressed);
        const saved = localStorage.getItem('koko_api_settings');
        let settings: any = {};
        if (saved) {
          try { settings = JSON.parse(saved); } catch(e){}
        }
        settings = { ...settings, bgImage: compressed };
        try {
          localStorage.setItem('koko_api_settings', JSON.stringify(settings));
        } catch (e) {
          console.error('Failed to save API settings to localStorage:', e);
        }
      } catch (error) {
        console.error("Background compression failed", error);
      }
      e.target.value = '';
    }
  };

  const renderTab = () => {
    if (selectedChar) {
      return <NotebooksView char={selectedChar} onBack={() => setSelectedChar(null)} />;
    }

    switch (activeTab) {
      case 'hub': return <HubTab onSelectChar={setSelectedChar} onEditChar={handleEditChar} />;
      case 'create': return <CreateCharTab editingChar={editingChar} onSaved={() => { setActiveTab('hub'); setEditingChar(null); }} onCancel={() => { setActiveTab('hub'); setEditingChar(null); }} />;
      case 'memory': return <MemoryTab />;
      case 'profile': return <UserProfileTab onBgUpload={handleBgUpload} bgInputRef={bgInputRef} />;
      case 'settings': return <SettingsTab />;
      case 'npc': return <NpcTab onChatStateChange={setNpcChatting} />;
      default: return <HubTab onSelectChar={setSelectedChar} onEditChar={handleEditChar} />;
    }
  };

  return (
    <div 
      className="w-full h-screen flex flex-col font-sans overflow-hidden relative bg-cover bg-center"
      style={{ 
        backgroundColor: '#FAF9F6',
        backgroundImage: bgImage ? `url('${bgImage}')` : 'none'
      }}
    >
      {!isFullPage && (
        <>
          <div className="absolute top-4 left-4 z-50 flex items-center gap-2">
            <button onClick={onBack} className="bg-white/80 backdrop-blur px-3 py-1 rounded-full text-sm font-bold text-[#F3B4C2] shadow-sm border border-[#F9C6D4]">
              ← Thoát Koko
            </button>
          </div>

          <div className="absolute top-4 right-4 z-50">
            <input type="file" accept="image/*" className="hidden" ref={bgInputRef} onChange={handleBgUpload} />
            <div className="flex gap-2">
              <input 
                type="text"
                placeholder="Dán link ảnh nền..."
                className="p-2 rounded-full text-sm bg-white/80 border border-[#F9C6D4] outline-none text-[#8A7D85] w-32"
                onChange={(e) => {
                  const url = e.target.value;
                  setBgImage(url);
                  const saved = localStorage.getItem('koko_api_settings');
                  let settings: any = {};
                  if (saved) {
                    try { settings = JSON.parse(saved); } catch(e){}
                  }
                  settings = { ...settings, bgImage: url };
                  try {
                    localStorage.setItem('koko_api_settings', JSON.stringify(settings));
                  } catch (e) {
                    console.error('Failed to save API settings to localStorage:', e);
                  }
                }}
              />
              <button 
                onClick={() => bgInputRef.current?.click()} 
                className="bg-white/80 backdrop-blur p-2 rounded-full text-[#F3B4C2] shadow-sm border border-[#F9C6D4] hover:bg-white transition-colors"
                title="Đổi hình nền toàn ứng dụng"
              >
                <ImageIcon size={20} />
              </button>
            </div>
          </div>
        </>
      )}

      <div className={`flex-1 overflow-y-auto ${!isFullPage ? 'pb-[70px] bg-white/30 backdrop-blur-sm' : ''}`}>
        {renderTab()}
      </div>

      <input 
        type="file" 
        accept="image/*" 
        ref={bgInputRef} 
        onChange={handleBgUpload} 
        className="hidden" 
      />
      {!isFullPage && (
        <div className="absolute bottom-0 w-full h-[70px] bg-white/80 backdrop-blur-md border-t-2 border-[#F9C6D4] flex justify-around items-center z-50 px-2">
          <button onClick={() => setActiveTab('hub')} className={`p-2 flex flex-col items-center gap-1 ${activeTab === 'hub' ? 'text-[#F3B4C2]' : 'text-[#9E919A]'}`}>
            <Home size={24} />
          </button>
          <button onClick={() => setActiveTab('npc')} className={`p-2 flex flex-col items-center gap-1 ${activeTab === 'npc' ? 'text-[#F3B4C2]' : 'text-[#9E919A]'}`}>
            <Users size={24} />
          </button>
          <div className="relative -top-6">
            <button 
              onClick={() => { setEditingChar(null); setActiveTab('create'); }} 
              className={`w-[60px] h-[60px] rounded-full flex items-center justify-center border-4 border-white shadow-lg ${activeTab === 'create' ? 'bg-[#F3B4C2] text-white' : 'bg-[#F9C6D4] text-white'}`}
            >
              <PlusCircle size={32} />
            </button>
          </div>
          <button onClick={() => setActiveTab('profile')} className={`p-2 flex flex-col items-center gap-1 ${activeTab === 'profile' ? 'text-[#F3B4C2]' : 'text-[#9E919A]'}`}>
            <User size={24} />
          </button>
          <button onClick={() => setActiveTab('settings')} className={`p-2 flex flex-col items-center gap-1 ${activeTab === 'settings' ? 'text-[#F3B4C2]' : 'text-[#9E919A]'}`}>
            <Settings size={24} />
          </button>
        </div>
      )}
    </div>
  );
}
