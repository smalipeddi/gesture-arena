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

interface SliceLine {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  alpha: number;
  createdAt: number;
}

export const GameArea: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  // Game states from store
  const activeObjects = useGameStore((state) => state.activeObjects);
  const slicedHalves = useGameStore((state) => state.slicedHalves);
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
  const sliceLines = useRef<SliceLine[]>([]);
  const lastTime = useRef<number>(0);
  const trail = useRef<{ x: number; y: number; time: number; color?: string }[]>([]);
  
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

          // Add slice line representing cut direction
          if (!obj.isBomb) {
            let angle = 0;
            if (trail.current.length > 1) {
              const p1 = trail.current[trail.current.length - 2];
              const p2 = trail.current[trail.current.length - 1];
              angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
            } else {
              angle = Math.random() * Math.PI * 2;
            }
            const radius = (obj.radius / 100) * Math.min(w, h);
            const len = radius * 1.6;
            sliceLines.current.push({
              id: Math.random().toString(),
              x1: cx - Math.cos(angle) * len,
              y1: cy - Math.sin(angle) * len,
              x2: cx + Math.cos(angle) * len,
              y2: cy + Math.sin(angle) * len,
              alpha: 1.0,
              createdAt: Date.now()
            });
          }
          
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

  const getGestureColor = (gesture: string) => {
    if (gesture && gesture !== 'none') {
      return '#FFD700'; // Gold!
    }
    return '#06B6D4'; // default Cyan
  };

  // Record and update hand trail for slashing effect
  if (handPosition && (gameState === 'playing' || gameState === 'countdown')) {
    const hx = (handPosition.x / 100) * w;
    const hy = (handPosition.y / 100) * h;
    const color = getGestureColor(detectedGesture);
    trail.current.push({ x: hx, y: hy, time: Date.now(), color });
  }
  // Keep trail points only for the last 180ms
  trail.current = trail.current.filter((p) => Date.now() - p.time < 180);

  // Draw Sword Trail
  if (trail.current.length > 1 && (gameState === 'playing' || gameState === 'countdown')) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    for (let i = 1; i < trail.current.length; i++) {
      const p1 = trail.current[i - 1];
      const p2 = trail.current[i];
      const age = Date.now() - p2.time;
      const ratio = Math.max(0, 1 - age / 180);
      
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      
      ctx.save();
      ctx.shadowBlur = 12;
      ctx.shadowColor = p2.color || '#06B6D4';
      ctx.strokeStyle = p2.color || '#06B6D4';
      ctx.lineWidth = 9 * ratio;
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

      // Draw sliced halves
      slicedHalves.forEach((half) => {
        const cx = (half.x / 100) * w;
        const cy = (half.y / 100) * h;
        const radius = (half.type === 'watermelon' ? 9.5 : half.type === 'banana' ? 7.5 : 7.0) / 100 * Math.min(w, h);
        
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(half.rotation);
        ctx.globalAlpha = half.opacity;

        // Glow aura matching fruit color
        ctx.shadowBlur = 10 * half.opacity;
        ctx.shadowColor = half.color;

        const sideMultiplier = half.side === 'left' ? -1 : 1;
        const startAngle = half.side === 'left' ? Math.PI / 2 : -Math.PI / 2;
        const endAngle = half.side === 'left' ? (3 * Math.PI) / 2 : Math.PI / 2;

        // Draw shell rind
        ctx.beginPath();
        ctx.arc(0, 0, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = half.color;
        ctx.fill();

        // Draw flesh inside
        let fleshColor = '#FFFFFF';
        if (half.type === 'watermelon') fleshColor = '#EF4444'; // pinkish red inside
        else if (half.type === 'orange') fleshColor = '#FDBA74';
        else if (half.type === 'apple') fleshColor = '#FEF08A';
        else if (half.type === 'banana') fleshColor = '#FEF9C3';
        else if (half.type === 'coconut') fleshColor = '#FEFEE2';

        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.82, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = fleshColor;
        ctx.fill();

        // Details (seeds / segments)
        if (half.type === 'watermelon') {
          ctx.fillStyle = '#1E1E24';
          ctx.beginPath();
          ctx.arc(sideMultiplier * radius * 0.3, -radius * 0.2, radius * 0.08, 0, Math.PI * 2);
          ctx.arc(sideMultiplier * radius * 0.4, radius * 0.25, radius * 0.08, 0, Math.PI * 2);
          ctx.fill();
        } else if (half.type === 'orange') {
          ctx.strokeStyle = 'rgba(249, 115, 22, 0.4)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(sideMultiplier * radius * 0.7, -radius * 0.35);
          ctx.moveTo(0, 0);
          ctx.lineTo(sideMultiplier * radius * 0.7, radius * 0.35);
          ctx.stroke();
        }

        ctx.restore();
      });

      // Draw active fruits & bombs
      activeObjects.forEach((obj) => {
        if (obj.isHit || obj.isMissed) return;

        const cx = (obj.x / 100) * w;
        const cy = (obj.y / 100) * h;
        const radius = (obj.radius / 100) * Math.min(w, h) * obj.scale;
        
        ctx.save();
        ctx.shadowBlur = 15 * obj.opacity;
        ctx.shadowColor = obj.color;

        if (obj.isBomb) {
          // Draw Bomb
          ctx.fillStyle = '#1E1E24';
          ctx.beginPath();
          ctx.arc(cx, cy, radius * 0.95, 0, Math.PI * 2);
          ctx.fill();

          // Spikes
          ctx.fillStyle = '#4B5563';
          const spikes = 8;
          for (let i = 0; i < spikes; i++) {
            const angle = (i * Math.PI * 2) / spikes + obj.rotation;
            const sx = cx + Math.cos(angle) * radius * 0.85;
            const sy = cy + Math.sin(angle) * radius * 0.85;
            const ex = cx + Math.cos(angle) * radius * 1.15;
            const ey = cy + Math.sin(angle) * radius * 1.15;
            ctx.beginPath();
            ctx.moveTo(sx - Math.sin(angle) * radius * 0.12, sy + Math.cos(angle) * radius * 0.12);
            ctx.lineTo(ex, ey);
            ctx.lineTo(sx + Math.sin(angle) * radius * 0.12, sy - Math.cos(angle) * radius * 0.12);
            ctx.closePath();
            ctx.fill();
          }

          // Fuse
          ctx.strokeStyle = '#D97706';
          ctx.lineWidth = radius * 0.1;
          ctx.beginPath();
          ctx.moveTo(cx, cy - radius * 0.8);
          ctx.quadraticCurveTo(cx + radius * 0.4, cy - radius * 1.3, cx + radius * 0.5, cy - radius * 1.45);
          ctx.stroke();

          // Spark particle
          const sparkX = cx + radius * 0.5;
          const sparkY = cy - radius * 1.45;
          const sparkR = radius * (0.15 + Math.random() * 0.25);
          ctx.fillStyle = Math.random() > 0.5 ? '#EF4444' : '#F59E0B';
          ctx.beginPath();
          ctx.arc(sparkX, sparkY, sparkR, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Draw required gesture overlay badge above the fruit
          let gestureEmoji = '';
          if (obj.type === 'apple') gestureEmoji = '✊';
          else if (obj.type === 'banana') gestureEmoji = '✌️';
          else if (obj.type === 'watermelon') gestureEmoji = '👋';
          else if (obj.type === 'coconut') gestureEmoji = '🤏';
          else if (obj.type === 'orange') gestureEmoji = '👆';

          if (gestureEmoji) {
            ctx.save();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.lineWidth = 1.5;
            
            const bx = cx;
            const by = cy - radius - 18;
            ctx.beginPath();
            ctx.arc(bx, by, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 12px Outfit, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(gestureEmoji, bx, by);
            ctx.restore();
          }

          // Draw Fruit
          ctx.translate(cx, cy);
          ctx.rotate(obj.rotation);

          if (obj.type === 'apple') {
            ctx.fillStyle = '#EF4444';
            ctx.beginPath();
            ctx.arc(-radius * 0.15, 0, radius * 0.95, 0, Math.PI * 2);
            ctx.arc(radius * 0.15, 0, radius * 0.95, 0, Math.PI * 2);
            ctx.fill();
            
            // Specular radial gloss highlight
            const gloss = ctx.createRadialGradient(-radius * 0.3, -radius * 0.3, 0, -radius * 0.3, -radius * 0.3, radius * 0.7);
            gloss.addColorStop(0, 'rgba(255, 255, 255, 0.65)');
            gloss.addColorStop(0.3, 'rgba(255, 255, 255, 0.25)');
            gloss.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = gloss;
            ctx.beginPath();
            ctx.arc(-radius * 0.15, 0, radius * 0.95, 0, Math.PI * 2);
            ctx.arc(radius * 0.15, 0, radius * 0.95, 0, Math.PI * 2);
            ctx.fill();

            // Stem
            ctx.strokeStyle = '#78350F';
            ctx.lineWidth = radius * 0.15;
            ctx.beginPath();
            ctx.moveTo(0, -radius * 0.7);
            ctx.quadraticCurveTo(radius * 0.2, -radius * 1.25, radius * 0.3, -radius * 1.2);
            ctx.stroke();

            // Leaf
            ctx.fillStyle = '#10B981';
            ctx.beginPath();
            ctx.ellipse(radius * 0.2, -radius * 1.0, radius * 0.35, radius * 0.18, Math.PI / 4, 0, Math.PI * 2);
            ctx.fill();
          } else if (obj.type === 'banana') {
            ctx.strokeStyle = '#F59E0B';
            ctx.lineWidth = radius * 0.55;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(-radius * 0.3, -radius * 0.3, radius * 0.95, 0.15 * Math.PI, 0.65 * Math.PI);
            ctx.stroke();

            // Specular curve highlight
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
            ctx.lineWidth = radius * 0.12;
            ctx.beginPath();
            ctx.arc(-radius * 0.32, -radius * 0.32, radius * 0.95, 0.22 * Math.PI, 0.48 * Math.PI);
            ctx.stroke();

            ctx.strokeStyle = '#3F6212';
            ctx.lineWidth = radius * 0.35;
            ctx.beginPath();
            ctx.arc(-radius * 0.3, -radius * 0.3, radius * 0.95, 0.65 * Math.PI, 0.68 * Math.PI);
            ctx.stroke();
          } else if (obj.type === 'watermelon') {
            ctx.fillStyle = '#065F46';
            ctx.beginPath();
            ctx.ellipse(0, 0, radius * 1.15, radius * 0.85, 0, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = '#10B981';
            ctx.lineWidth = radius * 0.12;
            ctx.beginPath();
            ctx.ellipse(0, 0, radius * 0.9, radius * 0.6, 0, 0, Math.PI * 2);
            ctx.stroke();

            // Specular radial gloss highlight
            const gloss = ctx.createRadialGradient(-radius * 0.4, -radius * 0.3, 0, -radius * 0.4, -radius * 0.3, radius * 0.8);
            gloss.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
            gloss.addColorStop(0.4, 'rgba(255, 255, 255, 0.15)');
            gloss.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = gloss;
            ctx.beginPath();
            ctx.ellipse(0, 0, radius * 1.15, radius * 0.85, 0, 0, Math.PI * 2);
            ctx.fill();
          } else if (obj.type === 'orange') {
            ctx.fillStyle = '#F97316';
            ctx.beginPath();
            ctx.arc(0, 0, radius * 0.95, 0, Math.PI * 2);
            ctx.fill();

            // Radial highlight
            const gloss = ctx.createRadialGradient(-radius * 0.3, -radius * 0.3, 0, -radius * 0.3, -radius * 0.3, radius * 0.7);
            gloss.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
            gloss.addColorStop(0.4, 'rgba(255, 255, 255, 0.2)');
            gloss.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = gloss;
            ctx.beginPath();
            ctx.arc(0, 0, radius * 0.95, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#C2410C';
            for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
              const rx = Math.cos(a) * radius * 0.45;
              const ry = Math.sin(a) * radius * 0.45;
              ctx.beginPath();
              ctx.arc(rx, ry, radius * 0.08, 0, Math.PI * 2);
              ctx.fill();
            }
          } else if (obj.type === 'coconut') {
            ctx.fillStyle = '#78350F';
            ctx.beginPath();
            ctx.arc(0, 0, radius * 0.95, 0, Math.PI * 2);
            ctx.fill();

            // Specular radial gloss highlight
            const gloss = ctx.createRadialGradient(-radius * 0.3, -radius * 0.3, 0, -radius * 0.3, -radius * 0.3, radius * 0.7);
            gloss.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
            gloss.addColorStop(0.4, 'rgba(255, 255, 255, 0.15)');
            gloss.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = gloss;
            ctx.beginPath();
            ctx.arc(0, 0, radius * 0.95, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#451A03';
            ctx.lineWidth = radius * 0.08;
            ctx.beginPath();
            ctx.moveTo(-radius * 0.5, -radius * 0.2);
            ctx.lineTo(-radius * 0.3, radius * 0.4);
            ctx.moveTo(radius * 0.4, -radius * 0.4);
            ctx.lineTo(radius * 0.2, radius * 0.3);
            ctx.stroke();
          }
        }
        ctx.restore();
      });

      // Update and draw golden slice cut lines
      sliceLines.current = sliceLines.current.filter((line) => {
        const age = Date.now() - line.createdAt;
        line.alpha = Math.max(0, 1 - age / 400); // fade out over 400ms

        if (line.alpha <= 0) return false;

        ctx.save();
        ctx.globalAlpha = line.alpha;
        ctx.strokeStyle = '#FFE259';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#FFA751';
        ctx.lineWidth = 4 * line.alpha;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(line.x1, line.y1);
        ctx.lineTo(line.x2, line.y2);
        ctx.stroke();
        
        // Inner white core
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5 * line.alpha;
        ctx.stroke();
        
        ctx.restore();
        return true;
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
      if (handPosition && (gameState === 'playing' || gameState === 'countdown')) {
        const hx = (handPosition.x / 100) * w;
        const hy = (handPosition.y / 100) * h;
        const isUsingGesture = detectedGesture && detectedGesture !== 'none';
        const color = getGestureColor(detectedGesture);

        ctx.save();

        if (isUsingGesture) {
          // Draw a stylized golden blade tip pointing along the direction of motion
          let angle = 0;
          if (trail.current.length > 1) {
            const p1 = trail.current[trail.current.length - 2];
            const p2 = trail.current[trail.current.length - 1];
            angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
          }
          
          ctx.translate(hx, hy);
          ctx.rotate(angle);

          ctx.shadowBlur = 18;
          ctx.shadowColor = '#FFD700';

          // Outer sword blade shape
          const grad = ctx.createLinearGradient(0, -6, 25, 6);
          grad.addColorStop(0, '#FFE259');
          grad.addColorStop(1, '#FFA751');
          ctx.fillStyle = grad;

          ctx.beginPath();
          ctx.moveTo(0, -5);     // Base bottom
          ctx.lineTo(15, -4);    // Middle bottom
          ctx.lineTo(25, 0);     // Tip point
          ctx.lineTo(15, 4);     // Middle top
          ctx.lineTo(0, 5);      // Base top
          ctx.closePath();
          ctx.fill();

          // Inner white glowing core line
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(20, 0);
          ctx.stroke();

          // Floating gesture emoji
          let emoji = '';
          if (detectedGesture === 'palm') emoji = '👋';
          else if (detectedGesture === 'fist') emoji = '✊';
          else if (detectedGesture === 'pinch') emoji = '🤏';
          else if (detectedGesture === 'peace') emoji = '✌️';
          else if (detectedGesture === 'pointing') emoji = '👆';
          else if (detectedGesture === 'swipe_left') emoji = '👈';
          else if (detectedGesture === 'swipe_right') emoji = '👉';

          if (emoji) {
            ctx.rotate(-angle); // unrotate for text drawing so text is upright
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 13px Outfit, sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.shadowBlur = 6;
            ctx.shadowColor = '#FFD700';
            ctx.fillText(emoji, 25, -12);
          }
        } else {
          ctx.translate(hx, hy);
          
          // Pulse scale
          const scaleVal = 1 + Math.sin(time * 0.01) * 0.08;
          ctx.scale(scaleVal, scaleVal);

          // Outer halo matching gesture color (cyan/blue)
          ctx.beginPath();
          ctx.arc(0, 0, 14, 0, Math.PI * 2);
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Inner glowing core
          ctx.beginPath();
          ctx.arc(0, 0, 6, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.shadowBlur = 12;
          ctx.shadowColor = color;
          ctx.fill();
        }

        ctx.restore();
      }

      ctx.restore(); // Restore translations

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [activeObjects, slicedHalves, gameState, handPosition, tickGame, detectedGesture, screenShake, combo]);

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
