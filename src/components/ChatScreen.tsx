import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Send, Loader2 } from 'lucide-react';
import { sendCoreMessage, ChatMessage } from '../services/coreAi';

interface Prompt {
  id: string;
  title: string;
  avatarUrl: string;
  context: string;
  rules: string;
  length: string;
  ooc: string;
}

export default function ChatScreen({ prompt, onBack }: { prompt: Prompt, onBack: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const reply = await sendCoreMessage(userMsg, messages, prompt);
      setMessages([...newMessages, { role: 'assistant', content: reply.content }]);
    } catch (error: any) {
      window.alert(error.message);
      // Remove the user message if failed, or just show error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      className="absolute inset-0 w-full h-full bg-[#FAF9F6] flex flex-col z-[200]"
    >
      {/* Global Processing Bar */}
      <AnimatePresence>
        {isLoading && (
          <motion.div 
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            className="fixed top-0 left-0 right-0 z-[1000] bg-[#F3B4C2] text-white py-3 px-4 flex items-center justify-center gap-3 shadow-lg"
          >
            <Loader2 className="animate-spin" size={20} />
            <span className="text-sm font-bold tracking-wide uppercase">Hệ thống đang làm việc... Vui lòng chờ kết quả</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="h-[60px] bg-white/90 backdrop-blur-md flex items-center px-4 shadow-sm z-10 pt-safe shrink-0">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors">
          <ChevronLeft size={24} className="text-[#5a5255]" />
        </button>
        <div className="flex items-center gap-3 ml-2">
          <div 
            className="w-10 h-10 rounded-full bg-cover bg-center shadow-sm border border-[#E6DDD8]"
            style={{ backgroundImage: `url('${prompt.avatarUrl}')` }}
          />
          <div className="font-medium text-[#5a5255] truncate max-w-[200px]">{prompt.title}</div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-10 text-sm">
            Hệ thống đã kết nối với lõi API.<br/>Bắt đầu trò chuyện dựa trên thiết lập "{prompt.title}".
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div 
              className={`max-w-[80%] p-3 rounded-[20px] ${
                msg.role === 'user' 
                  ? 'bg-[#F3B4C2] text-white rounded-tr-[4px]' 
                  : 'bg-white text-[#5a5255] border border-[#E6DDD8] rounded-tl-[4px] shadow-sm'
              }`}
              style={{ whiteSpace: 'pre-wrap' }}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-[#E6DDD8] p-3 rounded-[20px] rounded-tl-[4px] shadow-sm flex items-center gap-2 text-gray-500">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">Đang suy nghĩ...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-[#E6DDD8] pb-safe">
        <div className="flex items-center gap-2 bg-[#FAF9F6] rounded-full p-1 border border-[#E6DDD8] focus-within:border-[#F3B4C2] transition-colors">
          <input 
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Nhập tin nhắn..."
            className="flex-1 bg-transparent border-none outline-none px-4 text-[#5a5255]"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 rounded-full bg-[#F3B4C2] text-white flex items-center justify-center disabled:opacity-50 disabled:bg-gray-300 transition-colors shrink-0"
          >
            <Send size={18} className="ml-0.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
