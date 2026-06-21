import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import { Award, Heart, Settings, RotateCcw, Home, Info } from 'lucide-react';

export const HUD: React.FC = () => {
  const score = useGameStore((state) => state.score);
  const lives = useGameStore((state) => state.lives);
  const combo = useGameStore((state) => state.combo);
  const maxCombo = useGameStore((state) => state.maxCombo);
  const difficulty = useGameStore((state) => state.difficulty);
  const activeObjects = useGameStore((state) => state.activeObjects);
  
  const resetGame = useGameStore((state) => state.resetGame);
  const setActivePage = useGameStore((state) => state.setActivePage);

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
          <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest block">Combat Directives</span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            <div className="flex items-center gap-2.5 bg-zinc-900/40 p-2.5 rounded-xl border border-white/5">
              <span className="text-xl">🍉</span>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase text-emerald-400">Slice Fruits</span>
                <span className="text-[9px] text-zinc-400">Hover hand to slash</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 bg-zinc-900/40 p-2.5 rounded-xl border border-white/5">
              <span className="text-xl">💣</span>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase text-red-400">Avoid Bombs</span>
                <span className="text-[9px] text-zinc-400">Detonates on contact</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 bg-zinc-900/40 p-2.5 rounded-xl border border-white/5">
              <span className="text-xl">🔻</span>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase text-amber-400">Keep Them Up</span>
                <span className="text-[9px] text-zinc-400">Loses shield on drop</span>
              </div>
            </div>
          </div>
        </div>

        {/* Small Leaderboard / Streak status */}
        <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs text-zinc-500 mt-4">
          <div className="flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-yellow-500" />
            <span>High Score: <strong className="text-zinc-300">{useGameStore.getState().highScore}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-blue-400" />
            <span>Active Targets: <strong className="text-zinc-300">{activeObjects.filter(o => !o.isHit && !o.isMissed).length}</strong></span>
          </div>
        </div>
      </div>

      {/* 3. Action bar (Reset, Settings, Return Home) */}
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
