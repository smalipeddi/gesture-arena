import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { ArrowLeft, Settings, Volume2, Camera, Cpu, RefreshCw } from 'lucide-react';
import audioManager from '../audio/audioManager';

export const SettingsPage: React.FC = () => {
  const setActivePage = useGameStore((state) => state.setActivePage);
  const settings = useGameStore((state) => state.settings);
  const updateSettings = useGameStore((state) => state.updateSettings);

  const handleMuteToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSettings({ isMuted: e.target.checked });
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    updateSettings({ volume: vol });
  };

  const handleResolutionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateSettings({ cameraResolution: e.target.value as '720p' | '1080p' });
  };

  const handleConfidenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSettings({ trackingConfidence: parseFloat(e.target.value) });
  };

  const handleResetData = () => {
    if (confirm('Are you sure you want to clear your high scores and achievements? This cannot be undone.')) {
      localStorage.removeItem('gesture_arena_highscore');
      localStorage.removeItem('gesture_arena_achievements');
      audioManager.playClick();
      alert('Data wiped! Reloading...');
      window.location.reload();
    }
  };

  return (
    <div className="relative flex flex-col justify-center items-center py-10 px-4 md:px-8 w-full max-w-3xl mx-auto min-h-screen text-white select-none">
      
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/4 w-[250px] h-[250px] rounded-full bg-blue-500/5 blur-[90px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[250px] h-[250px] rounded-full bg-purple-500/5 blur-[90px] pointer-events-none" />

      {/* Header */}
      <div className="w-full flex items-center justify-between border-b border-white/5 pb-6 mb-8 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActivePage('landing')}
            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-400 hover:text-white transition-colors"
            title="Return Home"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-xl font-black uppercase tracking-wider flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-500" />
              Settings Configuration
            </h1>
            <span className="text-xs text-zinc-500">Fine-tune audio, camera, and gestural detection thresholds</span>
          </div>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="flex flex-col gap-6 w-full z-10">
        
        {/* SECTION 1: Audio */}
        <div className="p-6 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-blue-400" />
            Audio Controls
          </h2>

          <div className="flex flex-col gap-4 mt-2">
            {/* Mute Switch */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-semibold">Mute Game Audio</span>
                <span className="text-xs text-zinc-500">Disables sound effects and chord loops</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={settings.isMuted} 
                  onChange={handleMuteToggle}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Volume Slider */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">Master Volume</span>
                <span className="font-bold text-zinc-400">{Math.round(settings.volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.volume}
                onChange={handleVolumeChange}
                disabled={settings.isMuted}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-30 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: Camera Feed options */}
        <div className="p-6 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
            <Camera className="w-4 h-4 text-blue-400" />
            Hardware & Resolution
          </h2>

          <div className="flex flex-col gap-4 mt-2">
            {/* Resolution dropdown */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-semibold">Webcam Resolution Target</span>
                <span className="text-xs text-zinc-500">Higher resolution increases CPU load</span>
              </div>
              <select
                value={settings.cameraResolution}
                onChange={handleResolutionChange}
                className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm font-semibold text-white focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="720p">720p (High Def)</option>
                <option value="1080p">1080p (Full HD)</option>
              </select>
            </div>

            {/* Skeleton checkbox */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-semibold">Show Hand Skeleton overlay</span>
                <span className="text-xs text-zinc-500">Renders digital bones connecting joints</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={settings.showSkeleton} 
                  onChange={(e) => updateSettings({ showSkeleton: e.target.checked })}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Landmarks checkbox */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-semibold">Show Landmark Nodes</span>
                <span className="text-xs text-zinc-500">Renders circles at the 21 joints</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={settings.showLandmarks} 
                  onChange={(e) => updateSettings({ showLandmarks: e.target.checked })}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* SECTION 3: AI Gesture Engine variables */}
        <div className="p-6 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-blue-400" />
            AI Gesture Tracker
          </h2>

          <div className="flex flex-col gap-4 mt-2">
            {/* Tracking confidence */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex flex-col">
                  <span className="font-semibold">Minimum Confidence Threshold</span>
                  <span className="text-xs text-zinc-500">Higher values reduce false hand detections</span>
                </div>
                <span className="font-bold text-zinc-400">{settings.trackingConfidence}</span>
              </div>
              <input
                type="range"
                min="0.3"
                max="0.9"
                step="0.05"
                value={settings.trackingConfidence}
                onChange={handleConfidenceChange}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: Game data wipe */}
        <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/10 backdrop-blur-md flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-red-400">Dangerous Ground</span>
            <span className="text-xs text-zinc-500 mt-0.5">Reset your save file, trophies, and records</span>
          </div>
          <button
            onClick={handleResetData}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/40 border border-red-500/20 text-xs font-bold text-red-400 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Wipe Score & Achievements
          </button>
        </div>

      </div>
    </div>
  );
};

export default SettingsPage;
