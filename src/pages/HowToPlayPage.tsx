import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { ArrowLeft, BookOpen, Star, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export const HowToPlayPage: React.FC = () => {
  const setActivePage = useGameStore((state) => state.setActivePage);

  const rulesCards = [
    {
      title: 'Slice Fruits',
      icon: '🍉',
      color: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400',
      glow: 'shadow-emerald-500/10',
      desc: 'Move your hand cursor quickly over Apples, Bananas, Watermelons, Coconuts, and Oranges to slice them. Slicing fruits splits them and scores points!'
    },
    {
      title: 'Avoid Bombs',
      icon: '💣',
      color: 'border-red-500/20 bg-red-500/5 text-red-400',
      glow: 'shadow-red-500/10',
      desc: 'Watch out for spiked metal bombs with burning fuses. Slicing a bomb triggers an instant explosion, shakes the screen, and costs you a life!'
    },
    {
      title: 'Keep Them Up',
      icon: '🔻',
      color: 'border-amber-500/20 bg-amber-500/5 text-amber-400',
      glow: 'shadow-amber-500/10',
      desc: 'Do not let regular fruits fall back down past the bottom edge of the arena. Each fruit that drops uncut costs you one of your 3 lives!'
    },
    {
      title: 'Build Combos',
      icon: '⚡',
      color: 'border-purple-500/20 bg-purple-500/5 text-purple-400',
      glow: 'shadow-purple-500/10',
      desc: 'Slice multiple fruits in quick succession to increase your Combo Multiplier. Higher combos multiply your score significantly!'
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
            <span className="text-xs text-zinc-500">Learn the combat directives before entering the arena</span>
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
            <h3 className="font-bold text-sm">Webcam Hand Tracker</h3>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Show your hand to the camera to summon the glowing light-saber trail. Sweep your hand across the air to slash through fruits. High-velocity hand motions make for cleaner cuts!
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-yellow-500/10 text-yellow-400">
            <Star className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm">Gradual Intensity Scale</h3>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              As you survive inside the arena, difficulty escalates from Easy to Insane. Fruits and bombs spawn faster, rise higher, and test your reaction limits to the maximum.
            </p>
          </div>
        </div>
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full z-10">
        {rulesCards.map((card, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={`p-5 rounded-2xl border backdrop-blur-md flex flex-col justify-between shadow-lg h-[190px] ${card.color} ${card.glow}`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-white/55">Directives</span>
                <span className="text-2xl">{card.icon}</span>
              </div>
              <h3 className="text-base font-extrabold text-white mt-3">{card.title}</h3>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed font-medium mt-2">
              {card.desc}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default HowToPlayPage;
