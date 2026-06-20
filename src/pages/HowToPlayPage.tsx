import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { ArrowLeft, BookOpen, Star, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export const HowToPlayPage: React.FC = () => {
  const setActivePage = useGameStore((state) => state.setActivePage);

  const gestureCards = [
    {
      gesture: 'Open Palm',
      icon: '👋',
      target: 'Blue Orb',
      color: 'border-blue-500/20 bg-blue-500/5 text-blue-400',
      glow: 'shadow-blue-500/10',
      desc: 'Extend all 5 fingers fully. Useful for catching large blue energy orbs.'
    },
    {
      gesture: 'Fist',
      icon: '✊',
      target: 'Red Cube',
      color: 'border-red-500/20 bg-red-500/5 text-red-400',
      glow: 'shadow-red-500/10',
      desc: 'Close all fingers tightly. Use this to smash heavy red cubes entering the arena.'
    },
    {
      gesture: 'Pinch',
      icon: '🤏',
      target: 'Yellow Diamond',
      color: 'border-amber-500/20 bg-amber-500/5 text-amber-400',
      glow: 'shadow-amber-500/10',
      desc: 'Touch the tip of your index finger and thumb together. Pops small yellow diamonds.'
    },
    {
      gesture: 'Peace Sign',
      icon: '✌️',
      target: 'Green Triangle',
      color: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400',
      glow: 'shadow-emerald-500/10',
      desc: 'Extend only the index and middle fingers. Activates green defensive triangles.'
    },
    {
      gesture: 'Pointing',
      icon: '👆',
      target: 'Purple Star',
      color: 'border-purple-500/20 bg-purple-500/5 text-purple-400',
      glow: 'shadow-purple-500/10',
      desc: 'Extend only your index finger. Snipe purple star energy cores drifting by.'
    },
    {
      gesture: 'Swipe Left',
      icon: '👈',
      target: 'Orange Wave',
      color: 'border-orange-500/20 bg-orange-500/5 text-orange-400',
      glow: 'shadow-orange-500/10',
      desc: 'Flick your entire hand rapidly to the left. Instantly absorbs orange compression waves.'
    },
    {
      gesture: 'Swipe Right',
      icon: '👉',
      target: 'Cyan Arrow',
      color: 'border-cyan-500/20 bg-cyan-500/5 text-cyan-400',
      glow: 'shadow-cyan-500/10',
      desc: 'Flick your entire hand rapidly to the right. Deflects incoming cyan vector arrows.'
    }
  ];

  return (
    <div className="relative flex flex-col justify-center items-center py-10 px-4 md:px-8 w-full max-w-5xl mx-auto min-h-screen text-white select-none">
      
      {/* Background glow */}
      <div className="absolute top-10 right-10 w-[200px] h-[200px] rounded-full bg-blue-500/5 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[250px] h-[250px] rounded-full bg-purple-500/5 blur-[100px] pointer-events-none" />

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
              <BookOpen className="w-5 h-5 text-blue-500" />
              Arena Codex
            </h1>
            <span className="text-xs text-zinc-500">Learn the gesture mappings before entering combat</span>
          </div>
        </div>

        <button
          onClick={() => setActivePage('playing')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold transition-all shadow-md shadow-blue-500/10"
        >
          Enter Game
        </button>
      </div>

      {/* Intro Rules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mb-8 z-10">
        <div className="p-5 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm">How The Arena Works</h3>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Target shapes spawn from the screen edges and drift across the screen. You must hover your hand cursor over the object and execute its mapped hand gesture to score!
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-yellow-500/10 text-yellow-400">
            <Star className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm">Score Multipliers & Combos</h3>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Executing correct gestures in succession builds your combo meter, multiplying your scores. Missing a target, letting a timer expire, or performing the wrong gesture resets your multiplier!
            </p>
          </div>
        </div>
      </div>

      {/* Gesture Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full z-10">
        {gestureCards.map((card, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={`p-5 rounded-2xl border backdrop-blur-md flex flex-col justify-between shadow-lg h-[180px] ${card.color} ${card.glow}`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-white/55">Target</span>
                <span className="text-sm font-black">{card.target}</span>
              </div>
              <div className="flex items-center gap-3 mt-3">
                <span className="text-3xl">{card.icon}</span>
                <span className="text-base font-extrabold text-white">{card.gesture}</span>
              </div>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">
              {card.desc}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default HowToPlayPage;
