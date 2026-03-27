import React from 'react';
import { Camera, Heart, X } from 'lucide-react';

const posts = [
  { id: '1', image: 'https://picsum.photos/seed/post1/400/400', likes: 12 },
  { id: '2', image: 'https://picsum.photos/seed/post2/400/400', likes: 25 },
  { id: '3', image: 'https://picsum.photos/seed/post3/400/400', likes: 8 },
];

export default function RenGram({ onBack }: { onBack: () => void }) {
  return (
    <div className="fixed inset-0 bg-white text-black flex flex-col z-50">
      <div className="p-4 flex justify-between items-center border-b border-gray-200">
        <h1 className="text-xl font-bold">RenGram</h1>
        <button onClick={onBack} className="p-2 bg-gray-100 rounded-full"><X size={20} /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {posts.map(post => (
          <div key={post.id} className="mb-6">
            <img src={post.image} alt="Post" className="w-full h-80 object-cover rounded-lg" />
            <div className="mt-2 flex items-center gap-2">
              <Heart className="text-red-500" size={24} />
              <span className="font-bold">{post.likes} likes</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
