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

export type TargetShape =
  | 'orb'
  | 'cube'
  | 'diamond'
  | 'triangle'
  | 'star'
  | 'wave'
  | 'arrow';

export interface TargetObject {
  id: string;
  type: TargetShape;
  requiredGesture: GestureType;
  x: number; // 0 to 100 (relative canvas width)
  y: number; // 0 to 100 (relative canvas height)
  vx: number; // velocity x
  vy: number; // velocity y
  radius: number;
  color: string;
  glowColor: string;
  label: string;
  createdAt: number;
  duration: number; // time limit in ms
  opacity: number;
  isHit: boolean;
  isMissed: boolean;
  scale: number;
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
