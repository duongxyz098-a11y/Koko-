import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Image as ImageIcon } from 'lucide-react';

export default function CreateCharTab({ onSaved, onCancel, editingChar }: { onSaved: () => void, onCancel?: () => void, editingChar?: any }) {
  const [formData, setFormData] = useState<any>(() => {
    if (editingChar) {
      return {
        ...editingChar,
        systemPrompts: editingChar.systemPrompts || [''],
        toneStyles: editingChar.toneStyles || [''],
        npcs: editingChar.npcs || []
      };
    }
    return {
      id: Date.now().toString(),
      name: '',
      gender: 'Nữ',
      avatar: '',
      background: '',
      history: '',
      opening: '',
      personality: '',
      appearance: '',
      nationality: 'Việt Nam',
      writingStyle: '',
      systemPrompts: [''],
      toneStyles: [''],
      topP: 0.9,
      topK: 40,
      contextSize: 100000,
      npcs: []
    };
  });

  useEffect(() => {
    if (editingChar) {
      setFormData({
        ...editingChar,
        systemPrompts: editingChar.systemPrompts || [''],
        toneStyles: editingChar.toneStyles || [''],
        npcs: editingChar.npcs || []
      });
    }
  }, [editingChar]);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    const saved = localStorage.getItem('koko_chars');
    let chars = [];
    if (saved) {
      try { 
        const parsed = JSON.parse(saved); 
        if (Array.isArray(parsed)) chars = parsed;
      } catch(e){}
    }
    
    if (editingChar) {
      chars = chars.map((c: any) => c.id === editingChar.id ? formData : c);
    } else {
      chars.push(formData);
    }
    
    localStorage.setItem('koko_chars', JSON.stringify(chars));
    onSaved();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'avatar' | 'background') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, [field]: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const addSystemPrompt = () => {
    setFormData({ ...formData, systemPrompts: [...(formData.systemPrompts || []), ''] });
  };

  const updateSystemPrompt = (index: number, value: string) => {
    const newPrompts = [...(formData.systemPrompts || [])];
    newPrompts[index] = value;
    setFormData({ ...formData, systemPrompts: newPrompts });
  };

  const removeSystemPrompt = (index: number) => {
    const newPrompts = (formData.systemPrompts || []).filter((_: any, i: number) => i !== index);
    setFormData({ ...formData, systemPrompts: newPrompts });
  };

  const addToneStyle = () => {
    setFormData({ ...formData, toneStyles: [...(formData.toneStyles || []), ''] });
  };

  const updateToneStyle = (index: number, value: string) => {
    const newStyles = [...(formData.toneStyles || [])];
    newStyles[index] = value;
    setFormData({ ...formData, toneStyles: newStyles });
  };

  const removeToneStyle = (index: number) => {
    const newStyles = (formData.toneStyles || []).filter((_: any, i: number) => i !== index);
    setFormData({ ...formData, toneStyles: newStyles });
  };

  return (
    <div className="p-4 pt-16 pb-24 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#F3B4C2]">{editingChar ? 'Sửa Nhân Vật' : 'Tạo Nhân Vật Mới'}</h1>
        {onCancel && (
          <button onClick={onCancel} className="text-[#9E919A] hover:text-[#8A7D85]">
            Hủy
          </button>
        )}
      </div>
      
      <div className="space-y-6">
        {/* Tên nhân vật */}
        <div className="bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-sm">
          <label className="block text-sm font-bold text-[#8A7D85] mb-2">Tên nhân vật</label>
          <input 
            type="text" 
            placeholder="Nhập tên nhân vật..."
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
            className="w-full p-3 rounded-xl bg-white/80 border border-[#F9C6D4] outline-none text-[#8A7D85] focus:ring-2 focus:ring-[#F9C6D4]/50 transition-all"
          />
        </div>
        
        {/* Avatar */}
        <div className="bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-sm">
          <label className="block text-sm font-bold text-[#8A7D85] mb-2">Ảnh đại diện (Avatar)</label>
          <p className="text-xs text-gray-500 mb-3">Ảnh avatar sẽ dùng để làm ảnh bìa ở phần thẻ đầu tiên.</p>
          <input type="file" accept="image/*" className="hidden" ref={avatarInputRef} onChange={e => handleImageUpload(e, 'avatar')} />
          <div 
            onClick={() => avatarInputRef.current?.click()}
            className="w-24 h-24 rounded-full bg-white/80 border-2 border-dashed border-[#F9C6D4] flex items-center justify-center cursor-pointer overflow-hidden hover:bg-[#F9C6D4]/10 transition-colors"
          >
            {formData.avatar ? <img src={formData.avatar} className="w-full h-full object-cover" /> : <ImageIcon className="text-[#F9C6D4]" />}
          </div>
          <input 
            type="text"
            placeholder="Hoặc dán link ảnh..."
            value={formData.avatar && !formData.avatar.startsWith('data:image') ? formData.avatar : ''}
            onChange={e => setFormData({...formData, avatar: e.target.value})}
            className="w-full mt-2 p-2 rounded-lg bg-white/80 border border-[#F9C6D4] outline-none text-[#8A7D85] text-sm"
          />
        </div>

        {/* Background */}
        <div className="bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-sm">
          <label className="block text-sm font-bold text-[#8A7D85] mb-2">Hình nền ảnh hiển thị trong phần Roleplay</label>
          <input type="file" accept="image/*" className="hidden" ref={bgInputRef} onChange={e => handleImageUpload(e, 'background')} />
          <div 
            onClick={() => bgInputRef.current?.click()}
            className="w-full h-32 rounded-xl bg-white/80 border-2 border-dashed border-[#F9C6D4] flex items-center justify-center cursor-pointer overflow-hidden hover:bg-[#F9C6D4]/10 transition-colors"
          >
            {formData.background ? <img src={formData.background} className="w-full h-full object-cover" /> : <ImageIcon className="text-[#F9C6D4]" />}
          </div>
          <input 
            type="text"
            placeholder="Hoặc dán link ảnh..."
            value={formData.background && !formData.background.startsWith('data:image') ? formData.background : ''}
            onChange={e => setFormData({...formData, background: e.target.value})}
            className="w-full mt-2 p-2 rounded-lg bg-white/80 border border-[#F9C6D4] outline-none text-[#8A7D85] text-sm"
          />
        </div>

        {/* Giới tính */}
        <div className="bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-sm">
          <label className="block text-sm font-bold text-[#8A7D85] mb-3">Giới tính</label>
          <div className="grid grid-cols-3 gap-3">
            {['Nam', 'Nữ', 'LGBT'].map(g => (
              <button
                key={g}
                onClick={() => setFormData({...formData, gender: g})}
                className={`py-3 rounded-xl font-medium transition-all ${formData.gender === g ? 'bg-[#F3B4C2] text-white shadow-md' : 'bg-white/80 text-[#8A7D85] border border-[#F9C6D4] hover:bg-[#F9C6D4]/20'}`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Lịch sử và thông tin cốt truyện */}
        <div className="bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-sm">
          <label className="block text-sm font-bold text-[#8A7D85] mb-2">Lịch sử và thông tin cốt truyện</label>
          <p className="text-xs text-gray-500 mb-2">Nhập chi tiết phần lịch sử và thông tin cốt truyện vào đây (không giới hạn).</p>
          <textarea 
            value={formData.history}
            onChange={e => setFormData({...formData, history: e.target.value})}
            className="w-full p-3 rounded-xl bg-white/80 border border-[#F9C6D4] outline-none text-[#8A7D85] min-h-[120px] focus:ring-2 focus:ring-[#F9C6D4]/50 transition-all"
          />
        </div>

        {/* Cốt truyện mở đầu */}
        <div className="bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-sm">
          <label className="block text-sm font-bold text-[#8A7D85] mb-2">Cốt truyện mở đầu</label>
          <p className="text-xs text-gray-500 mb-2">Nội dung mở đầu khi người dùng vào nhắn với bot char.</p>
          <textarea 
            value={formData.opening}
            onChange={e => setFormData({...formData, opening: e.target.value})}
            className="w-full p-3 rounded-xl bg-white/80 border border-[#F9C6D4] outline-none text-[#8A7D85] min-h-[100px] focus:ring-2 focus:ring-[#F9C6D4]/50 transition-all"
          />
        </div>

        {/* Tính cách chi tiết */}
        <div className="bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-sm">
          <label className="block text-sm font-bold text-[#8A7D85] mb-2">Tính cách chi tiết</label>
          <p className="text-xs text-gray-500 mb-2">Tiểu sử, sở thích, con người, tính cách khi yêu/ghen/buồn, MBTI, cung hoàng đạo, cốt cách, tâm lý, kiểu người, cách nói chuyện, tính ẩn thật, tính cách phụ, trí tuệ, học thức, kiến thức, tư duy, nhận định (viết không giới hạn).</p>
          <textarea 
            value={formData.personality}
            onChange={e => setFormData({...formData, personality: e.target.value})}
            className="w-full p-3 rounded-xl bg-white/80 border border-[#F9C6D4] outline-none text-[#8A7D85] min-h-[150px] focus:ring-2 focus:ring-[#F9C6D4]/50 transition-all"
          />
        </div>

        {/* Ngoại hình */}
        <div className="bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-sm">
          <label className="block text-sm font-bold text-[#8A7D85] mb-2">Ngoại hình</label>
          <p className="text-xs text-gray-500 mb-2">Chiều cao, cân nặng, màu da, màu mắt, màu tóc, mũi, miệng, ngón tay/chân, mùi hương, quần áo, phong cách thời trang, mi mắt...</p>
          <textarea 
            value={formData.appearance}
            onChange={e => setFormData({...formData, appearance: e.target.value})}
            className="w-full p-3 rounded-xl bg-white/80 border border-[#F9C6D4] outline-none text-[#8A7D85] min-h-[100px] focus:ring-2 focus:ring-[#F9C6D4]/50 transition-all"
          />
        </div>

        {/* Quốc tịch & Ngôn ngữ */}
        <div className="bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-sm">
          <label className="block text-sm font-bold text-[#8A7D85] mb-2">Quốc tịch hiện tại</label>
          <p className="text-xs text-gray-500 mb-2">Ngôn ngữ dùng cho toàn bộ luôn là 100% tiếng Việt kể cả quốc tịch gì.</p>
          <input 
            type="text" 
            value={formData.nationality}
            onChange={e => setFormData({...formData, nationality: e.target.value})}
            className="w-full p-3 rounded-xl bg-white/80 border border-[#F9C6D4] outline-none text-[#8A7D85] focus:ring-2 focus:ring-[#F9C6D4]/50 transition-all"
          />
        </div>

        {/* Phong cách viết, định hướng văn phong nội quy viết */}
        <div className="bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-sm">
          <label className="block text-sm font-bold text-[#8A7D85] mb-2">Phong cách viết, định hướng văn phong nội quy viết</label>
          <p className="text-xs text-gray-500 mb-2">Tránh vi phạm OOC, ngắt đoạn vô cớ, không dùng chuẩn Tiếng Việt, lặp lại lời người dùng, nói hộ lời người dùng, không trả lời ngắn, không lạc đề, không dùng dấu gạch nhiều...</p>
          <textarea 
            value={formData.writingStyle}
            onChange={e => setFormData({...formData, writingStyle: e.target.value})}
            className="w-full p-3 rounded-xl bg-white/80 border border-[#F9C6D4] outline-none text-[#8A7D85] min-h-[150px] focus:ring-2 focus:ring-[#F9C6D4]/50 transition-all"
          />
        </div>

        {/* SysTem */}
        <div className="bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-bold text-[#8A7D85]">SysTem (Lệnh hệ thống)</label>
            <button onClick={addSystemPrompt} className="p-1.5 bg-[#F9C6D4] text-white rounded-lg hover:bg-[#F3B4C2] transition-colors">
              <Plus size={16} />
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-3">Nhập lệnh hệ thống ở đây. Bấm dấu cộng để thêm nhiều lệnh.</p>
          <div className="space-y-3">
            {(formData.systemPrompts || []).map((prompt: string, index: number) => (
              <div key={index} className="flex gap-2">
                <textarea 
                  value={prompt}
                  onChange={e => updateSystemPrompt(index, e.target.value)}
                  className="flex-1 p-3 rounded-xl bg-white/80 border border-[#F9C6D4] outline-none text-[#8A7D85] min-h-[80px] focus:ring-2 focus:ring-[#F9C6D4]/50 transition-all"
                  placeholder={`Lệnh SysTem ${index + 1}...`}
                />
                {(formData.systemPrompts || []).length > 1 && (
                  <button onClick={() => removeSystemPrompt(index)} className="p-3 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors self-start">
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Phong cách viết (Tone Styles) */}
        <div className="bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-bold text-[#8A7D85]">Lựa chọn phong cách viết</label>
            <button onClick={addToneStyle} className="p-1.5 bg-[#F9C6D4] text-white rounded-lg hover:bg-[#F3B4C2] transition-colors">
              <Plus size={16} />
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-3">Hệ thống dựa vào để viết chuẩn phong cách. Ở góc kể chuyện: LUÔN LUÔN LÀ NGÔI THỨ 3 CHỈ CÓ NGÔI THỨ 3.</p>
          <div className="space-y-3">
            {(formData.toneStyles || []).map((style: string, index: number) => (
              <div key={index} className="flex gap-2">
                <textarea 
                  value={style}
                  onChange={e => updateToneStyle(index, e.target.value)}
                  className="flex-1 p-3 rounded-xl bg-white/80 border border-[#F9C6D4] outline-none text-[#8A7D85] min-h-[80px] focus:ring-2 focus:ring-[#F9C6D4]/50 transition-all"
                  placeholder={`VD: Văn kể chuyện (Narrative), Trang trọng (Formal), Ngọt sủng...`}
                />
                {(formData.toneStyles || []).length > 1 && (
                  <button onClick={() => removeToneStyle(index)} className="p-3 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors self-start">
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* NPCs */}
        <div className="bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-bold text-[#8A7D85]">Nhân vật phụ (NPC)</label>
            <button 
              onClick={() => setFormData({...formData, npcs: [...(formData.npcs || []), { id: Date.now().toString(), name: '', avatar: '', description: '' }]})} 
              className="p-1.5 bg-[#F9C6D4] text-white rounded-lg hover:bg-[#F3B4C2] transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-3">Thêm các nhân vật phụ để tương tác với nhân vật chính.</p>
          <div className="space-y-4">
            {(formData.npcs || []).map((npc: any, index: number) => (
              <div key={npc.id} className="p-4 bg-white/80 rounded-xl border border-[#F9C6D4] relative">
                <button 
                  onClick={() => {
                    const newNpcs = [...(formData.npcs || [])];
                    newNpcs.splice(index, 1);
                    setFormData({...formData, npcs: newNpcs});
                  }} 
                  className="absolute top-2 right-2 p-2 text-red-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      id={`npc-avatar-${npc.id}`}
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            const newNpcs = [...(formData.npcs || [])];
                            newNpcs[index].avatar = reader.result as string;
                            setFormData({...formData, npcs: newNpcs});
                          };
                          reader.readAsDataURL(file);
                        }
                      }} 
                    />
                    <label 
                      htmlFor={`npc-avatar-${npc.id}`}
                      className="w-16 h-16 rounded-full bg-white border-2 border-dashed border-[#F9C6D4] flex items-center justify-center cursor-pointer overflow-hidden hover:bg-[#F9C6D4]/10 transition-colors block"
                    >
                      {npc.avatar ? <img src={npc.avatar} className="w-full h-full object-cover" /> : <ImageIcon className="text-[#F9C6D4]" size={20} />}
                    </label>
                  </div>
                  <div className="flex-1 space-y-2">
                    <input 
                      type="text" 
                      placeholder="Tên NPC..."
                      value={npc.name}
                      onChange={e => {
                        const newNpcs = [...(formData.npcs || [])];
                        newNpcs[index].name = e.target.value;
                        setFormData({...formData, npcs: newNpcs});
                      }}
                      className="w-full p-2 rounded-lg bg-white border border-[#F9C6D4] outline-none text-[#8A7D85] text-sm focus:ring-2 focus:ring-[#F9C6D4]/50 transition-all"
                    />
                    <textarea 
                      placeholder="Mô tả NPC (tính cách, vai trò)..."
                      value={npc.description}
                      onChange={e => {
                        const newNpcs = [...(formData.npcs || [])];
                        newNpcs[index].description = e.target.value;
                        setFormData({...formData, npcs: newNpcs});
                      }}
                      className="w-full p-2 rounded-lg bg-white border border-[#F9C6D4] outline-none text-[#8A7D85] text-sm min-h-[60px] focus:ring-2 focus:ring-[#F9C6D4]/50 transition-all"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button 
          onClick={handleSave}
          className="w-full py-4 bg-gradient-to-r from-[#F9C6D4] to-[#F3B4C2] text-white rounded-xl font-bold shadow-lg shadow-[#F9C6D4]/50 mt-8 hover:opacity-90 active:scale-[0.98] transition-all text-lg"
        >
          {editingChar ? 'Lưu Thay Đổi' : 'Tạo Nhân Vật'}
        </button>
      </div>
    </div>
  );
}
