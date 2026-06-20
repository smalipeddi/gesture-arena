import { create } from 'zustand';
import type { TargetObject, DifficultyLevel, GameSettings, Achievement, GestureType, TargetShape } from '../types';
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
  trackingConfidence: number;
  fps: number;
  cameraActive: boolean;
  cameraError: string | null;

  // Active Objects
  activeObjects: TargetObject[];
  
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
  
  // Settings Actions
  updateSettings: (settings: Partial<GameSettings>) => void;
  
  // Game Loop Actions
  spawnObject: () => void;
  tickGame: (dt: number) => void;
  processGestureInput: (gesture: GestureType) => void;
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
  easy: { spawnRate: 3000, duration: 6000, maxObjects: 3, speed: 0.05, multiplier: 1 },
  medium: { spawnRate: 2200, duration: 5000, maxObjects: 4, speed: 0.09, multiplier: 1.5 },
  hard: { spawnRate: 1600, duration: 4000, maxObjects: 5, speed: 0.14, multiplier: 2 },
  expert: { spawnRate: 1100, duration: 3000, maxObjects: 6, speed: 0.20, multiplier: 3 },
  insane: { spawnRate: 800, duration: 2200, maxObjects: 8, speed: 0.28, multiplier: 5 }
};

const OBJECT_TYPES: { type: TargetShape; gesture: GestureType; color: string; glow: string; label: string }[] = [
  { type: 'orb', gesture: 'palm', color: '#3B82F6', glow: 'rgba(59, 130, 246, 0.4)', label: 'Open Palm' },
  { type: 'cube', gesture: 'fist', color: '#EF4444', glow: 'rgba(239, 68, 68, 0.4)', label: 'Fist' },
  { type: 'diamond', gesture: 'pinch', color: '#F59E0B', glow: 'rgba(245, 158, 11, 0.4)', label: 'Pinch' },
  { type: 'triangle', gesture: 'peace', color: '#10B981', glow: 'rgba(16, 185, 129, 0.4)', label: 'Peace Sign' },
  { type: 'star', gesture: 'pointing', color: '#8B5CF6', glow: 'rgba(139, 92, 246, 0.4)', label: 'Pointing' },
  { type: 'wave', gesture: 'swipe_left', color: '#F97316', glow: 'rgba(249, 115, 22, 0.4)', label: 'Swipe Left' },
  { type: 'arrow', gesture: 'swipe_right', color: '#06B6D4', glow: 'rgba(6, 182, 212, 0.4)', label: 'Swipe Right' }
];

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
    trackingConfidence: 0,
    fps: 0,
    cameraActive: false,
    cameraError: null,
    activeObjects: [],
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

      const countInterval = setInterval(() => {
        const currentCount = get().countdown;
        if (currentCount > 1) {
          set({ countdown: currentCount - 1 });
          audioManager.playClick();
        } else {
          clearInterval(countInterval);
          get().startGame();
        }
      }, 1000);
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
      const prevGesture = get().detectedGesture;
      set({ detectedGesture: gesture });
      
      // If gesture changed, check input
      if (gesture !== 'none' && gesture !== prevGesture && get().gameState === 'playing') {
        get().processGestureInput(gesture);
      }
    },

    setHandPosition: (pos) => set({ handPosition: pos }),
    setTrackingConfidence: (conf) => set({ trackingConfidence: conf }),
    setFPS: (fps) => set({ fps }),
    setCameraStatus: (active, error) => set({ cameraActive: active, cameraError: error }),

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

      // Randomly pick an object template
      const template = OBJECT_TYPES[Math.floor(Math.random() * OBJECT_TYPES.length)];
      
      // Spawn locations: spawn from borders
      const border = Math.floor(Math.random() * 4); // 0: Top, 1: Right, 2: Bottom, 3: Left
      let x = 50;
      let y = 50;
      let vx = (Math.random() - 0.5) * diffConfig.speed * 2;
      let vy = (Math.random() - 0.5) * diffConfig.speed * 2;

      const padding = 15;
      if (border === 0) {
        // Top
        x = padding + Math.random() * (100 - 2 * padding);
        y = 5;
        vy = Math.abs(vy); // move down
      } else if (border === 1) {
        // Right
        x = 95;
        y = padding + Math.random() * (100 - 2 * padding);
        vx = -Math.abs(vx); // move left
      } else if (border === 2) {
        // Bottom
        x = padding + Math.random() * (100 - 2 * padding);
        y = 95;
        vy = -Math.abs(vy); // move up
      } else {
        // Left
        x = 5;
        y = padding + Math.random() * (100 - 2 * padding);
        vx = Math.abs(vx); // move right
      }

      // Special movement behavior for higher difficulties
      if (difficulty === 'expert' || difficulty === 'insane') {
        // give it a bit higher speed or slight curves
        vx *= 1.3;
        vy *= 1.3;
      }

      const newObj: TargetObject = {
        id: Math.random().toString(36).substring(2, 9),
        type: template.type,
        requiredGesture: template.gesture,
        x,
        y,
        vx,
        vy,
        radius: 8 + Math.random() * 4, // size 8 to 12
        color: template.color,
        glowColor: template.glow,
        label: template.label,
        createdAt: Date.now(),
        duration: diffConfig.duration,
        opacity: 0,
        isHit: false,
        isMissed: false,
        scale: 0.1 // animation scale up on entry
      };

      set((state) => ({
        activeObjects: [...state.activeObjects, newObj]
      }));
    },

    tickGame: (dt) => {
      const { gameState, activeObjects, difficulty, difficultyTimer, timeElapsed } = get();
      if (gameState !== 'playing') return;

      const now = Date.now();
      const nextTimeElapsed = timeElapsed + dt;
      const nextDifficultyTimer = difficultyTimer + dt;

      // Handle difficulty scaling (every 30 seconds = 30000ms)
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

      // Update positions and durations of active targets
      const updatedObjects: TargetObject[] = [];
      let livesDeducted = 0;

      activeObjects.forEach((obj) => {
        // Calculate age
        const age = now - obj.createdAt;
        
        if (age >= obj.duration) {
          // Missed object!
          if (!obj.isHit && !obj.isMissed) {
            livesDeducted++;
            obj.isMissed = true;
          }
        } else {
          // Physics update
          obj.x += obj.vx * (dt / 16.67); // normalize to 60fps frame time
          obj.y += obj.vy * (dt / 16.67);

          // Fade in and scale up
          if (obj.opacity < 1) obj.opacity = Math.min(1, obj.opacity + 0.1);
          if (obj.scale < 1) obj.scale = Math.min(1, obj.scale + 0.15);

          // Bounce off boundaries
          const r = obj.radius / 2;
          if (obj.x - r < 0 || obj.x + r > 100) {
            obj.vx = -obj.vx;
            obj.x = Math.max(r, Math.min(100 - r, obj.x));
          }
          if (obj.y - r < 0 || obj.y + r > 100) {
            obj.vy = -obj.vy;
            obj.y = Math.max(r, Math.min(100 - r, obj.y));
          }

          updatedObjects.push(obj);
        }
      });

      // Handle lives deductions
      let nextLives = get().lives - livesDeducted;
      if (livesDeducted > 0) {
        audioManager.playFailure();
        set({ combo: 0 }); // reset combo on miss
      }

      if (nextLives <= 0) {
        nextLives = 0;
        set({ lives: 0, activeObjects: updatedObjects });
        get().endGame();
        return;
      }

      // Check if we should spawn a new object
      const diffConfig = DIFFICULTY_STAGES[nextDifficulty];
      
      // Auto spawn check based on rate
      const lastSpawned = activeObjects.length > 0 
        ? Math.max(...activeObjects.map(o => o.createdAt))
        : 0;
      
      const shouldSpawn = now - lastSpawned >= diffConfig.spawnRate && activeObjects.length < diffConfig.maxObjects;

      set({
        lives: nextLives,
        difficulty: nextDifficulty,
        difficultyTimer: nextDifficultyTimer >= 30000 ? 0 : nextDifficultyTimer,
        timeElapsed: nextTimeElapsed,
        activeObjects: updatedObjects
      });

      if (shouldSpawn) {
        get().spawnObject();
      }
    },

    processGestureInput: (gesture) => {
      const { gameState, activeObjects, difficulty, combo, score, handPosition } = get();
      if (gameState !== 'playing' || gesture === 'none') return;

      const diffConfig = DIFFICULTY_STAGES[difficulty];

      // Find if this gesture matches any active object on screen.
      // To make it skill-based, we prioritize:
      // 1. If handPosition is available, we check if hand cursor is overlapping/hovering an object requiring this gesture.
      // 2. If no hover, we match the OLDEST active object that matches this gesture (global hit).
      // Let's implement both but give priority to objects closer to the hand cursor if hand is active.

      let targetObj: TargetObject | null = null;
      let matchedIndex = -1;

      if (handPosition) {
        // Find if we are hovering over an object that requires this gesture
        for (let i = 0; i < activeObjects.length; i++) {
          const obj = activeObjects[i];
          if (obj.isHit || obj.isMissed) continue;
          
          // distance in normalized canvas percentage
          const dist = Math.hypot(obj.x - handPosition.x, obj.y - handPosition.y);
          // hover range: object radius + padding (e.g. 12% of screen width)
          if (dist < obj.radius + 10 && obj.requiredGesture === gesture) {
            targetObj = obj;
            matchedIndex = i;
            break;
          }
        }
      }

      // If no hovered match found, look for the oldest matching object globally
      if (matchedIndex === -1) {
        for (let i = 0; i < activeObjects.length; i++) {
          const obj = activeObjects[i];
          if (!obj.isHit && !obj.isMissed && obj.requiredGesture === gesture) {
            targetObj = obj;
            matchedIndex = i;
            break;
          }
        }
      }

      if (targetObj && matchedIndex !== -1) {
        // CORRECT GESTURE HIT!
        audioManager.playSuccess();
        
        const nextCombo = combo + 1;
        const nextMaxCombo = Math.max(get().maxCombo, nextCombo);
        
        // Dynamic scoring: +10 base * difficulty multiplier * combo multiplier
        const comboMultiplier = 1 + Math.floor(nextCombo / 5) * 0.5; // +50% every 5 combo
        const pointsGained = Math.round(10 * diffConfig.multiplier * comboMultiplier);
        const nextScore = score + pointsGained;

        // Mark object as hit
        const updatedObjects = [...activeObjects];
        updatedObjects[matchedIndex] = {
          ...targetObj,
          isHit: true
        };

        set({
          score: nextScore,
          combo: nextCombo,
          maxCombo: nextMaxCombo,
          activeObjects: updatedObjects
        });

        // Trigger combo chime on milestones (every 5 combo)
        if (nextCombo > 0 && nextCombo % 5 === 0) {
          audioManager.playCombo();
        }

        // Check Achievements
        get().unlockAchievement('first_hit');
        if (nextCombo >= 10) get().unlockAchievement('combo_10');
        if (nextCombo >= 25) get().unlockAchievement('combo_25');
        if (nextScore >= 500) get().unlockAchievement('score_500');
        if (nextScore >= 1000) get().unlockAchievement('score_1000');
        if (nextCombo >= 50) get().unlockAchievement('perfect_50');

      } else {
        // WRONG GESTURE INPUT (the user performed a gesture that does not match any active targets)
        // We only penalize if there are targets on screen to avoid frustrating the user when they just stretch their hand.
        if (activeObjects.some(obj => !obj.isHit && !obj.isMissed)) {
          audioManager.playFailure();
          set((state) => ({
            score: Math.max(0, state.score - 5),
            combo: 0 // reset combo
          }));
        }
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
