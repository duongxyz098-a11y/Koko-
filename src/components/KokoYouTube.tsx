import React, { useState } from 'react';
import { User, Heart, Dices, Mail, Settings, Edit2, X, ArrowLeft } from 'lucide-react';

const npcImageLinks = [
  'https://i.postimg.cc/G3NS3ZVY/a922b88856b69ca027ced4e29a399b92.jpg',
  'https://i.postimg.cc/8C1ZnDJb/9ba3bbbb1217a1ca33a4348dfc42f92e.jpg',
  'https://i.postimg.cc/9FnXQNpn/e1d0cd594c41440c5e1dadc28f25c69a.jpg'
];
const randomNames = ["Yuri_Neko", "Usagi_Hime", "Sakura_Chan", "Pastel_Queen", "Momo_Bear"];

export default function KokoYouTube({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [appBg, setAppBg] = useState('https://i.pinimg.com/236x/01/a9/4b/01a94b465b8df4d9d10e5bd7875955a0.jpg');
  const [toast, setToast] = useState<string | null>(null);
  const [thumbnails, setThumbnails] = useState([
    npcImageLinks[0],
    npcImageLinks[1],
    npcImageLinks[2]
  ]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1500);
  };

  const handleTabSwitch = (tab: string) => {
    setActiveTab(tab);
    showToast('Sách Thế Giới đang xoay chuyển... vui lòng chờ ♡');
  };

  const changeAppBackground = () => {
    const bgUrl = prompt("Nhập link URL ảnh bạn muốn đặt làm nền toàn App:");
    if (bgUrl) {
      setAppBg(bgUrl);
    }
  };

  const changePostThumbnail = (index: number) => {
    showToast('Đang tải...');
    setTimeout(() => {
      const bgUrl = prompt("Nhập link URL ảnh Thumbnail mới bạn muốn đặt cho Post này:");
      if (bgUrl) {
        const newThumbnails = [...thumbnails];
        newThumbnails[index] = bgUrl;
        setThumbnails(newThumbnails);
        alert("Đã cập nhật Thumbnail Post thành công ♡");
      }
    }, 100);
  };

  const renderProfile = () => (
    <div className="flex flex-col w-full h-full">
      <div className="relative w-full h-[120px] bg-gradient-to-br from-[#F9C6D4] to-[#F3B4C2]">
        <button 
          onClick={onClose}
          className="absolute top-4 left-4 p-2 bg-white/30 backdrop-blur-md rounded-full text-white z-10"
        >
          <ArrowLeft size={20} />
        </button>
      </div>
      
      <div className="px-5 pb-5 relative bg-white/40 backdrop-blur-md rounded-b-3xl shadow-sm border-b border-white/20">
        <div className="flex justify-between items-end -mt-10 mb-4">
          <img 
            src={npcImageLinks[0]} 
            className="w-[80px] h-[80px] rounded-full object-cover border-[3px] border-white cursor-pointer shadow-md relative z-10" 
            title="Bấm để đổi nền toàn App"
            onClick={changeAppBackground}
          />
          <div className="flex-1 flex justify-end gap-6 text-center text-[#5a5255] pb-2">
            <div><div className="font-bold text-lg">100</div><div className="text-xs text-[#8c8286]">Posts</div></div>
            <div><div className="font-bold text-lg">K1.1</div><div className="text-xs text-[#8c8286]">Followers</div></div>
          </div>
        </div>
        
        <div className="w-full text-sm leading-relaxed text-[#5a5255]">
          <div className="font-bold text-[16px] mb-1">User | Pink Queen</div>
          <div className="text-[#8c8286] mb-2">✧ Nữ | 23 tuổi | 📍Thái Bình</div>
          <div>Đang lướt app Sách Thế Giới tìm bạn... ♡ #pinkvibe</div>
        </div>
        
        <div className="text-center mt-4">
          <button 
            className="w-full py-2 rounded-xl bg-white/60 backdrop-blur-md border border-white/50 text-[#5a5255] text-sm font-bold shadow-sm active:scale-95 transition-transform"
            onClick={changeAppBackground}
          >
            Đổi nền App
          </button>
        </div>
      </div>
    </div>
  );

  const renderFeed = () => (
    <div className="p-5 flex flex-col">
      <div className="bg-white/60 backdrop-blur-md p-3 font-bold text-[#5a5255] text-center rounded-xl mb-4 shadow-sm">
        Quản lý Thumbnail Post ♡
      </div>
      <div className="grid grid-cols-2 gap-[10px]">
        {thumbnails.map((img, i) => (
          <div key={i} className="bg-white/60 backdrop-blur-md rounded-[15px] border-[1.5px] border-[#F3B4C2] overflow-hidden flex flex-col items-center relative p-3 shadow-sm">
            <img src={img} className="w-full aspect-video rounded-lg object-cover mb-2" />
            <div className="w-full text-left">
              <div className="font-semibold text-[#5a5255] text-sm truncate">{randomNames[i % randomNames.length]}</div>
              <div className="text-[10px] text-[#8c8286]">100k views</div>
            </div>
            <button 
              className="w-[30px] h-[30px] rounded-full bg-[#F3B4C2] text-white border-none absolute top-2 right-2 flex items-center justify-center shadow-md active:scale-95 transition-transform"
              onClick={() => changePostThumbnail(i)}
            >
              <Edit2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCurated = () => (
    <div className="p-5 text-center">
      <div className="text-lg text-[#5a5255] mb-6 font-semibold">Nội dung Curated & Favorited ♡</div>
      
      <div className="text-sm text-left text-[#5a5255] mb-3 font-medium">Nghệ sĩ nghe gần đây</div>
      <div className="w-full h-[100px] flex items-center overflow-x-auto gap-4 px-2 mb-8 pb-2">
        <img src={npcImageLinks[1]} className="w-[70px] h-[70px] rounded-full object-cover shrink-0 border-2 border-[#F3B4C2] shadow-sm" />
        <img src={npcImageLinks[2]} className="w-[70px] h-[70px] rounded-full object-cover shrink-0 border-2 border-[#F3B4C2] shadow-sm" />
        <img src={npcImageLinks[0]} className="w-[70px] h-[70px] rounded-full object-cover shrink-0 border-2 border-[#F3B4C2] shadow-sm" />
        <img src={npcImageLinks[1]} className="w-[70px] h-[70px] rounded-full object-cover shrink-0 border-2 border-[#F3B4C2] shadow-sm" />
      </div>
      
      <div className="text-sm text-left text-[#5a5255] mb-3 font-medium">Ideias de Busca Salvas</div>
      <div className="flex flex-wrap gap-3 justify-center">
        <div className="px-4 py-2 rounded-full bg-white/60 backdrop-blur-md border border-white/30 text-[#5a5255] text-sm shadow-sm">✦ Inspiração Aesthetics</div>
        <div className="px-4 py-2 rounded-full bg-white/60 backdrop-blur-md border border-white/30 text-[#5a5255] text-sm shadow-sm">Coquette Thumbnails</div>
        <div className="px-4 py-2 rounded-full bg-white/60 backdrop-blur-md border border-white/30 text-[#5a5255] text-sm shadow-sm">Lo-fi Beats</div>
        <div className="px-4 py-2 rounded-full bg-white/60 backdrop-blur-md border border-white/30 text-[#5a5255] text-sm shadow-sm">Đĩa Nhạc ♡</div>
      </div>
    </div>
  );

  const renderInbox = () => (
    <div className="p-3">
      <div className="bg-white/60 backdrop-blur-md p-3 font-bold text-[#5a5255] text-center rounded-xl mb-4 shadow-sm">
        Hộp thư nhân duyên ♡
      </div>
      <div className="flex flex-col gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center p-3 bg-white/40 backdrop-blur-sm border-b border-black/5 rounded-xl mb-1 shadow-sm">
            <img src={npcImageLinks[i % npcImageLinks.length]} className="w-[50px] h-[50px] rounded-full object-cover border-2 border-white" />
            <div className="flex-1 ml-4">
              <div className="font-semibold text-[#5a5255] mb-1">{randomNames[i % randomNames.length]}</div>
              <div className="text-xs text-[#8c8286]">Rất vui được gặp bạn ngẫu nhiên... ♡</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col bg-[#FAF9F6] transition-all duration-300 bg-cover bg-center"
      style={{ backgroundImage: `url('${appBg}')` }}
    >
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-white/60 backdrop-blur-md px-5 py-2.5 rounded-full text-[#5a5255] text-sm shadow-md z-[1000] whitespace-nowrap">
          {toast}
        </div>
      )}

      <div className="flex-1 overflow-y-auto pb-[80px]">
        {activeTab === 'profile' && renderProfile()}
        {activeTab === 'feed' && renderFeed()}
        {activeTab === 'random' && renderCurated()}
        {activeTab === 'inbox' && renderInbox()}
      </div>

      <div className="h-[70px] w-full fixed bottom-0 bg-white/50 backdrop-blur-xl flex justify-around items-center border-t border-white/30 z-[100]">
        <button 
          className={`p-2 transition-transform ${activeTab === 'profile' ? 'text-[#F3B4C2] scale-110' : 'text-[#8c8286]'}`}
          onClick={() => handleTabSwitch('profile')}
        >
          <User size={26} />
        </button>
        <button 
          className={`p-2 transition-transform ${activeTab === 'feed' ? 'text-[#F3B4C2] scale-110' : 'text-[#8c8286]'}`}
          onClick={() => handleTabSwitch('feed')}
        >
          <Heart size={26} />
        </button>
        <button 
          className={`p-2 transition-transform ${activeTab === 'random' ? 'text-[#F3B4C2] scale-110' : 'text-[#8c8286]'}`}
          onClick={() => handleTabSwitch('random')}
        >
          <Dices size={26} />
        </button>
        <button 
          className={`p-2 transition-transform ${activeTab === 'inbox' ? 'text-[#F3B4C2] scale-110' : 'text-[#8c8286]'}`}
          onClick={() => handleTabSwitch('inbox')}
        >
          <Mail size={26} />
        </button>
        <button 
          className={`p-2 transition-transform ${activeTab === 'settings' ? 'text-[#F3B4C2] scale-110' : 'text-[#8c8286]'}`}
          onClick={() => handleTabSwitch('profile')}
        >
          <Settings size={26} />
        </button>
      </div>
    </div>
  );
}
