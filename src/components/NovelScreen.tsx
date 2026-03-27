import React from 'react';
import { BookOpen, X } from 'lucide-react';

const novels = [
  { id: '1', title: 'Koko\'s Adventure', author: 'Author A' },
  { id: '2', title: 'The Lost World', author: 'Author B' },
  { id: '3', title: 'Mystery of the Night', author: 'Author C' },
];

export default function NovelScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="fixed inset-0 bg-white text-black flex flex-col z-50">
      <div className="p-4 flex justify-between items-center border-b border-gray-200">
        <h1 className="text-xl font-bold">Novel Library</h1>
        <button onClick={onBack} className="p-2 bg-gray-100 rounded-full"><X size={20} /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {novels.map(novel => (
          <div key={novel.id} className="mb-4 p-4 border border-gray-200 rounded-lg flex items-center gap-4">
            <BookOpen className="text-[#F3B4C2]" size={32} />
            <div>
              <p className="font-bold">{novel.title}</p>
              <p className="text-sm text-gray-500">{novel.author}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
