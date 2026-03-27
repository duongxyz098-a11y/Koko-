import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Send, 
  Image as ImageIcon, 
  Settings, 
  MoreHorizontal,
  Smile,
  Plus,
  Trash2,
  Download
} from 'lucide-react';
import { loadChat, saveChat, loadChatSettings, saveChatSettings } from '../../utils/db';
import { compressImage } from '../../utils/imageUtils';

interface Message {
  id: string;
  sender: 'bot' | 'user' | 'system';
  text: string;
  timestamp: number;
  type?: 'text' | 'event';
}

interface ChatSettings {
  background?: string;
  botBubbleColor?: string;
  userBubbleColor?: string;
  botTextColor?: string;
  userTextColor?: string;
  fontSize?: number;
  bubbleRadius?: number;
}

interface RoleplayChatProps {
  bot: any;
  onBack: () => void;
}

export const RoleplayChat: React.FC<RoleplayChatProps> = ({ bot, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [settings, setSettings] = useState<ChatSettings>({
    botBubbleColor: '#FFFFFF',
    userBubbleColor: '#FFFFFF',
    botTextColor: '#4A4A4A',
    userTextColor: '#4A4A4A',
    fontSize: 14,
    bubbleRadius: 15,
  });
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load chat history and settings
  useEffect(() => {
    const init = async () => {
      const history = await loadChat(bot.id || bot.name);
      const savedSettings = await loadChatSettings(bot.id || bot.name);
      if (history.length > 0) setMessages(history);
      if (savedSettings) setSettings(prev => ({ ...prev, ...savedSettings }));
    };
    init();
  }, [bot]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputText,
      timestamp: Date.now(),
      type: 'text'
    };

    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setInputText('');
    await saveChat(bot.id || bot.name, updatedMessages);

    // Simulate bot response (for now)
    setTimeout(async () => {
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: `[${bot.name}] Đang suy nghĩ... (Tính năng AI đang được tích hợp)`,
        timestamp: Date.now(),
        type: 'text'
      };
      const withBotResponse = [...updatedMessages, botMessage];
      setMessages(withBotResponse);
      await saveChat(bot.id || bot.name, withBotResponse);
    }, 1000);
  };

  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await compressImage(file);
      const newSettings = { ...settings, background: base64 };
      setSettings(newSettings);
      await saveChatSettings(bot.id || bot.name, newSettings);
    }
  };

  const clearHistory = async () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện?')) {
      setMessages([]);
      await saveChat(bot.id || bot.name, []);
    }
  };

  // Rabbit Ear SVG as a data URI for use in pseudo-elements or as an image
  const rabbitEarSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23F3B4C2"><path d="M12 2c-1.1 0-2 .9-2 2v4.1c-1.5-.4-3.1-.1-4.4.9C4.4 10 4 11.5 4 13c0 3.3 2.7 6 6 6h4c3.3 0 6-2.7 6-6 0-1.5-.4-3-1.6-4-.1-.1-.2-.1-.3-.2V4c0-1.1-.9-2-2-2s-2 .9-2 2v2.1c-.6-.1-1.3-.1-2 0V4c0-1.1-.9-2-2-2z"/></svg>`;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-[#F8FBFF] overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0 bg-[#F8FBFF]">
        {settings.background ? (
          <div 
            className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-500"
            style={{ backgroundImage: `url(${settings.background})` }}
          >
            <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px]" />
          </div>
        ) : (
          <div 
            className="absolute inset-0 z-0 opacity-10 pointer-events-none bg-repeat"
            style={{ 
              backgroundImage: `url('https://www.transparenttextures.com/patterns/stardust.png')`,
              backgroundSize: '100px 100px'
            }}
          />
        )}
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between p-4 bg-white/90 backdrop-blur-md border-b border-[#E0E0E0] shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-[#F0F0F0] rounded-full transition-colors text-[#8A7D85]"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border border-[#E0E0E0] overflow-hidden bg-white">
              <img 
                src={bot.avatar || 'https://picsum.photos/seed/bot/200'} 
                alt={bot.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h3 className="font-bold text-[#4A4A4A] leading-tight">{bot.name}</h3>
              <p className="text-[10px] text-[#8A7D85] uppercase tracking-wider font-bold">{bot.occupation || 'Roleplay'}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-[#F0F0F0] rounded-full transition-colors text-[#F3B4C2]"
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="relative z-10 flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide pb-24">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-60">
            <div className="w-20 h-20 rounded-full bg-white/50 flex items-center justify-center border border-[#E0E0E0]">
              <Smile className="w-10 h-10 text-[#F3B4C2]" />
            </div>
            <p className="text-[#8A7D85] font-medium">Bắt đầu cuộc trò chuyện nhập vai với {bot.name}!</p>
          </div>
        )}

        {messages.map((msg, idx) => {
          if (msg.type === 'event') {
            return (
              <div key={msg.id} className="flex justify-center my-4">
                <div className="bg-white border border-[#E0E0E0] px-4 py-1.5 rounded-full text-[11px] text-[#8A7D85] font-bold shadow-sm">
                  {msg.text}
                </div>
              </div>
            );
          }

          const isUser = msg.sender === 'user';
          
          return (
            <div 
              key={msg.id}
              className={`flex ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end gap-2.5 px-2`}
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full border border-[#E0E0E0] overflow-hidden flex-shrink-0 bg-white shadow-sm">
                <img 
                  src={isUser ? 'https://picsum.photos/seed/user/200' : (bot.avatar || 'https://picsum.photos/seed/bot/200')} 
                  alt="avatar"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Message Bubble Container */}
              <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[70%] relative`}>
                {/* Rabbit Ear Decoration */}
                <div 
                  className={`absolute -top-3 ${isUser ? '-right-1' : '-left-1'} w-6 h-6 pointer-events-none z-20`}
                  style={{ 
                    backgroundImage: `url('${rabbitEarSvg}')`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    transform: isUser ? 'scaleX(-1)' : 'none'
                  }}
                />

                {/* Bubble */}
                <div 
                  className="p-3 shadow-sm border border-[#E0E0E0] relative z-10"
                  style={{ 
                    backgroundColor: isUser ? settings.userBubbleColor : settings.botBubbleColor,
                    color: isUser ? settings.userTextColor : settings.botTextColor,
                    borderRadius: `${settings.bubbleRadius}px`,
                    fontSize: `${settings.fontSize}px`,
                  }}
                >
                  {msg.text}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-20 right-4 z-50 w-72 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-[#E0E0E0] p-6 animate-in slide-in-from-top-4 duration-300">
          <h4 className="font-bold text-[#4A4A4A] mb-4 flex items-center gap-2">
            <Settings className="w-4 h-4" /> Cài đặt Roleplay
          </h4>
          
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-[#8A7D85] block mb-2">Hình nền cảnh</label>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2 px-4 rounded-xl border-2 border-dashed border-[#E0E0E0] text-[#8A7D85] hover:border-[#F3B4C2] hover:text-[#F3B4C2] transition-all flex items-center justify-center gap-2"
              >
                <ImageIcon className="w-4 h-4" />
                {settings.background ? 'Thay đổi nền' : 'Tải ảnh nền'}
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleBackgroundUpload}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-[#8A7D85] block mb-1">Màu bong bóng Bot</label>
                <input 
                  type="color" 
                  value={settings.botBubbleColor}
                  onChange={(e) => setSettings({...settings, botBubbleColor: e.target.value})}
                  className="w-full h-8 rounded-lg cursor-pointer"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#8A7D85] block mb-1">Màu bong bóng Bạn</label>
                <input 
                  type="color" 
                  value={settings.userBubbleColor}
                  onChange={(e) => setSettings({...settings, userBubbleColor: e.target.value})}
                  className="w-full h-8 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            <button 
              onClick={clearHistory}
              className="w-full py-2 px-4 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-all flex items-center justify-center gap-2 text-sm font-bold"
            >
              <Trash2 className="w-4 h-4" />
              Xóa lịch sử
            </button>
          </div>
        </div>
      )}

      {/* Input Bar */}
      <div className="fixed bottom-0 left-0 w-full z-50 bg-white/90 backdrop-blur-md border-t border-[#E0E0E0] p-3">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <button className="p-2 bg-[#F0F0F0] rounded-full text-[#8A7D85] hover:text-[#F3B4C2] transition-colors">
            <Plus className="w-6 h-6" />
          </button>
          <div className="flex-1 relative">
            <input 
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Nhập tin nhắn..."
              className="w-full py-2.5 px-5 pr-12 rounded-full bg-[#F0F0F0] border-none focus:outline-none transition-all text-[#4A4A4A] text-sm"
            />
            <button 
              onClick={handleSendMessage}
              disabled={!inputText.trim()}
              className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all ${
                inputText.trim() ? 'text-[#F3B4C2]' : 'text-[#8A7D85] opacity-50'
              }`}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
