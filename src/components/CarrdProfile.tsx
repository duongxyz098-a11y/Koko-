import React, { useState, useRef, useEffect } from 'react';
import { Bug, Instagram, Twitter, MessageSquare, Heart, Plus, Skull } from 'lucide-react';
import { saveToDB, getFromDB } from '../utils/indexedDB';
import { compressImage } from '../utils/imageUtils';

const SpiderIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 7c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 5c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm-1-3.5c0-.28.22-.5.5-.5s.5.22.5.5-.22.5-.5.5-.5-.22-.5-.5zm2 0c0-.28.22-.5.5-.5s.5.22.5.5-.22.5-.5.5-.5-.22-.5-.5zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" opacity=".3"/>
    <path d="M12 11c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0-2c.28 0 .5.22.5.5s-.22.5-.5.5-.5-.22-.5-.5.22-.5.5-.5zm0 10c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm0-4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z"/>
    <path d="M19 12c0-1.1-.9-2-2-2h-1.1c-.4-1.2-1.3-2.1-2.4-2.6V6c0-1.1-.9-2-2-2s-2 .9-2 2v1.4c-1.1.5-2 1.4-2.4 2.6H6c-1.1 0-2 .9-2 2s.9 2 2 2h1.1c.4 1.2 1.3 2.1 2.4 2.6V20c0 1.1.9 2 2 2s2-.9 2-2v-1.4c1.1-.5 2-1.4 2.4-2.6H17c1.1 0 2-.9 2-2s-.9-2-2-2zm-7-6c0-.55.45-1 1-1s1 .45 1 1v1h-2V6zm-5 6c0-.55.45-1 1-1h1v2H8c-.55 0-1-.45-1-1zm5 8c0 .55-.45 1-1 1s-1-.45-1-1v-1h2v1zm5-8c0 .55-.45 1-1 1h-1v-2h1c.55 0 1 .45 1 1z"/>
  </svg>
);

export default function CarrdProfile({ characterId = 'default' }: { characterId?: string }) {
  const [image, setImage] = useState<string | null>(null);
  const [botName, setBotName] = useState('Untitled');
  const [botAbout, setBotAbout] = useState('');
  const [botPersonality, setBotPersonality] = useState<string[]>([]);
  const [botDetails, setBotDetails] = useState<Record<string, string>>({});
  const [background, setBackground] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const getCharKey = (key: string) => `${key}_${characterId}`;

      // Load photo from IndexedDB
      try {
        const savedPhoto = await getFromDB('profile_photos', characterId);
        if (savedPhoto) setImage(savedPhoto);
      } catch (e) {
        console.error("Failed to load profile photo", e);
      }

      // Load bot info from localStorage
      const savedInfo = localStorage.getItem(getCharKey('banhnho_bot_info'));
      const explicitName = localStorage.getItem(getCharKey('banhnho_carrd_name'));
      
      if (explicitName) {
        setBotName(explicitName);
      } else if (savedInfo) {
        const nameMatch = savedInfo.match(/Nhập tên Bot Char\s*:\s*(.*)/i);
        if (nameMatch && nameMatch[1]) {
          setBotName(nameMatch[1].trim());
        }
      }

      // Load all Carrd-specific fields
      const details: Record<string, string> = {
        age: localStorage.getItem(getCharKey('banhnho_carrd_age')) || '',
        job: localStorage.getItem(getCharKey('banhnho_carrd_job')) || '',
        socials: localStorage.getItem(getCharKey('banhnho_carrd_socials')) || '',
        hobbies: localStorage.getItem(getCharKey('banhnho_carrd_hobbies')) || '',
        appearance: localStorage.getItem(getCharKey('banhnho_carrd_appearance')) || '',
        game: localStorage.getItem(getCharKey('banhnho_carrd_game')) || '',
        movies: localStorage.getItem(getCharKey('banhnho_carrd_movies')) || '',
        review: localStorage.getItem(getCharKey('banhnho_carrd_review')) || '',
        intro: localStorage.getItem(getCharKey('banhnho_carrd_intro')) || '',
        past: localStorage.getItem(getCharKey('banhnho_carrd_past')) || '',
        mustKnow: localStorage.getItem(getCharKey('banhnho_carrd_must_know')) || '',
        lifeSummary: localStorage.getItem(getCharKey('banhnho_carrd_life_summary')) || '',
      };
      setBotDetails(details);

      // Priority 1: Use explicit Carrd Profile fields for Bio/Traits
      const explicitBio = localStorage.getItem(getCharKey('banhnho_carrd_bio'));
      const explicitIntro = localStorage.getItem(getCharKey('banhnho_carrd_intro'));
      const explicitDesc = localStorage.getItem(getCharKey('banhnho_carrd_description'));

      if (explicitBio) {
        const lines = explicitBio.split('\n')
          .map(l => l.trim())
          .filter(l => l.length > 0)
          .map(l => l.replace(/^◟\s*/, '').trim())
          .slice(0, 15); // Allow more traits
        setBotPersonality(lines);
      } else {
        // Fallback to parsing personality
        const savedPersonality = localStorage.getItem(getCharKey('banhnho_bot_personality'));
        if (savedPersonality) {
          const lines = savedPersonality.split('\n')
            .filter(l => l.trim().startsWith('◟'))
            .map(l => l.replace(/^◟\s*/, '').trim())
            .slice(0, 5);
          if (lines.length > 0) setBotPersonality(lines);
        }
      }

      if (explicitIntro) {
        setBotAbout(explicitIntro);
      } else if (explicitDesc) {
        setBotAbout(explicitDesc);
      } else if (savedInfo) {
        // Fallback to parsing appearance
        const appearanceMatch = savedInfo.match(/Ngoại hình.*:\s*([\s\S]*?)(?=\n◟|$)/i);
        if (appearanceMatch && appearanceMatch[1]) {
          setBotAbout(appearanceMatch[1].trim());
        }
      }

      // Load images from IndexedDB
      const photo = await getFromDB('profile_photos', characterId);
      if (photo) setImage(photo);

      const bg = await getFromDB('backgrounds', `carrd_bg_${characterId}`);
      if (bg) setBackground(bg);
    };

    loadData();
  }, [characterId]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        // High quality for "DỮ LIỆU KHỦNG"
        const compressed = await compressImage(file, 2048, 2048, 0.9);
        setImage(compressed);
        await saveToDB('profile_photos', characterId, compressed);
      } catch (error) {
        console.error("Failed to process profile photo:", error);
      }
    }
  };

  const handleBackgroundChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 2048, 2048, 0.9);
        setBackground(compressed);
        await saveToDB('backgrounds', `carrd_bg_${characterId}`, compressed);
      } catch (error) {
        console.error("Failed to process background:", error);
      }
    }
  };

  return (
    <div 
      className="min-h-full w-full py-6 px-4 font-sans flex flex-col items-center relative"
      style={{
        backgroundImage: background ? `url(${background})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {!background && <div className="absolute inset-0 heart-pattern opacity-50 pointer-events-none"></div>}
      
      {/* Background Upload Trigger */}
      <label className="fixed top-4 right-4 z-50 bg-white/80 backdrop-blur-sm p-2 rounded-full shadow-lg cursor-pointer hover:bg-white transition-all active:scale-95 border border-[#F9C6D4]">
        <Plus size={20} className="text-[#F3B4C2]" />
        <input type="file" className="hidden" accept="image/*" onChange={handleBackgroundChange} />
      </label>

      <div className="w-full max-w-[600px] bg-white shadow-2xl relative overflow-hidden flex flex-col rounded-sm">
        
        {/* Header Section */}
        <header className="bg-[#1a1a1a] polka-dot h-32 relative scalloped-bottom flex items-center justify-between px-6 z-20">
          <div className="w-12 h-12 rounded-full lace-border bg-white flex items-center justify-center relative">
            <SpiderIcon size={24} className="text-black" />
          </div>

          <div className="bg-[#FFE6EE] lace-border px-8 py-2 rounded-xl max-w-[60%]">
            <h1 className="font-cursive text-2xl text-[#1a1a1a] font-bold truncate">{botName}</h1>
          </div>

          <div className="w-12 h-12 rounded-full lace-border bg-white flex items-center justify-center relative">
            <SpiderIcon size={24} className="text-black" />
          </div>

          <div className="absolute -bottom-6 left-4 z-30 transform rotate-[-15deg]">
            <Bug size={36} className="text-[#F3B4C2] fill-[#F3B4C2]" />
          </div>
        </header>

        {/* Body Section */}
        <main className="flex-1 p-8 pt-16 overflow-y-auto max-h-[70vh] custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-[4fr_6fr] gap-8">
            <div className="flex flex-col gap-6">
              {/* User Photo */}
              <label className="w-full aspect-square rounded-2xl border-4 border-dotted border-[#E0B0C0] overflow-hidden cursor-pointer relative group flex items-center justify-center bg-[#F5F5F5]">
                {image ? (
                  <img 
                    src={image} 
                    alt="User profile" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-[#E0B0C0]">
                    <Plus size={40} />
                    <span className="text-xs font-bold uppercase tracking-widest mt-2">Upload Photo</span>
                  </div>
                )}
                <input 
                  type="file" 
                  onChange={handleImageChange} 
                  className="hidden" 
                  accept="image/*"
                />
              </label>

              <div className="flex items-center justify-center gap-4 text-[#1a1a1a] opacity-50">
                <span className="text-xl">🎀</span>
                <span className="text-xl">†</span>
                <span className="text-xl">🎀</span>
                <span className="text-xl">†</span>
                <span className="text-xl">🎀</span>
              </div>

              <div className="flex flex-col gap-3">
                <h3 className="font-cursive text-2xl text-[#1a1a1a]">find me...</h3>
                <div className="flex flex-col gap-2">
                  {botDetails.socials ? (
                    botDetails.socials.split(',').map((social, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <Heart size={14} className="text-[#F3B4C2] fill-[#F3B4C2]" />
                        <span className="text-gray-500 truncate">{social.trim()}</span>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="flex items-center gap-3 text-sm">
                        <MessageSquare size={16} className="text-black" />
                        <span className="text-gray-500">discord_user</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <Twitter size={16} className="text-black" />
                        <span className="text-gray-500">@twitter_handle</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {botDetails.age && (
                <div className="bg-[#FFE6EE] p-3 rounded-lg border border-[#F3B4C2]">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#1a1a1a]">Age:</span>
                  <p className="text-sm text-gray-700">{botDetails.age}</p>
                </div>
              )}

              {botDetails.job && (
                <div className="bg-[#F5F5F5] p-3 rounded-lg border border-gray-200">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#1a1a1a]">Occupation:</span>
                  <p className="text-sm text-gray-700">{botDetails.job}</p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-4">
                <h3 className="font-cursive text-2xl text-[#1a1a1a]">about me &lt;3</h3>
                <ul className="custom-bullet flex flex-col gap-2 text-sm text-gray-600">
                  {botPersonality.length > 0 ? (
                    botPersonality.map((trait, i) => <li key={i}>{trait}</li>)
                  ) : (
                    <>
                      <li>Loves gothic aesthetics and pink colors.</li>
                      <li>Enjoys roleplaying and creative writing.</li>
                      <li>Always looking for new friends to chat with!</li>
                    </>
                  )}
                </ul>
              </div>

              {botDetails.intro && (
                <div className="flex flex-col gap-2">
                  <h4 className="font-cursive text-xl text-[#1a1a1a]">giới thiệu bản thân</h4>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{botDetails.intro}</p>
                </div>
              )}

              {botDetails.hobbies && (
                <div className="flex flex-col gap-2">
                  <h4 className="font-cursive text-xl text-[#1a1a1a]">sở thích</h4>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{botDetails.hobbies}</p>
                </div>
              )}

              {botDetails.appearance && (
                <div className="flex flex-col gap-2">
                  <h4 className="font-cursive text-xl text-[#1a1a1a]">ngoại hình</h4>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{botDetails.appearance}</p>
                </div>
              )}

              {(botDetails.game || botDetails.movies) && (
                <div className="grid grid-cols-2 gap-4">
                  {botDetails.game && (
                    <div className="flex flex-col gap-1">
                      <h4 className="font-cursive text-lg text-[#1a1a1a]">game</h4>
                      <p className="text-xs text-gray-600">{botDetails.game}</p>
                    </div>
                  )}
                  {botDetails.movies && (
                    <div className="flex flex-col gap-1">
                      <h4 className="font-cursive text-lg text-[#1a1a1a]">phim</h4>
                      <p className="text-xs text-gray-600">{botDetails.movies}</p>
                    </div>
                  )}
                </div>
              )}

              {botDetails.past && (
                <div className="flex flex-col gap-2">
                  <h4 className="font-cursive text-xl text-[#1a1a1a]">quá khứ</h4>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{botDetails.past}</p>
                </div>
              )}

              {botDetails.mustKnow && (
                <div className="bg-[#1a1a1a] text-white p-4 rounded-xl">
                  <h4 className="font-cursive text-xl mb-2 flex items-center gap-2">
                    <Skull size={18} /> things to know
                  </h4>
                  <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">{botDetails.mustKnow}</p>
                </div>
              )}

              {botDetails.lifeSummary && (
                <div className="flex flex-col gap-2">
                  <h4 className="font-cursive text-xl text-[#1a1a1a]">sơ lược cuộc đời</h4>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{botDetails.lifeSummary}</p>
                </div>
              )}

              {botDetails.review && (
                <div className="border-t-2 border-dashed border-[#F3B4C2] pt-4">
                  <h4 className="font-cursive text-xl text-[#1a1a1a] mb-1">đánh giá tổng quan</h4>
                  <p className="text-sm italic text-gray-500">"{botDetails.review}"</p>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <p className="font-serif text-sm text-[#555] leading-relaxed text-justify whitespace-pre-wrap">
                  {botAbout || "Welcome to my little corner of the internet. I am a creative soul who finds beauty in the contrast between darkness and light. My world is filled with lace, spiders, and a lot of pink."}
                </p>
              </div>
            </div>
          </div>
        </main>

        <footer className="bg-[#1a1a1a] polka-dot h-16 relative scalloped-top flex items-center justify-center z-20">
          <span className="text-xs text-gray-500 font-mono">by xiu.carrd.co</span>
        </footer>
      </div>

      <nav className="mt-8 flex flex-wrap justify-center gap-4">
        {['home', 'terms', 'prices', 'gallery'].map((item, idx) => (
          <button 
            key={item}
            className="bg-white px-6 py-2 rounded-lg font-cursive text-xl text-[#1a1a1a] hover:bg-[#FFE6EE] transition-colors relative group border-2 border-[#1a1a1a] overflow-visible"
          >
            <div className="absolute inset-0 border-2 border-dotted border-[#F3B4C2] -m-1 rounded-lg pointer-events-none"></div>
            {item}
            {idx === 0 && <Bug size={18} className="absolute -top-3 -right-3 text-black transform rotate-45 z-10" />}
            {idx === 1 && <span className="absolute -bottom-3 -left-3 text-xl z-10">🐛</span>}
            {idx === 2 && <span className="absolute -top-3 -left-3 text-xl z-10">🦋</span>}
            {idx === 3 && <SpiderIcon size={18} className="absolute -bottom-3 -right-3 text-black z-10" />}
          </button>
        ))}
      </nav>
    </div>
  );
}
