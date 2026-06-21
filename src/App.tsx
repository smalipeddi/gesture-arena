import React, { useEffect } from 'react';
import { useGameStore } from './store/useGameStore';
import LandingPage from './pages/LandingPage';
import HowToPlayPage from './pages/HowToPlayPage';
import SettingsPage from './pages/SettingsPage';
import WebcamFeed from './components/camera/WebcamFeed';
import GameArea from './components/game/GameArea';
import HUD from './components/game/HUD';
import { Award, X } from 'lucide-react';
import audioManager from './audio/audioManager';

export const App: React.FC = () => {
  const activePage = useGameStore((state) => state.activePage);
  const recentAchievement = useGameStore((state) => state.recentUnlockedAchievement);
  const clearRecentAchievement = useGameStore((state) => state.clearRecentAchievement);

  // Global Audio Autoplay Unlocker
  useEffect(() => {
    const unlockAudio = () => {
      audioManager.resume();
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };

    window.addEventListener('click', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);

    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  // Auto-dismiss achievement toasts after 3.5 seconds
  useEffect(() => {
    if (recentAchievement) {
      const timer = setTimeout(() => {
        clearRecentAchievement();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [recentAchievement, clearRecentAchievement]);

  const renderContent = () => {
    switch (activePage) {
      case 'landing':
        return <LandingPage />;
      case 'how-to-play':
        return <HowToPlayPage />;
      case 'settings':
        return <SettingsPage />;
      case 'playing':
        return (
          <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 flex flex-col xl:flex-row gap-8 items-stretch min-h-screen text-white z-10">
            {/* Split Layout: Left Column (Webcam Feed) */}
            <div className="w-full xl:w-5/12 flex flex-col gap-3 justify-center">
              <div className="flex items-center justify-between text-xs px-1 text-zinc-400">
                <span className="font-bold uppercase tracking-wider text-zinc-500">Camera Interface Input</span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Live gestural tracking
                </span>
              </div>
              <WebcamFeed />
            </div>

            {/* Split Layout: Right Column (Game Canvas & Stats Panel) */}
            <div className="w-full xl:w-7/12 flex flex-col gap-5 justify-between">
              {/* Top stats HUD */}
              <HUD />
              
              {/* Gameplay visual canvas */}
              <div className="flex-1 min-h-[350px] md:min-h-[450px]">
                <GameArea />
              </div>
            </div>
          </div>
        );
      default:
        return <LandingPage />;
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#09090B] font-sans antialiased overflow-x-hidden selection:bg-blue-500/20">
      
      {/* Background cyber grid effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Primary view content */}
      <div className="relative flex justify-center items-center w-full min-h-screen">
        {renderContent()}
      </div>

      {/* Floating Achievement Notification Toast */}
      {recentAchievement && (
        <div className="fixed top-6 right-6 z-50 max-w-sm w-full animate-fade-in bg-zinc-900/90 border border-yellow-500/30 backdrop-blur-md p-4 rounded-2xl shadow-xl shadow-yellow-500/5 flex gap-4">
          <div className="text-3xl flex items-center justify-center w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/20 shadow-inner">
            {recentAchievement.icon}
          </div>
          <div className="flex-1 text-left">
            <span className="text-[10px] uppercase font-bold text-yellow-500 tracking-widest flex items-center gap-1">
              <Award className="w-3.5 h-3.5" /> Achievement Unlocked
            </span>
            <h4 className="text-sm font-black text-white mt-0.5">{recentAchievement.title}</h4>
            <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{recentAchievement.description}</p>
          </div>
          <button 
            onClick={clearRecentAchievement}
            className="text-zinc-500 hover:text-white transition-colors self-start p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
