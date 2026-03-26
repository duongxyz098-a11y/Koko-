import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Upload } from 'lucide-react';
import { compressImage } from '../../utils/imageUtils';

export default function SettingsTab() {
  const [settings, setSettings] = useState({
    maxTokens: 100000,
    timeoutMinutes: 20,
    unlimited: false,
    apiKey: '',
    endpoint: '',
    model: '',
    bgImage: '',
    bubbleColor: '#FDF2F5' // Default light pink
  });
  const [models, setModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelError, setModelError] = useState('');
  const bgInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('koko_api_settings');
    if (saved) {
      try { setSettings(JSON.parse(saved)); } catch(e){}
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('koko_api_settings', JSON.stringify(settings));
    alert('Đã lưu cài đặt!');
    window.location.reload(); // Reload to apply background
  };

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 1024, 1024, 0.6);
        setSettings({ ...settings, bgImage: compressed });
      } catch (error) {
        console.error("Background compression failed", error);
      }
      e.target.value = '';
    }
  };

  const fetchModels = async () => {
    if (!settings.apiKey || !settings.endpoint) {
      setModelError('Vui lòng nhập API Key và Proxy URL trước.');
      return;
    }
    setLoadingModels(true);
    setModelError('');
    try {
      let finalUrl = settings.endpoint.trim();
      if (finalUrl.endsWith('/')) {
        finalUrl = finalUrl.slice(0, -1);
      }
      if (finalUrl.endsWith('/chat/completions')) {
        finalUrl = finalUrl.replace('/chat/completions', '/models');
      } else if (!finalUrl.endsWith('/models')) {
        if (finalUrl.endsWith('/v1')) {
          finalUrl += '/models';
        } else {
          finalUrl += '/v1/models';
        }
      }

      const response = await fetch(finalUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${settings.apiKey.trim()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Lỗi: ${response.status}`);
      }

      const data = await response.json();
      if (data && data.data && Array.isArray(data.data)) {
        const modelIds = data.data.map((m: any) => m.id);
        setModels(modelIds);
        if (modelIds.length > 0 && !modelIds.includes(settings.model)) {
          setSettings({ ...settings, model: modelIds[0] });
        }
      } else {
        throw new Error('Định dạng phản hồi không hợp lệ.');
      }
    } catch (error: any) {
      setModelError(error.message || 'Không thể tải danh sách model.');
    } finally {
      setLoadingModels(false);
    }
  };

  return (
    <div className="p-4 pt-16 h-full overflow-y-auto pb-24">
      <h1 className="text-2xl font-bold text-[#F3B4C2] mb-6">Cài Đặt Hệ Thống</h1>
      
      <div className="space-y-6 bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-[#F9C6D4]">
        <div>
          <label className="block font-bold text-[#8A7D85] mb-2">Hình nền ứng dụng</label>
          <input 
            type="file" 
            accept="image/*"
            className="hidden"
            ref={bgInputRef}
            onChange={handleBgUpload}
          />
          <div className="flex gap-2 items-center">
            <button 
              onClick={() => bgInputRef.current?.click()}
              className="px-4 py-3 bg-[#FAF9F6] border border-[#F9C6D4] text-[#8A7D85] rounded-xl hover:bg-[#F9C6D4] hover:text-white transition-colors flex items-center gap-2"
            >
              <Upload size={20} />
              Chọn ảnh từ thiết bị
            </button>
            {settings.bgImage && (
              <button 
                onClick={() => setSettings({...settings, bgImage: ''})}
                className="px-4 py-3 bg-red-50 text-red-500 border border-red-200 rounded-xl hover:bg-red-100 transition-colors"
              >
                Xóa ảnh
              </button>
            )}
          </div>
          {settings.bgImage && (
            <div className="mt-4 w-full h-32 rounded-xl overflow-hidden border border-[#F9C6D4]">
              <img src={settings.bgImage} className="w-full h-full object-cover" alt="Background Preview" />
            </div>
          )}
          <p className="text-xs text-[#9E919A] mt-2">Ảnh sẽ được lưu và áp dụng làm hình nền cho toàn bộ ứng dụng.</p>
        </div>

        <hr className="border-[#E6DDD8]" />

        <div>
          <label className="block font-bold text-[#8A7D85] mb-2">API Key</label>
          <input 
            type="password" 
            value={settings.apiKey}
            onChange={e => setSettings({...settings, apiKey: e.target.value})}
            placeholder="sk-..."
            className="w-full p-3 rounded-xl bg-[#FAF9F6] border border-[#F9C6D4] outline-none text-[#8A7D85]"
          />
        </div>

        <div>
          <label className="block font-bold text-[#8A7D85] mb-2">Proxy URL (Endpoint)</label>
          <input 
            type="text" 
            value={settings.endpoint}
            onChange={e => setSettings({...settings, endpoint: e.target.value})}
            placeholder="https://api.openai.com/v1"
            className="w-full p-3 rounded-xl bg-[#FAF9F6] border border-[#F9C6D4] outline-none text-[#8A7D85]"
          />
        </div>

        <div>
          <label className="block font-bold text-[#8A7D85] mb-2">Model Name</label>
          <div className="flex gap-2">
            {models.length > 0 ? (
              <select
                value={settings.model}
                onChange={e => setSettings({...settings, model: e.target.value})}
                className="flex-1 p-3 rounded-xl bg-[#FAF9F6] border border-[#F9C6D4] outline-none text-[#8A7D85]"
              >
                {models.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            ) : (
              <input 
                type="text" 
                value={settings.model}
                onChange={e => setSettings({...settings, model: e.target.value})}
                placeholder="gpt-3.5-turbo"
                className="flex-1 p-3 rounded-xl bg-[#FAF9F6] border border-[#F9C6D4] outline-none text-[#8A7D85]"
              />
            )}
            <button 
              onClick={fetchModels}
              disabled={loadingModels}
              className="p-3 bg-[#F9C6D4] text-white rounded-xl hover:bg-[#F3B4C2] transition-colors flex items-center justify-center disabled:opacity-50"
              title="Tải danh sách model từ Proxy"
            >
              <RefreshCw size={20} className={loadingModels ? 'animate-spin' : ''} />
            </button>
          </div>
          {modelError && <p className="text-xs text-red-500 mt-1">{modelError}</p>}
        </div>

        <div>
          <label className="block font-bold text-[#8A7D85] mb-2">Giới hạn Token (Output)</label>
          <div className="flex gap-2 mb-2">
            <button 
              onClick={() => setSettings({...settings, maxTokens: 30000, unlimited: false})}
              className={`flex-1 py-2 rounded-lg border ${settings.maxTokens === 30000 && !settings.unlimited ? 'bg-[#F3B4C2] text-white' : 'border-[#F9C6D4] text-[#8A7D85]'}`}
            >
              30.000
            </button>
            <button 
              onClick={() => setSettings({...settings, maxTokens: 50000, unlimited: false})}
              className={`flex-1 py-2 rounded-lg border ${settings.maxTokens === 50000 && !settings.unlimited ? 'bg-[#F3B4C2] text-white' : 'border-[#F9C6D4] text-[#8A7D85]'}`}
            >
              50.000
            </button>
          </div>
          <label className="flex items-center gap-2 text-[#8A7D85]">
            <input 
              type="checkbox" 
              checked={settings.unlimited}
              onChange={e => setSettings({...settings, unlimited: e.target.checked, maxTokens: e.target.checked ? 1000000 : 100000})}
              className="w-5 h-5 accent-[#F3B4C2]"
            />
            Không giới hạn (Max Token Vĩnh Viễn)
          </label>
        </div>

        <div>
          <label className="block font-bold text-[#8A7D85] mb-2">Thời gian chờ tối đa (Phút)</label>
          <input 
            type="number" 
            min="1" max="30"
            value={settings.timeoutMinutes}
            onChange={e => setSettings({...settings, timeoutMinutes: parseInt(e.target.value)})}
            className="w-full p-3 rounded-xl bg-[#FAF9F6] border border-[#F9C6D4] outline-none text-[#8A7D85]"
          />
          <p className="text-xs text-[#9E919A] mt-1">Khuyên dùng: 5-20 phút tùy theo độ dài yêu cầu.</p>
        </div>

        <div>
          <label className="block font-bold text-[#8A7D85] mb-2">Màu bong bóng chat</label>
          <div className="flex items-center gap-4">
            <input 
              type="color" 
              value={settings.bubbleColor || '#FDF2F5'}
              onChange={e => setSettings({...settings, bubbleColor: e.target.value})}
              className="w-12 h-12 rounded-lg cursor-pointer border-2 border-[#F9C6D4] bg-transparent"
            />
            <div 
              className="flex-1 p-3 rounded-xl border border-[#F9C6D4] text-sm text-[#8A7D85]"
              style={{ backgroundColor: settings.bubbleColor || '#FDF2F5' }}
            >
              Đây là màu bong bóng chat của bạn
            </div>
          </div>
        </div>

        <button 
          onClick={handleSave}
          className="w-full py-3 bg-[#F3B4C2] text-white rounded-xl font-bold shadow-md"
        >
          Lưu Cài Đặt
        </button>
      </div>
    </div>
  );
}
