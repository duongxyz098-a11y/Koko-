import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, Image as ImageIcon, MoreVertical, Phone, Video, Info, Plus, Rabbit } from 'lucide-react';
import { sendCoreMessageStream } from '../../services/coreAi';
import { safeSetItem } from '../../utils/storage';
import { compressImage } from '../../utils/imageUtils';

export default function NpcTab({ onChatStateChange }: { onChatStateChange?: (chatting: boolean) => void }) {
  const [chars, setChars] = useState<any[]>([]);
  const [selectedChar, setSelectedChar] = useState<any>(() => {
    const saved = localStorage.getItem('koko_npc_selected_char');
    if (saved) {
      try { return JSON.parse(saved); } catch(e) { return null; }
    }
    return null;
  });

  useEffect(() => {
    if (selectedChar) {
      safeSetItem('koko_npc_selected_char', JSON.stringify(selectedChar));
    } else {
      localStorage.removeItem('koko_npc_selected_char');
    }
  }, [selectedChar]);

  const [messages, setMessages] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [bgImage, setBgImage] = useState('');
  const [bubbleColor, setBubbleColor] = useState('#FDF2F5');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (onChatStateChange) {
      onChatStateChange(!!selectedChar);
    }
  }, [selectedChar, onChatStateChange]);

  useEffect(() => {
    const savedSettings = localStorage.getItem('koko_api_settings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        if (settings.bubbleColor) setBubbleColor(settings.bubbleColor);
      } catch(e){}
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('koko_chars');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setChars(parsed);
        } else {
          setChars([]);
        }
      } catch (e) {
        setChars([]);
      }
    }
  }, []);

  useEffect(() => {
    if (selectedChar) {
      const savedBg = localStorage.getItem(`koko_npc_bg_${selectedChar.id}`);
      if (savedBg) setBgImage(savedBg);
      else setBgImage('');

      const savedMsgs = localStorage.getItem(`koko_npc_msgs_${selectedChar.id}`);
      if (savedMsgs) {
        try {
          const parsed = JSON.parse(savedMsgs);
          if (Array.isArray(parsed)) {
            setMessages(parsed);
          } else {
            setMessages([]);
          }
        } catch (e) {
          setMessages([]);
        }
      } else {
        setMessages([]);
      }
    }
  }, [selectedChar]);

  useEffect(() => {
    if (selectedChar && messages.length > 0) {
      safeSetItem(`koko_npc_msgs_${selectedChar.id}`, JSON.stringify(messages));
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedChar]);

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 800, 800, 0.6);
        setBgImage(compressed);
        if (selectedChar) {
          safeSetItem(`koko_npc_bg_${selectedChar.id}`, compressed);
        }
      } catch (error) {
        console.error("Background compression failed", error);
      }
      e.target.value = '';
    }
  };

  const generateNextMessage = async (speaker: 'bot' | 'npc', npcId?: string) => {
    if (isTyping || !selectedChar) return;
    
    setIsTyping(true);
    
    let speakerName = selectedChar.name;
    let speakerAvatar = selectedChar.avatar;
    let systemPrompt = `Bạn đang đóng vai ${selectedChar.name}. `;
    
    if (speaker === 'npc' && npcId) {
      const npc = selectedChar.npcs.find((n: any) => n.id === npcId);
      if (npc) {
        speakerName = npc.name;
        speakerAvatar = npc.avatar;
        systemPrompt = `Bạn đang đóng vai ${npc.name}, một nhân vật phụ. Mô tả: ${npc.description}. `;
      }
    }

    systemPrompt += `\nĐây là cuộc trò chuyện nhóm giữa ${selectedChar.name} và các nhân vật phụ: ${(selectedChar.npcs || []).map((n:any)=>n.name).join(', ')}. \n`;
    systemPrompt += `Hãy viết tiếp câu chuyện dưới góc nhìn của ${speakerName}. Chỉ viết lời thoại và hành động của ${speakerName}, không viết thay người khác.`;

    const apiSettingsStr = localStorage.getItem('koko_api_settings');
    let apiSettings = null;
    if (apiSettingsStr) {
      try { apiSettings = JSON.parse(apiSettingsStr); } catch(e){}
    }

    if (!apiSettings?.endpoint || !apiSettings?.apiKey) {
      alert('Vui lòng cài đặt API trong phần Cài đặt trước.');
      setIsTyping(false);
      return;
    }

    const chatHistory = messages.map(m => ({
      role: 'user', // We send all previous context as user messages to simulate the group chat
      content: `${m.speakerName}: ${m.text}`
    }));

    const newMsgId = Date.now().toString();
    setMessages(prev => [...prev, { id: newMsgId, speakerId: speaker === 'bot' ? selectedChar.id : npcId, speakerName, speakerAvatar, text: '', isBot: speaker === 'bot' }]);

    try {
      let fullText = '';
      const response = await sendCoreMessageStream(
        `Đến lượt ${speakerName} nói:`,
        chatHistory as any,
        { title: 'NPC Chat', context: systemPrompt, rules: 'Chỉ viết lời thoại và hành động của nhân vật được yêu cầu. Không viết thay người khác.', length: 'Ngắn gọn, tự nhiên', ooc: 'Không' },
        { mode: 'online', minChars: 10, maxChars: 500 }
      );

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const json = JSON.parse(line.slice(6));
                if (json.choices?.[0]?.delta?.content) {
                  fullText += json.choices[0].delta.content;
                  setMessages(prev => prev.map(m => m.id === newMsgId ? { ...m, text: fullText } : m));
                }
              } catch(e){}
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => prev.map(m => m.id === newMsgId ? { ...m, text: m.text + '\n[Lỗi kết nối]' } : m));
    } finally {
      setIsTyping(false);
    }
  };

  const handleAutoGenerate = async () => {
    if (isTyping || !selectedChar || !selectedChar.npcs || selectedChar.npcs.length === 0) {
      alert('Cần có ít nhất 1 NPC để tạo hội thoại tự động.');
      return;
    }
    
    setIsTyping(true);
    const npc = selectedChar.npcs[0];
    
    const systemPrompt = `Bạn đang đóng vai trò là một người viết kịch bản. Hãy viết một đoạn hội thoại dài (khoảng 10-20 câu) đan xen giữa ${selectedChar.name} và ${npc.name}.
Định dạng BẮT BUỘC (mỗi câu trên 1 dòng mới):
${selectedChar.name}: [lời thoại]
${npc.name}: [lời thoại]`;

    try {
      const response = await sendCoreMessageStream(
        `Hãy viết đoạn hội thoại tiếp theo giữa ${selectedChar.name} và ${npc.name}.`,
        [],
        { title: 'Auto Chat', context: systemPrompt, rules: 'Chỉ viết theo định dạng yêu cầu.', length: 'Dài', ooc: 'Không' },
        { mode: 'novel', minChars: 500, maxChars: 2000, timeoutMinutes: 10 }
      );

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const json = JSON.parse(line.slice(6));
                if (json.choices?.[0]?.delta?.content) {
                  fullText += json.choices[0].delta.content;
                }
              } catch(e){}
            }
          }
        }
      }

      const newMsgs: any[] = [];
      const lines = fullText.split('\n');
      for (const line of lines) {
        if (line.trim().startsWith(`${selectedChar.name}:`)) {
          newMsgs.push({
            id: Date.now().toString() + Math.random(),
            speakerId: selectedChar.id,
            speakerName: selectedChar.name,
            speakerAvatar: selectedChar.avatar,
            text: line.replace(`${selectedChar.name}:`, '').trim(),
            isBot: true
          });
        } else if (line.trim().startsWith(`${npc.name}:`)) {
          newMsgs.push({
            id: Date.now().toString() + Math.random(),
            speakerId: npc.id,
            speakerName: npc.name,
            speakerAvatar: npc.avatar,
            text: line.replace(`${npc.name}:`, '').trim(),
            isBot: false
          });
        }
      }
      
      if (newMsgs.length > 0) {
        setMessages(prev => [...prev, ...newMsgs]);
      } else {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          speakerId: selectedChar.id,
          speakerName: 'Hệ thống',
          speakerAvatar: '',
          text: fullText,
          isBot: true
        }]);
      }

    } catch (error) {
      console.error(error);
      alert('Lỗi kết nối API');
    } finally {
      setIsTyping(false);
    }
  };

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newNpcData, setNewNpcData] = useState({ name: '', description: '', linkedCharId: '' });

  const handleCreateNpc = () => {
    if (!newNpcData.name || !newNpcData.linkedCharId) {
      alert('Vui lòng nhập tên NPC và chọn nhân vật liên kết.');
      return;
    }
    const newNpc = {
      id: Date.now().toString(),
      name: newNpcData.name,
      avatar: '',
      description: newNpcData.description || 'NPC mới'
    };
    const updatedChars = chars.map(c => {
      if (c.id === newNpcData.linkedCharId) {
        return { ...c, npcs: [...(c.npcs || []), newNpc] };
      }
      return c;
    });
    setChars(updatedChars);
    localStorage.setItem('koko_chars', JSON.stringify(updatedChars));
    setShowCreateModal(false);
    setNewNpcData({ name: '', description: '', linkedCharId: '' });
  };

  if (!selectedChar) {
    return (
      <div className="p-4 pt-16 h-full flex flex-col bg-white/30 backdrop-blur-sm relative">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-black">Đoạn chat NPC</h1>
          <button 
            onClick={() => {
              setNewNpcData({ ...newNpcData, linkedCharId: chars[0]?.id || '' });
              setShowCreateModal(true);
            }}
            className="p-2 bg-[#0084ff]/10 text-[#0084ff] rounded-full hover:bg-[#0084ff]/20"
            title="Tạo NPC mới"
          >
            <Plus size={24} />
          </button>
        </div>

        {showCreateModal && (
          <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Tạo NPC Mới</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên NPC</label>
                  <input 
                    type="text" 
                    value={newNpcData.name}
                    onChange={e => setNewNpcData({...newNpcData, name: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#0084ff]/50"
                    placeholder="Nhập tên NPC..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nhân vật liên kết (Bot)</label>
                  <select 
                    value={newNpcData.linkedCharId}
                    onChange={e => setNewNpcData({...newNpcData, linkedCharId: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#0084ff]/50"
                  >
                    <option value="">-- Chọn nhân vật --</option>
                    {chars.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả (Tùy chọn)</label>
                  <textarea 
                    value={newNpcData.description}
                    onChange={e => setNewNpcData({...newNpcData, description: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#0084ff]/50 min-h-[80px]"
                    placeholder="Mô tả về NPC này..."
                  />
                </div>
                <div className="flex gap-3 mt-6">
                  <button 
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
                  >
                    Hủy
                  </button>
                  <button 
                    onClick={handleCreateNpc}
                    className="flex-1 py-2 rounded-lg bg-[#0084ff] text-white font-medium hover:bg-[#0084ff]/90"
                  >
                    Tạo NPC
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex-1 overflow-y-auto">
          {chars.length === 0 ? (
            <div className="text-center text-gray-500 mt-10">
              Chưa có nhân vật nào. Hãy tạo nhân vật ở Hub trước.
            </div>
          ) : (
            <div className="flex flex-col">
              {chars.map(char => (
                <div 
                  key={char.id} 
                  onClick={() => setSelectedChar(char)}
                  className="flex items-center gap-3 p-3 hover:bg-white/50 cursor-pointer transition-colors rounded-xl mb-2 bg-white/40 backdrop-blur-md shadow-sm"
                >
                  <div className="relative">
                    <img 
                      src={char.avatar || 'https://i.pinimg.com/736x/8e/08/7b/8e087b7a2bb036329a738fa7b2a95c52.jpg'} 
                      alt={char.name}
                      className="w-14 h-14 rounded-full object-cover"
                    />
                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                  </div>
                  <div className="flex-1 border-b border-gray-100/50 pb-3">
                    <h2 className="text-[17px] font-semibold text-black">{char.name} & Các NPC</h2>
                    <p className="text-[14px] text-gray-600 line-clamp-1">
                      {char.npcs?.length || 0} nhân vật phụ: {(char.npcs || []).map((n:any)=>n.name).join(', ')}
                    </p>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setNewNpcData({ name: '', description: '', linkedCharId: char.id });
                      setShowCreateModal(true);
                    }}
                    className="p-2 bg-[#0084ff]/10 text-[#0084ff] rounded-full hover:bg-[#0084ff]/20"
                    title="Thêm NPC"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      className="flex flex-col h-full bg-cover bg-center relative"
      style={{ 
        backgroundImage: bgImage ? `url('${bgImage}')` : 'none', 
        backgroundColor: bgImage ? 'transparent' : 'rgba(255, 255, 255, 0.3)',
      }}
    >
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 p-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedChar(null)} className="text-[#F3B4C2] p-1">
            <ArrowLeft size={24} />
          </button>
          <div className="flex items-center gap-2">
            <img src={selectedChar.avatar || 'https://i.pinimg.com/736x/8e/08/7b/8e087b7a2bb036329a738fa7b2a95c52.jpg'} className="w-10 h-10 rounded-full object-cover" />
            <div>
              <h2 className="font-semibold text-[16px] leading-tight text-black">{selectedChar.name} & NPCs</h2>
              <p className="text-[12px] text-gray-500">Nhóm chat</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 text-[#F3B4C2]">
          <button 
            onClick={handleAutoGenerate} 
            className="p-2 rounded-full hover:bg-[#FDF2F5] transition-all text-[#F3B4C2]"
            title="Tự động tạo hội thoại"
          >
            <Rabbit size={24} />
          </button>
          <input type="file" accept="image/*" className="hidden" ref={bgInputRef} onChange={handleBgUpload} />
          <button onClick={() => bgInputRef.current?.click()} title="Đổi hình nền">
            <ImageIcon size={20} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-10 text-sm bg-white/80 p-4 rounded-2xl mx-4 shadow-sm">
            Đây là nơi các nhân vật tự trò chuyện với nhau. Hãy chọn người nói tiếp theo ở bên dưới.
          </div>
        )}
        {messages.map((msg) => {
          const isBot = msg.isBot;
          return (
            <div key={msg.id} className={`flex gap-2 ${isBot ? 'flex-row-reverse' : 'flex-row'}`}>
              <img src={msg.speakerAvatar || 'https://i.pinimg.com/736x/8e/08/7b/8e087b7a2bb036329a738fa7b2a95c52.jpg'} className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-auto" />
              <div className={`flex flex-col ${isBot ? 'items-end' : 'items-start'} max-w-[75%]`}>
                <span className="text-[11px] text-gray-500 mb-1 px-1 bg-white/50 rounded-full">{msg.speakerName}</span>
                <div 
                  className={`px-4 py-2 rounded-2xl text-[15px] shadow-sm ${isBot ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                  style={{ backgroundColor: bubbleColor, color: '#8A7D85', border: '1px solid #F9C6D4' }}
                >
                  {msg.text}
                </div>
              </div>
            </div>
          );
        })}
        {isTyping && (
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
            <div className="bg-white border border-gray-100 px-4 py-2 rounded-2xl rounded-bl-sm flex items-center gap-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Controls */}
      <div className="bg-white/90 backdrop-blur-md border-t border-gray-200 p-2">
        <div className="text-xs text-gray-500 mb-2 flex justify-between items-center px-2">
          <span>Chọn người nói tiếp theo:</span>
          <button 
            onClick={() => {
              const name = prompt('Nhập tên NPC mới:');
              if (name) {
                const newNpc = { id: Date.now().toString(), name, avatar: '', description: 'Nhân vật phụ mới' };
                const saved = localStorage.getItem('koko_chars');
                if (saved) {
                  try {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed)) {
                      const updatedChars = parsed.map((c: any) => {
                        if (c.id === selectedChar.id) {
                          return { ...c, npcs: [...(c.npcs || []), newNpc] };
                        }
                        return c;
                      });
                      localStorage.setItem('koko_chars', JSON.stringify(updatedChars));
                      setSelectedChar({ ...selectedChar, npcs: [...(selectedChar.npcs || []), newNpc] });
                    }
                  } catch (e) {}
                }
              }
            }}
            className="text-[#0084ff] font-medium flex items-center gap-1"
          >
            <Plus size={14} /> Thêm NPC
          </button>
        </div>
        <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide px-2">
          <button 
            onClick={() => generateNextMessage('bot')}
            disabled={isTyping}
            className="px-4 py-2 bg-[#0084ff] text-white rounded-full text-sm font-medium disabled:opacity-50 shadow-sm whitespace-nowrap flex-shrink-0"
          >
            {selectedChar.name}
          </button>
          {(selectedChar.npcs || []).map((npc: any) => (
            <button 
              key={npc.id}
              onClick={() => generateNextMessage('npc', npc.id)}
              disabled={isTyping}
              className="px-4 py-2 bg-gray-100 text-black border border-gray-200 rounded-full text-sm font-medium disabled:opacity-50 shadow-sm hover:bg-gray-200 whitespace-nowrap flex-shrink-0"
            >
              {npc.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
