import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import type { TargetObject } from '../../types';
import { Volume2, VolumeX, Pause, Play, RotateCcw, RefreshCw } from 'lucide-react';
import audioManager from '../../audio/audioManager';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
  gravity: number;
}

interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  vy: number;
  color: string;
  alpha: number;
  fontSize: number;
}

export const GameArea: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  // Game states from store
  const activeObjects = useGameStore((state) => state.activeObjects);
  const handPosition = useGameStore((state) => state.handPosition);
  const detectedGesture = useGameStore((state) => state.detectedGesture);
  const gameState = useGameStore((state) => state.gameState);
  const tickGame = useGameStore((state) => state.tickGame);
  const difficulty = useGameStore((state) => state.difficulty);
  const score = useGameStore((state) => state.score);
  const combo = useGameStore((state) => state.combo);
  const cameraActive = useGameStore((state) => state.cameraActive);
  const trackerReady = useGameStore((state) => state.trackerReady);
  
  const pauseGame = useGameStore((state) => state.pauseGame);
  const resumeGame = useGameStore((state) => state.resumeGame);
  const resetGame = useGameStore((state) => state.resetGame);

  const isMuted = useGameStore((state) => state.settings.isMuted);
  const updateSettings = useGameStore((state) => state.updateSettings);

  // Particles & Floating Scores (held in ref to keep loop 60fps with no react overhead)
  const particles = useRef<Particle[]>([]);
  const floatingTexts = useRef<FloatingText[]>([]);
  const lastTime = useRef<number>(0);
  
  // Visual FX State
  const [screenShake, setScreenShake] = useState({ x: 0, y: 0 });
  const shakeTimer = useRef<number>(0);

  // Sync window resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && containerRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Countdown controller that waits for camera and gesture engine
  useEffect(() => {
    if (gameState !== 'countdown') return;
    if (!cameraActive || !trackerReady) return;

    const timer = setInterval(() => {
      const current = useGameStore.getState().countdown;
      if (current > 1) {
        useGameStore.setState({ countdown: current - 1 });
        audioManager.playClick();
      } else {
        clearInterval(timer);
        useGameStore.getState().startGame();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, cameraActive, trackerReady]);

  // Screen shake logic
  const triggerScreenShake = (intensity = 6) => {
    shakeTimer.current = 10; // shake for 10 frames
    const shakeLoop = () => {
      if (shakeTimer.current > 0) {
        const sx = (Math.random() - 0.5) * intensity;
        const sy = (Math.random() - 0.5) * intensity;
        setScreenShake({ x: sx, y: sy });
        shakeTimer.current--;
        requestAnimationFrame(shakeLoop);
      } else {
        setScreenShake({ x: 0, y: 0 });
      }
    };
    shakeLoop();
  };

  // Helper to spawn explosion particles
  const spawnExplosion = (x: number, y: number, color: string) => {
    const count = 20;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      particles.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: 3 + Math.random() * 4,
        alpha: 1.0,
        decay: 0.02 + Math.random() * 0.02,
        gravity: 0.04
      });
    }
  };

  // Helper to spawn floating score text
  const spawnFloatingText = (text: string, x: number, y: number, color: string) => {
    floatingTexts.current.push({
      id: Math.random().toString(),
      text,
      x,
      y,
      vy: -1.2,
      color,
      alpha: 1.0,
      fontSize: 16 + Math.min(10, Math.floor(combo / 2))
    });
  };

  // Listen to object hits and misses from the store to trigger visual effects
  const prevActiveObjects = useRef<TargetObject[]>([]);
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const w = canvas.width;
      const h = canvas.height;

      activeObjects.forEach((obj) => {
        const prev = prevActiveObjects.current.find((p) => p.id === obj.id);
        
        // Trigger hit effects
        if (obj.isHit && prev && !prev.isHit) {
          const cx = (obj.x / 100) * w;
          const cy = (obj.y / 100) * h;
          spawnExplosion(cx, cy, obj.color);
          
          // Calculate score added
          const diffMulti = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 1.5 : difficulty === 'hard' ? 2 : difficulty === 'expert' ? 3 : 5;
          const comboMulti = 1 + Math.floor(combo / 5) * 0.5;
          const pts = Math.round(10 * diffMulti * comboMulti);

          spawnFloatingText(`+${pts}`, cx, cy - 10, '#FFFFFF');
          if (combo > 0 && combo % 5 === 0) {
            spawnFloatingText(`${combo}x COMBO!`, cx, cy - 35, '#8B5CF6');
          }
          triggerScreenShake(8);
        }

        // Trigger miss effects (shatter)
        if (obj.isMissed && prev && !prev.isMissed) {
          const cx = (obj.x / 100) * w;
          const cy = (obj.y / 100) * h;
          // Miss: Red particles dropping
          for (let i = 0; i < 8; i++) {
            particles.current.push({
              x: cx + (Math.random() - 0.5) * 20,
              y: cy + (Math.random() - 0.5) * 20,
              vx: (Math.random() - 0.5) * 2,
              vy: 2 + Math.random() * 3, // drop down
              color: '#EF4444',
              size: 5 + Math.random() * 4,
              alpha: 1.0,
              decay: 0.02,
              gravity: 0.15
            });
          }
          spawnFloatingText('MISS', cx, cy - 10, '#EF4444');
          triggerScreenShake(12); // larger screen shake on miss
        }
      });
    }

    prevActiveObjects.current = activeObjects.map((obj) => ({ ...obj }));
  }, [activeObjects, combo, difficulty]);

  // Main Canvas Render loop
  useEffect(() => {
    let animId: number;

    const render = (time: number) => {
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;

      // Calculate delta time
      if (lastTime.current === 0) lastTime.current = time;
      const dt = time - lastTime.current;
      lastTime.current = time;

      // Update game mechanics if playing
      if (gameState === 'playing') {
        tickGame(dt);
      }

      ctx.save();
      // Apply screen shake
      ctx.translate(screenShake.x, screenShake.y);

      // Clear canvas
      ctx.clearRect(0, 0, w, h);

      // Draw grid lines for premium cyber-arena grid look
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Draw target objects
      activeObjects.forEach((obj) => {
        if (obj.isHit || obj.isMissed) return;

        const cx = (obj.x / 100) * w;
        const cy = (obj.y / 100) * h;
        const radius = (obj.radius / 100) * Math.min(w, h) * obj.scale;
        
        ctx.save();

        // 1. Draw glowing background aura
        ctx.shadowBlur = 20 * obj.opacity;
        ctx.shadowColor = obj.color;

        ctx.fillStyle = obj.color;
        ctx.strokeStyle = '#FFFFFF';

        // Shape Switch
        switch (obj.type) {
          case 'orb': // Circle
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fill();
            break;

          case 'cube': // Rotated square
            ctx.translate(cx, cy);
            ctx.rotate(time * 0.0015); // spin cube
            ctx.beginPath();
            ctx.rect(-radius, -radius, radius * 2, radius * 2);
            ctx.fill();
            break;

          case 'diamond': // Diamond
            ctx.translate(cx, cy);
            ctx.beginPath();
            ctx.moveTo(0, -radius * 1.25);
            ctx.lineTo(radius * 1.25, 0);
            ctx.lineTo(0, radius * 1.25);
            ctx.lineTo(-radius * 1.25, 0);
            ctx.closePath();
            ctx.fill();
            break;

          case 'triangle': // Triangle
            ctx.translate(cx, cy);
            ctx.beginPath();
            ctx.moveTo(0, -radius * 1.2);
            ctx.lineTo(radius * 1.2, radius * 0.8);
            ctx.lineTo(-radius * 1.2, radius * 0.8);
            ctx.closePath();
            ctx.fill();
            break;

          case 'star': // 5-point Star
            ctx.translate(cx, cy);
            ctx.rotate(time * 0.0005);
            const spikes = 5;
            const outerR = radius * 1.25;
            const innerR = radius * 0.6;
            let rot = (Math.PI / 2) * 3;
            let sx = 0;
            let sy = 0;
            const step = Math.PI / spikes;

            ctx.beginPath();
            ctx.moveTo(0, -outerR);
            for (let i = 0; i < spikes; i++) {
              sx = Math.cos(rot) * outerR;
              sy = Math.sin(rot) * outerR;
              ctx.lineTo(sx, sy);
              rot += step;

              sx = Math.cos(rot) * innerR;
              sy = Math.sin(rot) * innerR;
              ctx.lineTo(sx, sy);
              rot += step;
            }
            ctx.closePath();
            ctx.fill();
            break;

          case 'wave': // Wave
            ctx.strokeStyle = obj.color;
            ctx.lineWidth = 5 * obj.scale;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(cx - radius * 1.2, cy);
            ctx.quadraticCurveTo(cx - radius * 0.6, cy - radius, cx, cy);
            ctx.quadraticCurveTo(cx + radius * 0.6, cy + radius, cx + radius * 1.2, cy);
            ctx.stroke();
            break;

          case 'arrow': // Arrow
            ctx.translate(cx, cy);
            ctx.beginPath();
            ctx.moveTo(-radius * 1.2, -radius * 0.6);
            ctx.lineTo(radius * 0.4, 0);
            ctx.lineTo(-radius * 1.2, radius * 0.6);
            ctx.lineTo(-radius * 0.6, 0);
            ctx.closePath();
            ctx.fill();
            break;
        }

        ctx.restore();

        // 2. Draw border outline
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();

        // 3. Draw shrinking timer circle
        ctx.save();
        const age = Date.now() - obj.createdAt;
        const progress = Math.max(0, 1 - age / obj.duration);
        ctx.beginPath();
        ctx.arc(cx, cy, radius + 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
        ctx.strokeStyle = progress > 0.3 ? obj.color : '#EF4444'; // Red if running out of time
        ctx.lineWidth = 3.5;
        ctx.stroke();
        ctx.restore();

        // 4. Draw text indicators (Emoji / Gesture guide label) inside target
        ctx.save();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${Math.max(10, radius * 0.45)}px Outfit, Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        let shortcut = '';
        if (obj.requiredGesture === 'palm') shortcut = '👋';
        else if (obj.requiredGesture === 'fist') shortcut = '✊';
        else if (obj.requiredGesture === 'pinch') shortcut = '🤏';
        else if (obj.requiredGesture === 'peace') shortcut = '✌️';
        else if (obj.requiredGesture === 'pointing') shortcut = '👆';
        else if (obj.requiredGesture === 'swipe_left') shortcut = '👈';
        else if (obj.requiredGesture === 'swipe_right') shortcut = '👉';

        ctx.fillText(shortcut, cx, cy);
        ctx.restore();
      });

      // Update and draw particles
      particles.current = particles.current.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity; // apply gravity
        p.alpha -= p.decay;
        
        if (p.alpha <= 0) return false;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return true;
      });

      // Update and draw floating scores
      floatingTexts.current = floatingTexts.current.filter((t) => {
        t.y += t.vy;
        t.alpha -= 0.02; // slow fade out

        if (t.alpha <= 0) return false;

        ctx.save();
        ctx.globalAlpha = t.alpha;
        ctx.fillStyle = t.color;
        ctx.font = `bold ${t.fontSize}px Outfit, Inter, sans-serif`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = t.color;
        ctx.textAlign = 'center';
        ctx.fillText(t.text, t.x, t.y);
        ctx.restore();
        return true;
      });

      // Draw hand cursor pointer if available
      if (handPosition && gameState === 'playing') {
        const hx = (handPosition.x / 100) * w;
        const hy = (handPosition.y / 100) * h;

        ctx.save();
        // Pulsing glow cursor
        const scaleVal = 1 + Math.sin(time * 0.01) * 0.08;
        ctx.translate(hx, hy);
        ctx.scale(scaleVal, scaleVal);

        // Check if hand is currently hovering over any required matching gesture object
        let isHoveringCorrect = false;
        for (const obj of activeObjects) {
          if (obj.isHit || obj.isMissed) continue;
          const dist = Math.hypot((obj.x / 100) * w - hx, (obj.y / 100) * h - hy);
          // 10% hover range
          if (dist < (obj.radius + 10) / 100 * Math.min(w, h)) {
            isHoveringCorrect = obj.requiredGesture === detectedGesture;
            break;
          }
        }

        // Inner glowing core
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fillStyle = isHoveringCorrect ? '#10B981' : '#FFFFFF';
        ctx.shadowBlur = 15;
        ctx.shadowColor = isHoveringCorrect ? '#10B981' : '#3B82F6';
        ctx.fill();

        // Outer scanning ring
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.strokeStyle = isHoveringCorrect ? 'rgba(16, 185, 129, 0.6)' : 'rgba(59, 130, 246, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();
      }

      ctx.restore(); // Restore translations

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [activeObjects, gameState, handPosition, tickGame, detectedGesture, screenShake, combo]);

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[300px] md:min-h-[400px] rounded-2xl bg-zinc-950/70 backdrop-blur-md border border-zinc-800/80 overflow-hidden">
      {/* Dynamic Background Grid Mesh */}
      <canvas ref={canvasRef} className="block w-full h-full" />

      {/* Floating Status / Action Indicator Overlays (In-Game states) */}
      {gameState === 'countdown' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[4px] z-10">
          <div className="flex flex-col items-center text-center p-6 max-w-sm">
            {(!cameraActive || !trackerReady) ? (
              <>
                <RefreshCw className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                <span className="text-xs uppercase tracking-[0.25em] text-blue-400 font-bold mb-2">Calibrating Sensors</span>
                <span className="text-sm font-semibold text-zinc-300">
                  Waiting for camera & gesture engine...
                </span>
                <span className="text-[10px] text-zinc-500 mt-2">
                  Please grant camera access and show your hand in the frame once loaded.
                </span>
              </>
            ) : (
              <>
                <span className="text-xs uppercase tracking-[0.25em] text-zinc-500 font-bold mb-3">Prepare Arena</span>
                <span className="text-8xl font-black text-white animate-ping" key={useGameStore.getState().countdown}>
                  {useGameStore.getState().countdown}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {gameState === 'paused' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/85 backdrop-blur-sm z-10">
          <Pause className="w-16 h-16 text-zinc-500 mb-4 animate-bounce" />
          <h2 className="text-2xl font-bold text-white tracking-wide">Arena Paused</h2>
          <p className="text-zinc-500 text-xs mt-1 mb-6">Hold positions saved</p>
          <div className="flex gap-4">
            <button
              onClick={resumeGame}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-semibold text-white transition-colors shadow-lg shadow-blue-500/20"
            >
              <Play className="w-4 h-4" />
              Resume Game
            </button>
            <button
              onClick={resetGame}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-sm font-semibold text-white transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Restart
            </button>
          </div>
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-sm z-10 px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
            <span className="text-3xl">💀</span>
          </div>
          <h2 className="text-3xl font-black text-red-500 tracking-wider uppercase">Defeated</h2>
          <p className="text-zinc-500 text-xs mt-1 mb-6">Your reflexes gave out inside the arena</p>

          <div className="grid grid-cols-2 gap-8 px-8 py-4 bg-zinc-900/60 border border-zinc-800 rounded-xl mb-8 max-w-sm w-full">
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-500 block">Final Score</span>
              <span className="text-2xl font-extrabold text-white">{score}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-500 block">Max Combo</span>
              <span className="text-2xl font-extrabold text-blue-400">{useGameStore.getState().maxCombo}x</span>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={resetGame}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-semibold text-white transition-colors shadow-lg shadow-blue-500/20"
            >
              <RotateCcw className="w-4 h-4" />
              Play Again
            </button>
            <button
              onClick={() => useGameStore.getState().setActivePage('landing')}
              className="px-6 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-sm font-semibold text-white transition-colors"
            >
              Return Home
            </button>
          </div>
        </div>
      )}

      {/* Floating Canvas controls (Audio toggle etc) in bottom right corner of canvas */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2 z-10">
        <button
          onClick={() => updateSettings({ isMuted: !isMuted })}
          className="p-2.5 rounded-xl bg-black/60 hover:bg-zinc-900/80 border border-white/10 text-zinc-400 hover:text-white transition-colors"
          title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
        {gameState === 'playing' && (
          <button
            onClick={pauseGame}
            className="p-2.5 rounded-xl bg-black/60 hover:bg-zinc-900/80 border border-white/10 text-zinc-400 hover:text-white transition-colors"
            title="Pause Game"
          >
            <Pause className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default GameArea;
