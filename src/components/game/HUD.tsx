import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import { Award, Heart, Settings, RotateCcw, Home } from 'lucide-react';

export const HUD: React.FC = () => {
  const score = useGameStore((state) => state.score);
  const lives = useGameStore((state) => state.lives);
  const combo = useGameStore((state) => state.combo);
  const maxCombo = useGameStore((state) => state.maxCombo);
  const difficulty = useGameStore((state) => state.difficulty);
  const activeObjects = useGameStore((state) => state.activeObjects);
  
  const resetGame = useGameStore((state) => state.resetGame);
  const setActivePage = useGameStore((state) => state.setActivePage);

  // Find oldest active object to display as "Current Target"
  const currentTarget = activeObjects.find((o) => !o.isHit && !o.isMissed);

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'easy': return 'from-blue-500 to-indigo-600 shadow-blue-500/20';
      case 'medium': return 'from-emerald-500 to-teal-600 shadow-emerald-500/20';
      case 'hard': return 'from-amber-500 to-orange-600 shadow-amber-500/20';
      case 'expert': return 'from-purple-500 to-violet-600 shadow-purple-500/20';
      case 'insane': return 'from-pink-500 to-red-600 shadow-pink-500/20 animate-pulse';
      default: return 'from-zinc-500 to-zinc-600';
    }
  };

  const getGestureShortcut = (gesture: string) => {
    switch (gesture) {
      case 'palm': return '👋 Open Palm';
      case 'fist': return '✊ Fist';
      case 'pinch': return '🤏 Pinch';
      case 'peace': return '✌️ Peace Sign';
      case 'pointing': return '👆 Pointing';
      case 'swipe_left': return '👈 Swipe Left';
      case 'swipe_right': return '👉 Swipe Right';
      default: return 'None';
    }
  };

  return (
    <div className="flex flex-col h-full gap-4 text-white">
      {/* 1. Statistics Bar (Score, Lives, Combo, Difficulty) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Score */}
        <div className="px-4 py-3 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md flex flex-col justify-center">
          <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Score</span>
          <span className="text-2xl font-black text-white mt-0.5 tracking-tight">{score}</span>
        </div>

        {/* Combo */}
        <div className="px-4 py-3 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md flex flex-col justify-center">
          <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Combo</span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-2xl font-black text-blue-400">{combo}x</span>
            <span className="text-xs text-zinc-500">Max: {maxCombo}x</span>
          </div>
        </div>

        {/* Lives */}
        <div className="px-4 py-3 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md flex flex-col justify-center">
          <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Shield</span>
          <div className="flex items-center gap-1.5 mt-1.5">
            {[...Array(3)].map((_, i) => (
              <Heart
                key={i}
                className={`w-5 h-5 transition-transform duration-300 ${
                  i < lives 
                    ? 'text-red-500 fill-red-500/80 scale-100 hover:scale-110' 
                    : 'text-zinc-700 scale-90'
                } ${lives === 1 && i < lives ? 'animate-bounce' : ''}`}
              />
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div className={`px-4 py-3 rounded-2xl bg-gradient-to-r ${getDifficultyColor(difficulty)} border border-white/10 shadow-lg flex flex-col justify-center text-white`}>
          <span className="text-[10px] uppercase font-bold text-white/60 tracking-wider">Difficulty</span>
          <span className="text-sm font-black uppercase tracking-widest mt-0.5">{difficulty}</span>
        </div>
      </div>

      {/* 2. Middle Panel: Target Highlight & Info Dashboard */}
      <div className="flex-1 min-h-[140px] px-6 py-5 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md flex flex-col justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest block">Active Challenge Target</span>
          {currentTarget ? (
            <div className="flex items-center gap-6 mt-4 animate-fade-in">
              {/* Glowing Target visual indicator */}
              <div 
                className="w-14 h-14 rounded-full flex items-center justify-center border-2 border-white/20 shadow-lg"
                style={{ 
                  backgroundColor: currentTarget.color,
                  boxShadow: `0 0 25px ${currentTarget.glowColor}`
                }}
              >
                <span className="text-2xl">
                  {currentTarget.requiredGesture === 'palm' && '👋'}
                  {currentTarget.requiredGesture === 'fist' && '✊'}
                  {currentTarget.requiredGesture === 'pinch' && '🤏'}
                  {currentTarget.requiredGesture === 'peace' && '✌️'}
                  {currentTarget.requiredGesture === 'pointing' && '👆'}
                  {currentTarget.requiredGesture === 'swipe_left' && '👈'}
                  {currentTarget.requiredGesture === 'swipe_right' && '👉'}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Perform Gesture:</span>
                <span className="text-xl font-black text-white tracking-wide mt-0.5">
                  {getGestureShortcut(currentTarget.requiredGesture)}
                </span>
                <span className="text-[10px] text-zinc-500 mt-0.5">
                  Requires hitting the {currentTarget.label}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-20 text-zinc-500 text-xs mt-2 italic">
              Awaiting next target spawn...
            </div>
          )}
        </div>

        {/* Small Leaderboard / Streak status */}
        <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs text-zinc-500">
          <div className="flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-yellow-500" />
            <span>High Score: <strong className="text-zinc-300">{useGameStore.getState().highScore}</strong></span>
          </div>
          <span>Active Targets: <strong className="text-zinc-300">{activeObjects.filter(o => !o.isHit && !o.isMissed).length}</strong></span>
        </div>
      </div>

      {/* 3. Bottom Panel: Mini-Gesture reference guide */}
      <div className="px-5 py-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md">
        <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block mb-3">Gesture Mapping Matrix</span>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {[
            { name: '👋 Palm', shape: 'Blue Orb', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
            { name: '✊ Fist', shape: 'Red Cube', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
            { name: '🤏 Pinch', shape: 'Yellow Dmd', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
            { name: '✌️ Peace', shape: 'Green Tri', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
            { name: '👆 Point', shape: 'Purple Star', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
            { name: '👈 Swipe L', shape: 'Orange Wave', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
            { name: '👉 Swipe R', shape: 'Cyan Arrow', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' }
          ].map((item, idx) => (
            <div key={idx} className={`p-2 rounded-xl border flex flex-col items-center text-center ${item.color}`}>
              <span className="text-xs font-bold">{item.name}</span>
              <span className="text-[9px] font-medium text-white/50 mt-0.5">{item.shape}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Action bar (Reset, Settings, Return Home) */}
      <div className="flex gap-3">
        <button
          onClick={resetGame}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 font-semibold text-xs transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Restart Arena
        </button>
        <button
          onClick={() => setActivePage('settings')}
          className="p-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
          title="Open Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
        <button
          onClick={() => setActivePage('landing')}
          className="p-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
          title="Exit to Main Menu"
        >
          <Home className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default HUD;
