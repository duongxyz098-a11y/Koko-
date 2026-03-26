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
import { ErrorBoundary } from './components/ErrorBoundary';
import LockScreen from './components/LockScreen';
import PasscodeScreen from './components/PasscodeScreen';
import HomeScreen from './components/HomeScreen';
import ApiSettings, { ApiSettingsData } from './components/ApiSettings';
import KokoScreen from './components/KokoScreen';
import DatingScreen from './components/DatingScreen';
import KokoYouTube from './components/KokoYouTube';
import LoveShowScreen from './components/LoveShowScreen';
import NovelScreen from './components/NovelScreen';
import KikokoNovelScreen from './components/KikokoNovelScreen';
import RenGram from './components/RenGram';
import KokoApp from './koko/KokoApp';
import UserProfileTab from './koko/components/UserProfileTab';
import BanhNhoChatApp from './components/BanhNhoChatApp';

export default function App() {
  const [screen, setScreen] = useState<'lock' | 'passcode' | 'home' | 'koko' | 'dating' | 'youtube' | 'loveshow' | 'novel' | 'kikokonovel' | 'rengram' | 'kokoroleplay' | 'userprofile' | 'banhnho'>('lock');
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<ApiSettingsData>(() => {
    const saved = localStorage.getItem('kotokoo_settings');
    return saved ? JSON.parse(saved) : { endpoint: 'https://api.openai.com/v1', apiKey: '', model: '' };
  });

  useEffect(() => {
    try {
      localStorage.setItem('kotokoo_settings', JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings to localStorage:', e);
    }
  }, [settings]);

  return (
    <div className="h-screen w-full bg-black overflow-hidden font-sans relative">
      <ErrorBoundary>
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
              openKikokoNovel={() => setScreen('kikokonovel')}
              openRenGram={() => setScreen('rengram')}
              openKokoRoleplay={() => setScreen('kokoroleplay')}
              openUserProfile={() => setScreen('userprofile')}
              openBanhNho={() => setScreen('banhnho')}
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
          {screen === 'kikokonovel' && (
            <KikokoNovelScreen key="kikokonovel" onBack={() => setScreen('home')} />
          )}
          {screen === 'rengram' && (
            <RenGram key="rengram" onBack={() => setScreen('home')} />
          )}
          {screen === 'kokoroleplay' && (
            <KokoApp key="kokoroleplay" onBack={() => setScreen('home')} />
          )}
          {screen === 'userprofile' && (
            <div className="absolute inset-0 bg-transparent z-50">
              <UserProfileTab key="userprofile" onBack={() => setScreen('home')} />
            </div>
          )}
          {screen === 'banhnho' && (
            <BanhNhoChatApp key="banhnho" onBack={() => setScreen('home')} />
          )}
        </AnimatePresence>
      </ErrorBoundary>

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
