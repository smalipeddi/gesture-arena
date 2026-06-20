import type { GestureType } from '../types';

interface Point3D {
  x: number;
  y: number;
  z: number;
}

// Distance helper
const dist3D = (p1: Point3D, p2: Point3D): number => {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y, p1.z - p2.z);
};

// Check if a finger is extended by comparing the distance between its Tip and MCP vs PIP and MCP
const isFingerExtended = (
  landmarks: Point3D[],
  tipIdx: number,
  pipIdx: number,
  mcpIdx: number
): boolean => {
  const distTipMCP = dist3D(landmarks[tipIdx], landmarks[mcpIdx]);
  const distPipMCP = dist3D(landmarks[pipIdx], landmarks[mcpIdx]);
  // If the tip is significantly further from the MCP than the PIP is, the finger is extended
  return distTipMCP > distPipMCP * 1.20;
};

// Check if the thumb is extended
const isThumbExtended = (landmarks: Point3D[], handSize: number): boolean => {
  // Distance from thumb tip (4) to index finger MCP (5)
  const distThumbIndexMCP = dist3D(landmarks[4], landmarks[5]);
  // Distance from thumb tip (4) to thumb MCP (2)
  const distThumbTipMCP = dist3D(landmarks[4], landmarks[2]);
  const distThumbIPMCP = dist3D(landmarks[3], landmarks[2]);

  // Thumb is extended if it's pointing out (tip is far from index MCP)
  // or if the thumb joint itself is extended straight
  return distThumbIndexMCP > handSize * 0.45 || distThumbTipMCP > distThumbIPMCP * 1.15;
};

// Historical tracking for swipes and holds
interface PositionRecord {
  x: number;
  y: number;
  time: number;
}

class GestureEngine {
  private posHistory: PositionRecord[] = [];
  private lastSwipeTime = 0;
  private swipeCooldown = 600; // ms
  private holdStartTime = 0;
  private lastGesture: GestureType = 'none';
  private holdPositionStart: { x: number; y: number } | null = null;

  public detectGesture(
    landmarks: Point3D[]
  ): { gesture: GestureType; isHolding: boolean; holdDuration: number } {
    if (!landmarks || landmarks.length < 21) {
      this.resetHoldState();
      return { gesture: 'none', isHolding: false, holdDuration: 0 };
    }

    const now = Date.now();
    
    // Hand size baseline: wrist (0) to middle finger MCP (9)
    const handSize = dist3D(landmarks[0], landmarks[9]);
    const wrist = landmarks[0];

    // 1. Record position for swipe detection
    this.posHistory.push({ x: wrist.x, y: wrist.y, time: now });
    // Keep history only for the last 350ms
    this.posHistory = this.posHistory.filter((p) => now - p.time < 350);

    // 2. Detect finger extension states
    const indexExtended = isFingerExtended(landmarks, 8, 6, 5);
    const middleExtended = isFingerExtended(landmarks, 12, 10, 9);
    const ringExtended = isFingerExtended(landmarks, 16, 14, 13);
    const pinkyExtended = isFingerExtended(landmarks, 20, 18, 17);
    const thumbExtended = isThumbExtended(landmarks, handSize);

    // 3. Classify static gestures
    let detectedGesture: GestureType = 'none';

    // Fist: All main fingers closed, thumb folded
    const allFingersClosed = !indexExtended && !middleExtended && !ringExtended && !pinkyExtended;
    
    // Pinch: Thumb tip (4) and Index tip (8) are extremely close, other fingers are mostly up
    const distThumbIndexTip = dist3D(landmarks[4], landmarks[8]);
    const isPinching = distThumbIndexTip < handSize * 0.16 && !allFingersClosed;

    if (allFingersClosed) {
      detectedGesture = 'fist';
    } else if (isPinching) {
      detectedGesture = 'pinch';
    } else if (indexExtended && middleExtended && ringExtended && pinkyExtended) {
      detectedGesture = 'palm';
    } else if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
      // Peace Sign: Index and Middle extended, Ring and Pinky folded
      detectedGesture = 'peace';
    } else if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      // Pointing: Only Index extended
      detectedGesture = 'pointing';
    }

    // 4. Check for dynamic Swipes (Swipe Left / Swipe Right)
    // Only detect swipe if cooldown is over
    if (now - this.lastSwipeTime > this.swipeCooldown && this.posHistory.length > 5) {
      const oldest = this.posHistory[0];
      const newest = this.posHistory[this.posHistory.length - 1];
      const dx = newest.x - oldest.x; // positive means moving right
      const dy = newest.y - oldest.y;
      
      const swipeDistanceThreshold = 0.18; // normalized coordinates width displacement
      const maxVerticalVariance = 0.12;

      // Ensure it is mostly horizontal motion
      if (Math.abs(dy) < maxVerticalVariance) {
        if (dx < -swipeDistanceThreshold) {
          detectedGesture = 'swipe_left';
          this.lastSwipeTime = now;
          this.resetHoldState();
          return { gesture: 'swipe_left', isHolding: false, holdDuration: 0 };
        } else if (dx > swipeDistanceThreshold) {
          detectedGesture = 'swipe_right';
          this.lastSwipeTime = now;
          this.resetHoldState();
          return { gesture: 'swipe_right', isHolding: false, holdDuration: 0 };
        }
      }
    }

    // 5. Check for "Hold Position" (maintain a gesture for 1 second)
    let isHolding = false;
    let holdDuration = 0;

    if (detectedGesture !== 'none') {
      if (detectedGesture === this.lastGesture) {
        // Still doing the same gesture. Check if hand is physically stable
        if (this.holdPositionStart && this.holdStartTime > 0) {
          const distFromStart = Math.hypot(wrist.x - this.holdPositionStart.x, wrist.y - this.holdPositionStart.y);
          
          // hand must stay in a stable circular zone (within 4% displacement)
          if (distFromStart < 0.05) {
            holdDuration = now - this.holdStartTime;
            if (holdDuration >= 1000) {
              isHolding = true;
            }
          } else {
            // Hand moved too much, reset hold position start but keep gesture
            this.holdPositionStart = { x: wrist.x, y: wrist.y };
            this.holdStartTime = now;
          }
        } else {
          this.holdPositionStart = { x: wrist.x, y: wrist.y };
          this.holdStartTime = now;
        }
      } else {
        // Gesture changed, reset hold timers
        this.lastGesture = detectedGesture;
        this.holdPositionStart = { x: wrist.x, y: wrist.y };
        this.holdStartTime = now;
      }
    } else {
      this.resetHoldState();
    }

    return {
      gesture: isHolding ? 'hold' : detectedGesture,
      isHolding,
      holdDuration
    };
  }

  private resetHoldState() {
    this.holdStartTime = 0;
    this.lastGesture = 'none';
    this.holdPositionStart = null;
  }
}

export const gestureEngine = new GestureEngine();
export default gestureEngine;
