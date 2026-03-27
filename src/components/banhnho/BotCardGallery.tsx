import React, { useState, useEffect, useRef } from 'react';
import { BotCardPreview } from './Tab1CreateBot';
import html2canvas from 'html2canvas';
import { loadCards, saveCards } from '../../utils/db';
import { Search, Plus, Settings, Heart, Home, User, Star, Calendar, PlusCircle, Users, LayoutList, Database, PawPrint } from 'lucide-react';

export default function BotCardGallery({ onEdit }: { onEdit?: (card: any, index: number) => void }) {
  const [savedCards, setSavedCards] = useState<any[]>([]);
  const [viewIndex, setViewIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const filteredCards = savedCards.map((card, originalIndex) => ({ ...card, originalIndex })).filter(card => 
    (card.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (card.occupation || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (card.intro || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const init = async () => {
      const cards = await loadCards();
      setSavedCards(cards);
      cardRefs.current = new Array(cards.length).fill(null);
    };
    init();
  }, []);

  const handleDelete = async (index: number) => {
    const newCards = [...savedCards];
    newCards.splice(index, 1);
    setSavedCards(newCards);
    await saveCards(newCards);
    cardRefs.current = new Array(newCards.length).fill(null);
    if (viewIndex === index) setViewIndex(null);
    else if (viewIndex !== null && viewIndex > index) setViewIndex(viewIndex - 1);
    
    const selectedIndexStr = localStorage.getItem('banhnho_bot_card_selected_index');
    if (selectedIndexStr !== null) {
      const selectedIndex = parseInt(selectedIndexStr, 10);
      if (selectedIndex === index) {
        localStorage.removeItem('banhnho_bot_card_selected_index');
      } else if (selectedIndex > index) {
        localStorage.setItem('banhnho_bot_card_selected_index', (selectedIndex - 1).toString());
      }
    }
  };

  const handleDownload = async (index: number, name: string) => {
    const cardElement = cardRefs.current[index];
    if (!cardElement) return;

    try {
      const canvas = await html2canvas(cardElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
      });
      
      const link = document.createElement('a');
      link.download = `bot-card-${name || 'untitled'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error("Error downloading card:", error);
    }
  };

  const featuredCards = savedCards.slice(0, 5);

  if (viewIndex !== null) {
    const card = savedCards[viewIndex];
    return (
      <div className="fixed inset-0 z-[100] w-full h-full flex flex-col items-center animate-in fade-in zoom-in-95 duration-300 bg-[#FAF9F6] overflow-y-auto scrollbar-hide">
        <button 
          onClick={() => setViewIndex(null)}
          className="fixed top-6 left-6 z-[110] bg-white/90 backdrop-blur-md text-[#F3B4C2] p-4 rounded-full shadow-2xl border-2 border-[#F9C6D4] hover:bg-white hover:scale-110 transition-all flex items-center justify-center group"
          title="Quay lại danh sách"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-3 transition-all duration-300 font-bold whitespace-nowrap">Danh sách</span>
        </button>
        
        <div className="relative group w-full flex justify-center min-h-screen">
          <div ref={el => { cardRefs.current[viewIndex] = el; }} className="w-full">
            <BotCardPreview {...card} isGalleryDetail={true} />
          </div>
          
          <div className="fixed top-6 right-6 flex flex-col gap-4 opacity-0 group-hover:opacity-100 transition-opacity z-[110]">
            {onEdit && (
              <button 
                onClick={() => onEdit(card, viewIndex)}
                className="bg-white/95 backdrop-blur-md text-[#2196F3] p-4 rounded-full shadow-xl hover:bg-[#E3F2FD] hover:scale-110 transition-all"
                title="Chỉnh sửa thẻ này"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
            )}
            <button 
              onClick={() => handleDownload(viewIndex, card.name)}
              className="bg-white/95 backdrop-blur-md text-[#4CAF50] p-4 rounded-full shadow-xl hover:bg-[#E8F5E9] hover:scale-110 transition-all"
              title="Tải ảnh xuống"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            </button>
            <button 
              onClick={() => handleDelete(viewIndex)}
              className="bg-white/95 backdrop-blur-md text-[#C62828] p-4 rounded-full shadow-xl hover:bg-[#FFEBEE] hover:scale-110 transition-all"
              title="Xóa thẻ này"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
        <div className="pb-32" />
      </div>
    );
  }

  if (savedCards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-[#9E919A] px-10 text-center">
        <div className="text-4xl mb-4">📭</div>
        <p className="font-medium">Chưa có thẻ nhân vật nào được lưu.</p>
      </div>
    );
  }

  return (
    <div className="relative z-10 px-6 pt-12">
      {/* Search Bar */}
      <div className="max-w-md mx-auto mb-10">
        <div className="relative flex items-center">
          <Search className="absolute left-5 text-[#F3B4C2] w-5 h-5" />
          <input 
            type="text" 
            placeholder="Tìm kiếm nhân vật..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#FFF5F7] border border-[#F9C6D4] rounded-full py-4 pl-14 pr-6 text-[#4D2C2C] placeholder-[#F3B4C2] focus:outline-none focus:ring-2 focus:ring-[#F9C6D4] shadow-sm transition-all"
          />
        </div>
      </div>

      {/* Horizontal Scroll Section */}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-[#4D2C2C] mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-[#F3B4C2] fill-[#F3B4C2]" />
          Nhân vật nổi bật
        </h2>
        <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide snap-x">
          {featuredCards.map((card, index) => (
            <button 
              key={index}
              onClick={() => setViewIndex(index)}
              className="flex-shrink-0 w-32 bg-[#FDE2E4] rounded-3xl p-4 flex flex-col items-center gap-3 shadow-sm hover:scale-105 transition-transform snap-center border border-[#F9C6D4]"
            >
              <div className="w-20 h-20 rounded-full border-2 border-white overflow-hidden bg-white shadow-inner">
                {card.avatar ? (
                  <img src={card.avatar} alt={card.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#F3B4C2] text-xs">No Img</div>
                )}
              </div>
              <span className="text-sm font-bold text-[#4D2C2C] truncate w-full text-center">{card.name || 'Untitled'}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Vertical List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-[#4D2C2C] mb-4 flex items-center gap-2">
          <Heart className="w-5 h-5 text-[#F3B4C2] fill-[#F3B4C2]" />
          Tất cả nhân vật
        </h2>
        {filteredCards.map((card) => (
          <button 
            key={card.originalIndex}
            onClick={() => setViewIndex(card.originalIndex)}
            className="w-full bg-[#FFF9F0] border border-[#FDE2E4] rounded-full p-3 flex items-center gap-4 shadow-sm hover:shadow-md hover:bg-white transition-all group relative overflow-hidden"
          >
            {/* Avatar */}
            <div className="w-14 h-14 rounded-full border-2 border-[#F9C6D4] overflow-hidden bg-white shrink-0 shadow-inner">
              {card.avatar ? (
                <img src={card.avatar} alt={card.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#F3B4C2] text-[10px]">No Img</div>
              )}
            </div>

            {/* Content */}
            <div className="flex flex-col items-start text-left flex-grow overflow-hidden">
              <div className="flex items-center gap-2 w-full">
                <h3 className="font-bold text-[#2F2F2F] truncate text-lg">{card.name || 'Untitled'}</h3>
                <span className="text-[#F3B4C2]">🎀</span>
              </div>
              <p className="text-xs text-gray-500 italic truncate w-full">
                {card.intro || card.occupation || 'Khám phá câu chuyện của tôi...'}
              </p>
            </div>

            {/* Right Side */}
            <div className="flex flex-col items-end gap-1 px-4 shrink-0">
              <Calendar className="w-4 h-4 text-[#F3B4C2]" />
              <span className="text-[10px] text-[#F3B4C2] font-medium">27/03</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
