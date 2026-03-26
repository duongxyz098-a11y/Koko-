import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Send } from 'lucide-react';
import { sendCoreMessageStream } from '../../services/coreAi';

export default function MemoryTab() {
  const [chars, setChars] = useState<any[]>([]);
  const [selectedChar, setSelectedChar] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      } catch(e) {
        setChars([]);
      }
    }
  }, []);

  useEffect(() => {
    if (selectedChar) {
      const savedMsgs = localStorage.getItem(`koko_msgs_${selectedChar.id}`);
      if (savedMsgs) {
        try { 
          const parsed = JSON.parse(savedMsgs);
          if (Array.isArray(parsed)) {
            setMessages(parsed);
          } else {
            setMessages([]);
          }
        } catch(e) {
          setMessages([]);
        }
      } else {
        setMessages([]);
      }
    }
  }, [selectedChar]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (selectedChar && messages.length > 0) {
      localStorage.setItem(`koko_msgs_${selectedChar.id}`, JSON.stringify(messages));
    }
  }, [messages, selectedChar]);

  const handleSend = async () => {
    if (!input.trim() || loading || !selectedChar) return;

    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const settingsStr = localStorage.getItem('koko_api_settings');
      let apiSettings = { maxTokens: 100000, timeoutMinutes: 20 };
      if (settingsStr) {
        try { apiSettings = JSON.parse(settingsStr); } catch(e){}
      }

      const response = await sendCoreMessageStream(
        input, 
        messages.map(m => ({ role: m.role, content: m.content })), 
        { 
          title: selectedChar.name, 
          context: `Bạn là ${selectedChar.name}. Tiểu sử: ${selectedChar.history}. Tính cách: ${selectedChar.personality}. Ngoại hình: ${selectedChar.appearance}.`, 
          rules: 'KHÔNG BAO GIỜ DÙNG JSON HAY CODE. CHỈ TRẢ LỜI BẰNG VĂN BẢN THUẦN TÚY NHƯ ĐANG NHẮN TIN.', 
          length: 'Ngắn gọn, tự nhiên', 
          ooc: 'Không' 
        },
        { mode: 'online', minChars: 0, maxChars: 0, maxTokens: apiSettings.maxTokens, timeoutMinutes: apiSettings.timeoutMinutes }
      );

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

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
                  const text = json.choices[0].delta.content;
                  fullResponse += text;
                  setMessages(prev => {
                    const newMsgs = [...prev];
                    newMsgs[newMsgs.length - 1].content = fullResponse;
                    return newMsgs;
                  });
                }
              } catch(e){}
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'system', content: 'Lỗi: Không thể kết nối API.' }]);
    } finally {
      setLoading(false);
    }
  };

  if (selectedChar) {
    return (
      <div className="flex flex-col h-full absolute top-0 left-0 w-full z-50 bg-white/30 backdrop-blur-sm">
        <div className="bg-white/80 backdrop-blur p-4 pt-10 flex items-center gap-3 border-b border-[#E6DDD8]">
          <button onClick={() => setSelectedChar(null)} className="text-[#F3B4C2]">
            <ChevronLeft size={28} />
          </button>
          <img src={selectedChar.avatar || 'https://i.pinimg.com/736x/8e/08/7b/8e087b7a2bb036329a738fa7b2a95c52.jpg'} className="w-10 h-10 rounded-full object-cover border border-[#F9C6D4]" />
          <div className="font-bold text-[#8A7D85]">{selectedChar.name}</div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-2xl ${
                msg.role === 'user' 
                  ? 'bg-[#F9C6D4] text-white rounded-tr-sm' 
                  : msg.role === 'system'
                    ? 'bg-red-100 text-red-500 text-xs mx-auto'
                    : 'bg-white/90 backdrop-blur-sm text-[#8A7D85] border border-[#E6DDD8] rounded-tl-sm shadow-sm'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white/90 backdrop-blur-sm text-[#8A7D85] border border-[#E6DDD8] p-3 rounded-2xl rounded-tl-sm shadow-sm">
                <span className="animate-pulse">...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white/80 backdrop-blur border-t border-[#E6DDD8] flex gap-2 items-center pb-8">
          <input 
            type="text" 
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Nhắn tin..."
            className="flex-1 bg-white/50 border border-[#F9C6D4] rounded-full px-4 py-2 outline-none text-[#8A7D85]"
          />
          <button 
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-[#F3B4C2] text-white p-2 rounded-full disabled:opacity-50"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pt-16 h-full flex flex-col">
      <h1 className="text-2xl font-bold text-[#F3B4C2] mb-4">Ghi Nhớ Dài Hạn</h1>
      
      <div className="bg-white/80 backdrop-blur rounded-full px-4 py-3 border-2 border-[#F9C6D4] mb-6 flex items-center shadow-sm">
        <span className="text-[#F3B4C2] mr-2">🔍</span>
        <input type="text" placeholder="Tìm kiếm nhân vật..." className="outline-none w-full text-[#8A7D85] bg-transparent" />
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {chars.length === 0 ? (
          <div className="text-center text-[#9E919A] mt-10">Chưa có nhân vật nào.</div>
        ) : (
          chars.map(char => (
            <div 
              key={char.id} 
              onClick={() => setSelectedChar(char)}
              className="w-full h-[70px] bg-white/80 backdrop-blur rounded-full border-2 border-[#F9C6D4] flex items-center px-3 shadow-sm cursor-pointer hover:bg-[#FFF0F5]/80 transition-colors"
            >
              <img src={char.avatar || 'https://i.pinimg.com/736x/8e/08/7b/8e087b7a2bb036329a738fa7b2a95c52.jpg'} className="w-[45px] h-[45px] rounded-full object-cover shrink-0" />
              <div className="ml-3 flex-1">
                <div className="font-bold text-[#8A7D85] text-sm">{char.name}</div>
                <div className="text-xs text-[#9E919A] truncate">Nhấn để trò chuyện...</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
