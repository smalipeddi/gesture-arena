export type GestureType =
  | 'palm'
  | 'fist'
  | 'pinch'
  | 'peace'
  | 'pointing'
  | 'swipe_left'
  | 'swipe_right'
  | 'hold'
  | 'none';

export type FruitType =
  | 'apple'
  | 'banana'
  | 'watermelon'
  | 'coconut'
  | 'orange'
  | 'bomb';

export interface SlicedHalf {
  id: string;
  type: 'apple' | 'banana' | 'watermelon' | 'coconut' | 'orange';
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  side: 'left' | 'right';
  opacity: number;
  createdAt: number;
}

export interface TargetObject {
  id: string;
  type: FruitType;
  x: number; // 0 to 100 (relative canvas width)
  y: number; // 0 to 100 (relative canvas height)
  vx: number; // velocity x
  vy: number; // velocity y
  radius: number;
  color: string;
  glowColor: string;
  createdAt: number;
  duration: number; // time limit in ms
  opacity: number;
  isHit: boolean; // represents sliced state
  isMissed: boolean;
  scale: number;
  isBomb: boolean;
  rotation: number;
  rotationSpeed: number;
}

export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'expert' | 'insane';

export interface GameSettings {
  isMuted: boolean;
  volume: number; // 0 to 1
  cameraResolution: '720p' | '1080p';
  showSkeleton: boolean;
  showLandmarks: boolean;
  trackingConfidence: number; // 0.1 to 1.0
  gestureHoldDuration: number; // in ms, default 1000
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: number;
}

export interface LeaderboardEntry {
  name: string;
  score: number;
  difficulty: DifficultyLevel;
  date: string;
}
