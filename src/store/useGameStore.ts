import { create } from 'zustand';
import type { TargetObject, DifficultyLevel, GameSettings, Achievement, GestureType, FruitType, SlicedHalf } from '../types';
import audioManager from '../audio/audioManager';

interface GameState {
  // Screens & Game States
  activePage: 'landing' | 'how-to-play' | 'settings' | 'playing';
  gameState: 'idle' | 'countdown' | 'playing' | 'paused' | 'gameover';
  countdown: number;
  
  // Game Stats
  score: number;
  highScore: number;
  lives: number;
  combo: number;
  maxCombo: number;
  difficulty: DifficultyLevel;
  difficultyTimer: number; // in ms
  timeElapsed: number; // in ms
  
  // Hand Tracking Status
  detectedGesture: GestureType;
  gestureHoldTimer: number; // tracks how long a gesture is held
  handPosition: { x: number; y: number } | null;
  lastHandPosition: { x: number; y: number } | null;
  trackingConfidence: number;
  fps: number;
  cameraActive: boolean;
  cameraError: string | null;
  trackerReady: boolean;

  // Active Objects
  activeObjects: TargetObject[];
  slicedHalves: SlicedHalf[];
  
  // Settings
  settings: GameSettings;
  
  // Achievements
  achievements: Achievement[];
  recentUnlockedAchievement: Achievement | null;

  // Actions
  setActivePage: (page: 'landing' | 'how-to-play' | 'settings' | 'playing') => void;
  startGame: () => void;
  startCountdown: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  endGame: () => void;
  resetGame: () => void;
  
  // Tracking Actions
  setDetectedGesture: (gesture: GestureType) => void;
  setHandPosition: (pos: { x: number; y: number } | null) => void;
  setTrackingConfidence: (conf: number) => void;
  setFPS: (fps: number) => void;
  setCameraStatus: (active: boolean, error: string | null) => void;
  setTrackerReady: (ready: boolean) => void;
  
  // Settings Actions
  updateSettings: (settings: Partial<GameSettings>) => void;
  
  // Game Loop Actions
  spawnObject: () => void;
  tickGame: (dt: number) => void;
  checkSliceInput: (start: { x: number; y: number }, end: { x: number; y: number }) => void;
  unlockAchievement: (id: string) => void;
  
  // Feedback Actions
  clearRecentAchievement: () => void;
}

const defaultAchievements: Achievement[] = [
  { id: 'first_hit', title: 'First Contact', description: 'Hit your first target successfully', icon: '🎯', unlocked: false },
  { id: 'combo_10', title: 'Combo Master', description: 'Reach a 10x combo multiplier', icon: '🔥', unlocked: false },
  { id: 'combo_25', title: 'Gesture Legend', description: 'Reach a 25x combo multiplier', icon: '⚡', unlocked: false },
  { id: 'score_500', title: 'Arena Contender', description: 'Score 500 points', icon: '🏆', unlocked: false },
  { id: 'score_1000', title: 'Grandmaster', description: 'Score 1000 points', icon: '👑', unlocked: false },
  { id: 'survive_insane', title: 'Into the Void', description: 'Reach Insane difficulty level', icon: '🌀', unlocked: false },
  { id: 'perfect_50', title: 'Immaculate', description: 'Hit 50 targets in a row without missing', icon: '⭐', unlocked: false }
];

const DIFFICULTY_STAGES: { [key in DifficultyLevel]: { spawnRate: number; duration: number; maxObjects: number; speed: number; multiplier: number } } = {
  easy: { spawnRate: 3000, duration: 6000, maxObjects: 3, speed: 0.03, multiplier: 1 },
  medium: { spawnRate: 2200, duration: 5000, maxObjects: 4, speed: 0.05, multiplier: 1.5 },
  hard: { spawnRate: 1600, duration: 4000, maxObjects: 5, speed: 0.08, multiplier: 2 },
  expert: { spawnRate: 1100, duration: 3000, maxObjects: 6, speed: 0.11, multiplier: 3 },
  insane: { spawnRate: 800, duration: 2200, maxObjects: 8, speed: 0.15, multiplier: 5 }
};

// OBJECT_TYPES removed since Fruit Ninja draws themed fruits

export const useGameStore = create<GameState>((set, get) => {
  // Helper to load high score
  const savedHighScore = localStorage.getItem('gesture_arena_highscore');
  const initialHighScore = savedHighScore ? parseInt(savedHighScore, 10) : 0;

  // Helper to load settings
  const savedSettings = localStorage.getItem('gesture_arena_settings');
  const initialSettings: GameSettings = savedSettings
    ? JSON.parse(savedSettings)
    : {
        isMuted: false,
        volume: 0.5,
        cameraResolution: '720p',
        showSkeleton: true,
        showLandmarks: true,
        trackingConfidence: 0.5,
        gestureHoldDuration: 1000
      };

  // Helper to load achievements
  const savedAchievements = localStorage.getItem('gesture_arena_achievements');
  const initialAchievements = savedAchievements
    ? JSON.parse(savedAchievements)
    : defaultAchievements;

  // Initialize audio manager settings
  audioManager.setSettings(initialSettings.isMuted, initialSettings.volume);

  return {
    // State
    activePage: 'landing',
    gameState: 'idle',
    countdown: 3,
    score: 0,
    highScore: initialHighScore,
    lives: 3,
    combo: 0,
    maxCombo: 0,
    difficulty: 'easy',
    difficultyTimer: 0,
    timeElapsed: 0,
    detectedGesture: 'none',
    gestureHoldTimer: 0,
    handPosition: null,
    lastHandPosition: null,
    trackingConfidence: 0,
    fps: 0,
    cameraActive: false,
    cameraError: null,
    trackerReady: false,
    activeObjects: [],
    slicedHalves: [],
    settings: initialSettings,
    achievements: initialAchievements,
    recentUnlockedAchievement: null,

    // Actions
    setActivePage: (page) => {
      set({ activePage: page });
      audioManager.playClick();
      if (page === 'playing') {
        get().startCountdown();
      } else {
        set({ gameState: 'idle' });
        audioManager.stopBackgroundMusic();
      }
    },

    startCountdown: () => {
      audioManager.resume();
      set({
        gameState: 'countdown',
        countdown: 3,
        score: 0,
        lives: 3,
        combo: 0,
        difficulty: 'easy',
        difficultyTimer: 0,
        timeElapsed: 0,
        activeObjects: []
      });
    },

    startGame: () => {
      set({ gameState: 'playing' });
      audioManager.startBackgroundMusic();
      // Spawn initial object
      get().spawnObject();
    },

    pauseGame: () => {
      if (get().gameState === 'playing') {
        set({ gameState: 'paused' });
        audioManager.playClick();
        audioManager.stopBackgroundMusic();
      }
    },

    resumeGame: () => {
      if (get().gameState === 'paused') {
        set({ gameState: 'playing' });
        audioManager.playClick();
        audioManager.startBackgroundMusic();
      }
    },

    endGame: () => {
      set({ gameState: 'gameover' });
      audioManager.playGameOver();
      audioManager.stopBackgroundMusic();

      const { score, highScore } = get();
      if (score > highScore) {
        set({ highScore: score });
        localStorage.setItem('gesture_arena_highscore', score.toString());
      }
    },

    resetGame: () => {
      audioManager.playClick();
      get().startCountdown();
    },

    setDetectedGesture: (gesture) => {
      set({ detectedGesture: gesture });
    },

    setHandPosition: (pos) => {
      const lastPos = get().handPosition;
      set({ lastHandPosition: lastPos, handPosition: pos });
      
      // If hand is positioned and we are playing, check slices
      if (pos && lastPos && get().gameState === 'playing') {
        get().checkSliceInput(lastPos, pos);
      }
    },
    setTrackingConfidence: (conf) => set({ trackingConfidence: conf }),
    setFPS: (fps) => set({ fps }),
    setCameraStatus: (active, error) => set({ cameraActive: active, cameraError: error }),
    setTrackerReady: (ready) => set({ trackerReady: ready }),

    updateSettings: (newSettings) => {
      const updated = { ...get().settings, ...newSettings };
      set({ settings: updated });
      localStorage.setItem('gesture_arena_settings', JSON.stringify(updated));
      audioManager.setSettings(updated.isMuted, updated.volume);
    },

    spawnObject: () => {
      const { gameState, difficulty, activeObjects } = get();
      if (gameState !== 'playing') return;

      const diffConfig = DIFFICULTY_STAGES[difficulty];
      if (activeObjects.length >= diffConfig.maxObjects) return;

      // 1. Choose if it is a bomb
      const isBomb = Math.random() < (difficulty === 'easy' ? 0.1 : difficulty === 'medium' ? 0.15 : difficulty === 'hard' ? 0.22 : 0.28);
      
      // 2. Select Fruit/Bomb type
      let template;
      if (isBomb) {
        template = { type: 'bomb', color: '#1E1E24', glow: 'rgba(239, 68, 68, 0.4)' };
      } else {
        const fruits = [
          { type: 'apple', color: '#EF4444', glow: 'rgba(239, 68, 68, 0.4)' },
          { type: 'banana', color: '#F59E0B', glow: 'rgba(245, 158, 11, 0.4)' },
          { type: 'watermelon', color: '#10B981', glow: 'rgba(16, 185, 129, 0.4)' },
          { type: 'coconut', color: '#8B5CF6', glow: 'rgba(139, 92, 246, 0.4)' },
          { type: 'orange', color: '#F97316', glow: 'rgba(249, 115, 22, 0.4)' }
        ];
        template = fruits[Math.floor(Math.random() * fruits.length)];
      }

      // 3. Spawning from the bottom area
      const x = 15 + Math.random() * 70; // 15% to 85% width
      const y = 100; // bottom of canvas
      
      // Upward velocity (parabolic toss) - scaled down for slower motion
      const baseUpwardSpeed = diffConfig.speed * 75;
      const vy = - (baseUpwardSpeed + Math.random() * 1.5);
      
      // Sideways velocity to create an arc - scaled down
      const targetCenterDir = x < 50 ? 1 : -1;
      const vx = targetCenterDir * (0.3 + Math.random() * 0.9);

      const newObj: TargetObject = {
        id: Math.random().toString(36).substring(2, 9),
        type: template.type as any,
        x,
        y,
        vx,
        vy,
        // Substantially larger radii (Apple/Orange/Coconut = 11.0, Watermelon = 14.0)
        radius: template.type === 'watermelon' ? 14.0 : template.type === 'banana' ? 12.0 : 11.0,
        color: template.color,
        glowColor: template.glow,
        createdAt: Date.now(),
        duration: 4500,
        opacity: 0,
        isHit: false,
        isMissed: false,
        scale: 0.1,
        isBomb,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.05
      };

      set((state) => ({
        activeObjects: [...state.activeObjects, newObj]
      }));
    },

    tickGame: (dt) => {
      const { gameState, activeObjects, slicedHalves, difficulty, difficultyTimer, timeElapsed } = get();
      if (gameState !== 'playing') return;

      const now = Date.now();
      const nextTimeElapsed = timeElapsed + dt;
      const nextDifficultyTimer = difficultyTimer + dt;

      // Handle difficulty scaling (every 30 seconds)
      let nextDifficulty = difficulty;
      if (nextDifficultyTimer >= 30000) {
        const difficulties: DifficultyLevel[] = ['easy', 'medium', 'hard', 'expert', 'insane'];
        const currentIndex = difficulties.indexOf(difficulty);
        if (currentIndex < difficulties.length - 1) {
          nextDifficulty = difficulties[currentIndex + 1];
          audioManager.playCombo(); // play chime on level up
          
          if (nextDifficulty === 'insane') {
            get().unlockAchievement('survive_insane');
          }
        }
      }

      const diffConfig = DIFFICULTY_STAGES[nextDifficulty];
      const gravity = 0.08; // Gravity constant in normalized coordinates

      // Update positions of active targets
      const updatedObjects: TargetObject[] = [];
      let livesDeducted = 0;
      let missedFruit = false;

      activeObjects.forEach((obj) => {
        if (obj.isHit) {
          // If already sliced, remove from active list
          return;
        }

        // Apply Gravity
        obj.vy += gravity * (dt / 16.67);
        
        // Update Position
        obj.x += obj.vx * (dt / 16.67);
        obj.y += obj.vy * (dt / 16.67);

        // Spin
        obj.rotation += obj.rotationSpeed * (dt / 16.67);

        // Fade in and scale up on spawn
        if (obj.opacity < 1) obj.opacity = Math.min(1, obj.opacity + 0.1);
        if (obj.scale < 1) obj.scale = Math.min(1, obj.scale + 0.15);

        // Check if fell below the bottom of the screen
        if (obj.y > 105 && obj.vy > 0) {
          // Missed object!
          if (!obj.isBomb) {
            livesDeducted++;
            missedFruit = true;
          }
          obj.isMissed = true;
        } else {
          updatedObjects.push(obj);
        }
      });

      // Update positions of sliced halves
      const updatedHalves: SlicedHalf[] = [];
      slicedHalves.forEach((half) => {
        // Apply Gravity
        half.vy += gravity * (dt / 16.67);
        
        // Update Position
        half.x += half.vx * (dt / 16.67);
        half.y += half.vy * (dt / 16.67);

        // Spin
        half.rotation += half.rotationSpeed * (dt / 16.67);

        // Slow fade out
        half.opacity = Math.max(0, half.opacity - 0.02 * (dt / 16.67));

        if (half.y < 110 && half.opacity > 0) {
          updatedHalves.push(half);
        }
      });

      // Handle lives deductions
      let nextLives = get().lives - livesDeducted;
      if (missedFruit) {
        audioManager.playFailure();
        set({ combo: 0 }); // reset combo on miss
      }

      if (nextLives <= 0) {
        nextLives = 0;
        set({ lives: 0, activeObjects: updatedObjects, slicedHalves: updatedHalves });
        get().endGame();
        return;
      }

      // Check if we should spawn a new object
      const lastSpawned = activeObjects.length > 0 
        ? Math.max(...activeObjects.map(o => o.createdAt))
        : 0;
      
      const shouldSpawn = now - lastSpawned >= diffConfig.spawnRate && activeObjects.length < diffConfig.maxObjects;

      set({
        lives: nextLives,
        difficulty: nextDifficulty,
        difficultyTimer: nextDifficultyTimer >= 30000 ? 0 : nextDifficultyTimer,
        timeElapsed: nextTimeElapsed,
        activeObjects: updatedObjects,
        slicedHalves: updatedHalves
      });

      if (shouldSpawn) {
        get().spawnObject();
      }
    },

    checkSliceInput: (start, end) => {
      const { activeObjects, difficulty, combo, score, gameState, detectedGesture } = get();
      if (gameState !== 'playing') return;

      const diffConfig = DIFFICULTY_STAGES[difficulty];
      
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const swipeDistance = Math.hypot(dx, dy);

      // Play a swoosh sound if the swipe is fast enough
      if (swipeDistance > 2.5) {
        audioManager.playSlash();
      }

      let hitOccurred = false;
      const updatedObjects = [...activeObjects];
      const newHalves: SlicedHalf[] = [];
      let nextCombo = combo;
      let nextScore = score;
      let bombHit = false;

      // Distance helper for line segment intersection with circle
      const distToSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
        const l2 = Math.hypot(x2 - x1, y2 - y1);
        if (l2 === 0) return Math.hypot(px - x1, py - y1);
        let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / (l2 * l2);
        t = Math.max(0, Math.min(1, t));
        return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
      };

      for (let i = 0; i < updatedObjects.length; i++) {
        const obj = updatedObjects[i];
        if (obj.isHit || obj.isMissed) continue;

        // Check intersection
        const dist = distToSegment(obj.x, obj.y, start.x, start.y, end.x, end.y);
        
        if (dist < obj.radius + 2.0) {
          if (obj.isBomb) {
            hitOccurred = true;
            bombHit = true;
            obj.isHit = true;
            break;
          }

          // Gesture matching criteria
          let requiredGesture = 'none';
          if (obj.type === 'apple') requiredGesture = 'fist';
          else if (obj.type === 'banana') requiredGesture = 'peace';
          else if (obj.type === 'watermelon') requiredGesture = 'palm';
          else if (obj.type === 'coconut') requiredGesture = 'pinch';
          else if (obj.type === 'orange') requiredGesture = 'pointing';

          if (detectedGesture === requiredGesture) {
            hitOccurred = true;
            obj.isHit = true;
            nextCombo += 1;
            
            const comboMultiplier = 1 + Math.floor(nextCombo / 3) * 0.3; // +30% every 3 combo
            const pointsGained = Math.round(10 * diffConfig.multiplier * comboMultiplier);
            nextScore += pointsGained;

            // Spawn split halves flying apart
            const angle = Math.atan2(dy, dx) + Math.PI / 2;
            const halfSpeed = 1.8 + Math.random() * 1.0;
            const hx = Math.cos(angle) * halfSpeed;
            const hy = Math.sin(angle) * halfSpeed;

            const baseHalf = {
              type: obj.type as any,
              x: obj.x,
              y: obj.y,
              opacity: 1.0,
              color: obj.color,
              createdAt: Date.now()
            };

            newHalves.push(
              {
                ...baseHalf,
                id: Math.random().toString(),
                vx: obj.vx - hx,
                vy: obj.vy - Math.abs(hy) - 1.0,
                rotation: Math.random() * Math.PI,
                rotationSpeed: -0.15 - Math.random() * 0.15,
                side: 'left'
              },
              {
                ...baseHalf,
                id: Math.random().toString(),
                vx: obj.vx + hx,
                vy: obj.vy - Math.abs(hy) - 1.0,
                rotation: Math.random() * Math.PI + Math.PI,
                rotationSpeed: 0.15 + Math.random() * 0.15,
                side: 'right'
              }
            );
          } else {
            // Deflection pop sound if swiped with wrong gesture
            audioManager.playClick();
          }
        }
      }

      if (bombHit) {
        audioManager.playExplosion();
        let nextLives = get().lives - 1;
        set({
          combo: 0,
          lives: Math.max(0, nextLives)
        });

        if (nextLives <= 0) {
          get().endGame();
        }
      } else if (hitOccurred) {
        audioManager.playSplat();
        
        get().unlockAchievement('first_hit');
        if (nextCombo >= 10) get().unlockAchievement('combo_10');
        if (nextCombo >= 25) get().unlockAchievement('combo_25');
        if (nextScore >= 500) get().unlockAchievement('score_500');
        if (nextScore >= 1000) get().unlockAchievement('score_1000');
        if (nextCombo >= 50) get().unlockAchievement('perfect_50');

        set((state) => ({
          score: nextScore,
          combo: nextCombo,
          maxCombo: Math.max(state.maxCombo, nextCombo),
          activeObjects: updatedObjects,
          slicedHalves: [...state.slicedHalves, ...newHalves]
        }));
      }
    },

    unlockAchievement: (id: string) => {
      const { achievements } = get();
      const achIndex = achievements.findIndex((a) => a.id === id);
      if (achIndex !== -1 && !achievements[achIndex].unlocked) {
        const updated = [...achievements];
        updated[achIndex] = {
          ...updated[achIndex],
          unlocked: true,
          unlockedAt: Date.now()
        };

        set({
          achievements: updated,
          recentUnlockedAchievement: updated[achIndex]
        });

        localStorage.setItem('gesture_arena_achievements', JSON.stringify(updated));
        audioManager.playCombo(); // play combo sound on achievement unlock
      }
    },

    clearRecentAchievement: () => {
      set({ recentUnlockedAchievement: null });
    }
  };
});
