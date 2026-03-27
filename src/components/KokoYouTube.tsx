import React from 'react';

export default function KokoYouTube({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col items-center justify-center">
      <h1 className="text-2xl font-bold mb-4">Koko YouTube</h1>
      <button onClick={onClose} className="px-4 py-2 bg-red-600 rounded-full">Close</button>
    </div>
  );
}
