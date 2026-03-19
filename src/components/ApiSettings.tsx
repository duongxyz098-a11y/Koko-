import { useState } from 'react';
import { motion } from 'motion/react';
import { X, Check, Loader2 } from 'lucide-react';

export interface ApiSettingsData {
  endpoint: string;
  apiKey: string;
  model: string;
}

export default function ApiSettings({ 
  onClose, 
  settings, 
  setSettings 
}: { 
  onClose: () => void, 
  settings: ApiSettingsData, 
  setSettings: (s: ApiSettingsData) => void 
}) {
  const [endpoint, setEndpoint] = useState(settings.endpoint || 'https://api.openai.com/v1');
  const [apiKey, setApiKey] = useState(settings.apiKey || '');
  const [model, setModel] = useState(settings.model || '');
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchModels = async () => {
    setLoading(true);
    setError('');
    try {
      // Clean endpoint
      const baseUrl = endpoint.replace(/\/$/, '');
      const url = `${baseUrl}/models`;
      
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!res.ok) {
        let errText = '';
        try { errText = await res.text(); } catch (e) {}
        throw new Error(`Lỗi ${res.status}: ${errText ? errText.slice(0, 100) : 'Không thể kết nối'}`);
      }
      
      const data = await res.json();
      let modelsList: any[] = [];
      
      if (Array.isArray(data)) {
        modelsList = data;
      } else if (data && Array.isArray(data.data)) {
        modelsList = data.data;
      } else if (data && Array.isArray(data.models)) {
        modelsList = data.models;
      } else {
        throw new Error('Định dạng phản hồi không hợp lệ từ Proxy');
      }

      setModels(modelsList);
      if (modelsList.length > 0 && !model) {
        setModel(modelsList[0].id || modelsList[0].name || '');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi khi lấy danh sách model. Bạn có thể nhập tay tên model.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    setSettings({ endpoint, apiKey, model });
    onClose();
  };

  return (
    <motion.div 
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="absolute inset-0 w-full h-full bg-white z-50 flex flex-col md:max-w-md md:mx-auto md:h-[90vh] md:top-[5vh] md:rounded-3xl md:shadow-2xl md:overflow-hidden"
    >
      <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-[#FAF9F6]">
        <h2 className="text-xl font-semibold text-gray-800">Cài đặt API</h2>
        <button onClick={onClose} className="p-2 bg-gray-100 rounded-full text-gray-600">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">API Endpoint (Proxy / Official)</label>
          <input 
            type="text" 
            value={endpoint}
            onChange={e => setEndpoint(e.target.value)}
            placeholder="https://api.openai.com/v1"
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F9C6D4] transition-all"
          />
          <p className="text-xs text-gray-500">Ví dụ: https://api.openai.com/v1 hoặc địa chỉ proxy ngược</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">API Key</label>
          <input 
            type="password" 
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F9C6D4] transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Tên Model</label>
          <input 
            type="text" 
            value={model}
            onChange={e => setModel(e.target.value)}
            placeholder="gpt-3.5-turbo, claude-3-haiku, ..."
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F9C6D4] transition-all"
          />
          <p className="text-xs text-gray-500">Nhập tên model hoặc bấm nút dưới để lấy danh sách từ API</p>
          
          {models.length > 0 && (
            <div className="pt-2 animate-in fade-in slide-in-from-bottom-2">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Hoặc chọn từ danh sách:</label>
              <select 
                value={model}
                onChange={e => setModel(e.target.value)}
                className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F9C6D4] transition-all"
              >
                <option value="">-- Chọn model --</option>
                {models.map((m, i) => {
                  const modelValue = m.id || m.name;
                  return <option key={i} value={modelValue}>{modelValue}</option>;
                })}
              </select>
            </div>
          )}
        </div>

        <button 
          onClick={fetchModels}
          disabled={loading || !endpoint || !apiKey}
          className="w-full py-3 bg-[#F3B4C2] text-white rounded-xl font-medium shadow-sm hover:bg-[#f19eb0] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : 'Kéo danh sách Model'}
        </button>

        {error && (
          <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 break-words">
            {error}
          </div>
        )}
      </div>

      <div className="p-6 border-t border-gray-100 bg-[#FAF9F6]">
        <button 
          onClick={handleSave}
          className="w-full py-4 bg-gray-900 text-white rounded-2xl font-medium shadow-lg hover:bg-gray-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <Check size={20} />
          Lưu cài đặt
        </button>
      </div>
    </motion.div>
  );
}
