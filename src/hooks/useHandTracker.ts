import { useEffect, useRef, useState, useCallback } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { useGameStore } from '../store/useGameStore';
import { HandLandmarkStabilizer } from '../utils/landmarkStabilizer';
import { gestureEngine } from '../utils/gestureRecognizer';

// Singleton instance to prevent multiple WebAssembly loads across hot reloads or route switches
let globalLandmarker: HandLandmarker | null = null;
let isLoadingGlobal = false;

// MediaPipe hand connection pairs for rendering the skeleton lines
const HAND_CONNECTIONS = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle
  [0, 9], [9, 10], [10, 11], [11, 12],
  // Ring
  [0, 13], [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm connections (MCPs)
  [5, 9], [9, 13], [13, 17]
];

export const useHandTracker = (
  videoElement: HTMLVideoElement | null,
  canvasElement: HTMLCanvasElement | null
) => {
  const [isInitializing, setIsInitializing] = useState(false);
  const [trackerReady, setTrackerReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const animationFrameId = useRef<number | null>(null);
  const stabilizer = useRef(new HandLandmarkStabilizer());
  const lastFrameTime = useRef<number>(0);
  const fpsBuffer = useRef<number[]>([]);

  // Zustand Store bindings
  const setDetectedGesture = useGameStore((state) => state.setDetectedGesture);
  const setHandPosition = useGameStore((state) => state.setHandPosition);
  const setTrackingConfidence = useGameStore((state) => state.setTrackingConfidence);
  const setFPS = useGameStore((state) => state.setFPS);
  const setCameraStatus = useGameStore((state) => state.setCameraStatus);
  const storeSetTrackerReady = useGameStore((state) => state.setTrackerReady);
  const showSkeleton = useGameStore((state) => state.settings.showSkeleton);
  const showLandmarks = useGameStore((state) => state.settings.showLandmarks);
  const confidenceThreshold = useGameStore((state) => state.settings.trackingConfidence);

  // Sync trackerReady status to global store
  useEffect(() => {
    storeSetTrackerReady(trackerReady);
    return () => {
      storeSetTrackerReady(false);
    };
  }, [trackerReady, storeSetTrackerReady]);

  // Initialize MediaPipe landmarker
  const initTracker = useCallback(async () => {
    if (globalLandmarker) {
      setTrackerReady(true);
      return globalLandmarker;
    }
    
    if (isLoadingGlobal) {
      // Wait until loading finishes
      return new Promise<HandLandmarker>((resolve) => {
        const check = setInterval(() => {
          if (globalLandmarker) {
            clearInterval(check);
            setTrackerReady(true);
            resolve(globalLandmarker);
          }
        }, 100);
      });
    }

    setIsInitializing(true);
    isLoadingGlobal = true;
    setError(null);

    try {
      // 1. Create FilesetResolver using jsdelivr CDN
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm'
      );

      // 2. Initialize HandLandmarker with float16 model
      const landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: confidenceThreshold,
        minHandPresenceConfidence: confidenceThreshold,
        minTrackingConfidence: confidenceThreshold
      });

      globalLandmarker = landmarker;
      setTrackerReady(true);
      setIsInitializing(false);
      isLoadingGlobal = false;
      return landmarker;
    } catch (err: any) {
      console.error('Failed to initialize MediaPipe Hand Landmarker:', err);
      setError('Failed to load gesture recognition engine.');
      setIsInitializing(false);
      isLoadingGlobal = false;
      setCameraStatus(false, 'MediaPipe initialization failed.');
      return null;
    }
  }, [confidenceThreshold, setCameraStatus]);

  // Drawing the hand skeleton on a mirrored canvas
  const drawHand = useCallback((
    ctx: CanvasRenderingContext2D,
    landmarks: { x: number; y: number; z: number }[],
    width: number,
    height: number,
    gesture: string
  ) => {
    ctx.clearRect(0, 0, width, height);

    // Get color theme based on active gesture
    let themeColor = 'rgba(59, 130, 246, 0.85)'; // default Blue
    
    if (gesture === 'fist') {
      themeColor = 'rgba(239, 68, 68, 0.85)'; // Red
    } else if (gesture === 'pinch') {
      themeColor = 'rgba(245, 158, 11, 0.85)'; // Amber
    } else if (gesture === 'peace') {
      themeColor = 'rgba(16, 185, 129, 0.85)'; // Green
    } else if (gesture === 'pointing') {
      themeColor = 'rgba(139, 92, 246, 0.85)'; // Purple
    } else if (gesture === 'swipe_left') {
      themeColor = 'rgba(249, 115, 22, 0.85)'; // Orange
    } else if (gesture === 'swipe_right') {
      themeColor = 'rgba(6, 182, 212, 0.85)'; // Cyan
    } else if (gesture === 'hold') {
      themeColor = 'rgba(236, 72, 153, 0.85)'; // Pink
    }

    // 1. Drawing the skeleton bones (Lines)
    if (showSkeleton) {
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = themeColor;
      
      // Shadow for glow
      ctx.shadowBlur = 10;
      ctx.shadowColor = themeColor;

      HAND_CONNECTIONS.forEach(([startIdx, endIdx]) => {
        const start = landmarks[startIdx];
        const end = landmarks[endIdx];

        if (start && end) {
          // Since camera is mirrored, draw coordinates mirrored (1 - x)
          const sx = (1 - start.x) * width;
          const sy = start.y * height;
          const ex = (1 - end.x) * width;
          const ey = end.y * height;

          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(ex, ey);
          ctx.stroke();
        }
      });
      ctx.shadowBlur = 0; // reset
    }

    // 2. Drawing joint landmarks (Circles)
    if (showLandmarks) {
      landmarks.forEach((lm, idx) => {
        const lx = (1 - lm.x) * width;
        const ly = lm.y * height;

        // Make fingertip landmarks slightly larger and more glowing
        const isFingertip = [4, 8, 12, 16, 20].includes(idx);
        const radius = isFingertip ? 7.5 : 4.5;

        ctx.beginPath();
        ctx.arc(lx, ly, radius, 0, 2 * Math.PI);
        ctx.fillStyle = isFingertip ? '#FFFFFF' : themeColor;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        
        ctx.shadowBlur = 8;
        ctx.shadowColor = themeColor;
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0; // reset
      });
    }

    // 3. Highlight pinch zone or wrist pointer if holding
    if (gesture === 'pinch') {
      const thumbTip = landmarks[4];
      const indexTip = landmarks[8];
      const px = (1 - (thumbTip.x + indexTip.x) / 2) * width;
      const py = ((thumbTip.y + indexTip.y) / 2) * height;

      ctx.beginPath();
      ctx.arc(px, py, 20, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.fill();
      ctx.setLineDash([]);
    }
  }, [showSkeleton, showLandmarks]);

  // Main processing loop
  const processFrame = useCallback(() => {
    if (!videoElement || !canvasElement || !globalLandmarker || videoElement.paused || videoElement.ended) {
      animationFrameId.current = requestAnimationFrame(processFrame);
      return;
    }

    const canvasCtx = canvasElement.getContext('2d');
    if (!canvasCtx) {
      animationFrameId.current = requestAnimationFrame(processFrame);
      return;
    }

    const { videoWidth, videoHeight } = videoElement;
    if (videoWidth === 0 || videoHeight === 0) {
      animationFrameId.current = requestAnimationFrame(processFrame);
      return;
    }

    // Dynamic resizing of canvas to match feed aspect ratio
    if (canvasElement.width !== videoWidth || canvasElement.height !== videoHeight) {
      canvasElement.width = videoWidth;
      canvasElement.height = videoHeight;
    }

    const now = performance.now();
    
    // FPS tracking
    if (lastFrameTime.current > 0) {
      const fps = 1000 / (now - lastFrameTime.current);
      fpsBuffer.current.push(fps);
      if (fpsBuffer.current.length > 20) fpsBuffer.current.shift();
      const avgFps = fpsBuffer.current.reduce((a, b) => a + b, 0) / fpsBuffer.current.length;
      setFPS(Math.round(avgFps));
    }
    lastFrameTime.current = now;

    try {
      // Run MediaPipe Hand Landmarker
      const results = globalLandmarker.detectForVideo(videoElement, now);

      if (results.landmarks && results.landmarks.length > 0) {
        // Grab first hand
        const rawLandmarks = results.landmarks[0];
        
        // Stabilize raw landmarks to prevent jitter
        const stabilized = stabilizer.current.stabilize(rawLandmarks);

        // Detect current gesture
        const detection = gestureEngine.detectGesture(stabilized);

        // Update state in Zustand store
        setDetectedGesture(detection.gesture);
        setTrackingConfidence(results.handedness[0]?.[0]?.score || 0.85);

        // Track hand position (using joint 9 - Middle finger MCP - as the center cursor point)
        // Hand position coordinates are mirrored (1 - x) to match the game canvas coordinates
        const handCenter = stabilized[9];
        setHandPosition({
          x: (1 - handCenter.x) * 100, // 0 to 100 %
          y: handCenter.y * 100
        });

        // Draw skeleton overlay
        drawHand(
          canvasCtx,
          stabilized,
          canvasElement.width,
          canvasElement.height,
          detection.gesture
        );
      } else {
        // No hand detected
        setDetectedGesture('none');
        setHandPosition(null);
        setTrackingConfidence(0);
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      }
    } catch (err) {
      console.error('Error during MediaPipe inference:', err);
    }

    animationFrameId.current = requestAnimationFrame(processFrame);
  }, [videoElement, canvasElement, setFPS, setDetectedGesture, setTrackingConfidence, setHandPosition, drawHand]);

  // Mount/Unmount effect
  useEffect(() => {
    const setup = async () => {
      const tracker = await initTracker();
      if (tracker && videoElement) {
        // Start rendering loops
        lastFrameTime.current = 0;
        fpsBuffer.current = [];
        if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = requestAnimationFrame(processFrame);
      }
    };

    setup();

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [initTracker, videoElement, canvasElement, processFrame]);

  return {
    trackerReady,
    isInitializing,
    error,
    reinitialize: initTracker
  };
};

export default useHandTracker;
