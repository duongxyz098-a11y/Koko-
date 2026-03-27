import React from 'react';

export default function KokoApp({ onBack }: { onBack: () => void }) {
  return (
    <div className="fixed inset-0 bg-white text-black flex flex-col items-center justify-center">
      <h1 className="text-2xl font-bold mb-4">Koko Roleplay</h1>
      <button onClick={onBack} className="px-4 py-2 bg-blue-600 text-white rounded-full">Back</button>
    </div>
  );
}
