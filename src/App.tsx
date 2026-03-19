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

export default function App() {
  const [screen, setScreen] = useState<'lock' | 'passcode' | 'home' | 'koko' | 'dating'>('lock');
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
            />
          )}
          {screen === 'koko' && (
            <KokoScreen key="koko" onBack={() => setScreen('home')} />
          )}
          {screen === 'dating' && (
            <DatingScreen key="dating" onBack={() => setScreen('home')} />
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
