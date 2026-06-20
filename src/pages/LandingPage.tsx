import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { Play, HelpCircle, Settings, Award, ShieldAlert, Cpu } from 'lucide-react';
import WebcamFeed from '../components/camera/WebcamFeed';

export const LandingPage: React.FC = () => {
  const setActivePage = useGameStore((state) => state.setActivePage);
  const highScore = useGameStore((state) => state.highScore);
  const achievements = useGameStore((state) => state.achievements);
  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <div className="relative flex flex-col justify-center items-center py-6 px-4 md:px-8 w-full max-w-6xl mx-auto min-h-screen text-white select-none">
      {/* Dynamic ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] rounded-full bg-purple-500/5 blur-[100px] pointer-events-none" />

      {/* Main Grid: Left is Title/Hero + Buttons, Right is camera preview calibration test */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 w-full z-10 items-center">
        
        {/* Left Column: Game branding, high scores, primary navigation */}
        <div className="lg:col-span-6 flex flex-col items-start text-left">
          
          {/* Cyberpunk game tag */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-bold text-blue-400 mb-6">
            <Cpu className="w-3.5 h-3.5" />
            <span>AI GESTURAL DETECTION GAME</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-black tracking-tight text-white uppercase leading-[0.95]">
            Gesture <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500">Arena</span>
          </h1>

          <p className="mt-4 text-zinc-400 text-sm md:text-base leading-relaxed max-w-md">
            Enter a minimal kinetic combat arena. Dodge, slash, and trigger particles entirely using real-time webcam hand tracking. No controller required.
          </p>

          {/* Navigation Controls */}
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md mt-8">
            <button
              onClick={() => setActivePage('playing')}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-sm font-bold text-white transition-all shadow-lg hover:shadow-blue-500/30 scale-100 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Play className="w-4 h-4 fill-white" />
              Start Arena Match
            </button>
            <button
              onClick={() => setActivePage('how-to-play')}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 text-sm font-bold text-white transition-all scale-100 hover:scale-[1.02] active:scale-[0.98]"
            >
              <HelpCircle className="w-4 h-4" />
              How to Play
            </button>
            <button
              onClick={() => setActivePage('settings')}
              className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-400 hover:text-white transition-all scale-100 hover:scale-[1.02] active:scale-[0.98]"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

          {/* Stats quick card (High Score & Achievements) */}
          <div className="grid grid-cols-2 gap-4 w-full max-w-md mt-10 p-5 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md">
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-500 block">Personal Best</span>
              <span className="text-3xl font-black text-white mt-1">{highScore} <span className="text-xs text-zinc-500 font-normal">pts</span></span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-500 block">Achievements</span>
              <span className="text-3xl font-black text-blue-400 mt-1">{unlockedCount} <span className="text-xs text-zinc-500 font-normal">/ {achievements.length}</span></span>
            </div>
          </div>

        </div>

        {/* Right Column: Interactive Webcam Quick-Test widget */}
        <div className="lg:col-span-6 flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs px-2 text-zinc-400">
            <span className="font-semibold uppercase tracking-wider text-zinc-500">Gestural Camera Quick-Test</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Live preview
            </span>
          </div>
          
          <WebcamFeed />

          {/* Guide tag under preview */}
          <div className="flex gap-2.5 items-start p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm text-xs text-zinc-400 mt-1">
            <ShieldAlert className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Calibration Advice:</strong> Adjust your distance until your full hand is tracked. You can test your Open Palm, Fist, and Peace signs directly above before launching the game!
            </p>
          </div>
        </div>

      </div>

      {/* Grid of trophies/achievements at very bottom */}
      {unlockedCount > 0 && (
        <div className="w-full mt-16 pt-8 border-t border-white/5 z-10 text-left">
          <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider flex items-center gap-1.5 mb-4">
            <Award className="w-4 h-4 text-yellow-500" /> Unlocked Achievements
          </span>
          <div className="flex flex-wrap gap-3">
            {achievements.filter(a => a.unlocked).map((ach) => (
              <div 
                key={ach.id}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-yellow-500/5 border border-yellow-500/10 text-xs text-yellow-400 shadow-md shadow-yellow-500/2"
                title={ach.description}
              >
                <span>{ach.icon}</span>
                <span className="font-semibold text-zinc-200">{ach.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
