/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import LockScreen from './components/LockScreen';
import PasscodeScreen from './components/PasscodeScreen';
import HomeScreen from './components/HomeScreen';
import ApiSettings, { ApiSettingsData } from './components/ApiSettings';
import KokoScreen from './components/KokoScreen';
import DatingScreen from './components/DatingScreen';
import KokoYouTube from './components/KokoYouTube';
import LoveShowScreen from './components/LoveShowScreen';
import NovelScreen from './components/NovelScreen';
import RenGram from './components/RenGram';

export default function App() {
  const [screen, setScreen] = useState<'lock' | 'passcode' | 'home' | 'koko' | 'dating' | 'youtube' | 'loveshow' | 'novel' | 'rengram'>('lock');
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<ApiSettingsData>(() => {
    const saved = localStorage.getItem('kotokoo_settings');
    return saved ? JSON.parse(saved) : { endpoint: 'https://api.openai.com/v1', apiKey: '', model: '' };
  });

  useEffect(() => {
    localStorage.setItem('kotokoo_settings', JSON.stringify(settings));
  }, [settings]);

  return (
    <div className="h-screen w-full bg-black overflow-hidden font-sans relative">
        <AnimatePresence mode="wait">
          {screen === 'lock' && (
            <LockScreen key="lock" onUnlock={() => setScreen('passcode')} />
          )}
          {screen === 'passcode' && (
            <PasscodeScreen 
              key="passcode" 
              onSuccess={() => setScreen('home')} 
              onCancel={() => setScreen('lock')} 
            />
          )}
          {screen === 'home' && (
            <HomeScreen 
              key="home" 
              openSettings={() => setShowSettings(true)} 
              openKoko={() => setScreen('koko')}
              openDating={() => setScreen('dating')}
              openYouTube={() => setScreen('youtube')}
              openLoveShow={() => setScreen('loveshow')}
              openNovel={() => setScreen('novel')}
              openRenGram={() => setScreen('rengram')}
            />
          )}
          {screen === 'koko' && (
            <KokoScreen key="koko" onBack={() => setScreen('home')} />
          )}
          {screen === 'dating' && (
            <DatingScreen key="dating" onBack={() => setScreen('home')} />
          )}
          {screen === 'youtube' && (
            <KokoYouTube key="youtube" onClose={() => setScreen('home')} />
          )}
          {screen === 'loveshow' && (
            <LoveShowScreen key="loveshow" onBack={() => setScreen('home')} />
          )}
          {screen === 'novel' && (
            <NovelScreen key="novel" onBack={() => setScreen('home')} />
          )}
          {screen === 'rengram' && (
            <RenGram key="rengram" onBack={() => setScreen('home')} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showSettings && (
            <ApiSettings 
              key="settings" 
              onClose={() => setShowSettings(false)} 
              settings={settings}
              setSettings={setSettings}
            />
          )}
        </AnimatePresence>
    </div>
  );
}
