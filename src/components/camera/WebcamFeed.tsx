import React, { useEffect } from 'react';
import { useWebcam } from '../../hooks/useWebcam';
import { useHandTracker } from '../../hooks/useHandTracker';
import { useGameStore } from '../../store/useGameStore';
import { Camera, CameraOff, Cpu, RefreshCw } from 'lucide-react';

export const WebcamFeed: React.FC = () => {
  const resolution = useGameStore((state) => state.settings.cameraResolution);
  const detectedGesture = useGameStore((state) => state.detectedGesture);
  const confidence = useGameStore((state) => state.trackingConfidence);
  const fps = useGameStore((state) => state.fps);
  const cameraActive = useGameStore((state) => state.cameraActive);
  const cameraError = useGameStore((state) => state.cameraError);
  const setCameraStatus = useGameStore((state) => state.setCameraStatus);

  const { videoRef, error: webcamError, startCamera, stopCamera } = useWebcam();
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  // Initialize hand tracker hook
  const { trackerReady, isInitializing, error: trackerError, reinitialize } = useHandTracker(
    videoRef.current,
    canvasRef.current
  );

  // Start webcam when component mounts or resolution settings change
  useEffect(() => {
    let active = true;
    
    const init = async () => {
      const mediaStream = await startCamera(resolution);
      if (active) {
        if (mediaStream) {
          setCameraStatus(true, null);
        } else {
          setCameraStatus(false, webcamError || 'Failed to access camera.');
        }
      }
    };

    init();

    return () => {
      active = false;
      stopCamera();
      setCameraStatus(false, null);
    };
  }, [resolution, startCamera, stopCamera, setCameraStatus, webcamError]);

  // Display labels for detected gestures
  const getGestureLabel = (gesture: string) => {
    switch (gesture) {
      case 'palm': return 'Open Palm';
      case 'fist': return 'Fist';
      case 'pinch': return 'Pinch';
      case 'peace': return 'Peace Sign';
      case 'pointing': return 'Pointing';
      case 'swipe_left': return 'Swipe Left';
      case 'swipe_right': return 'Swipe Right';
      case 'hold': return 'Hold Position';
      default: return 'No Hand Detected';
    }
  };

  const hasHand = detectedGesture !== 'none';
  const showErrorMessage = cameraError || trackerError;

  return (
    <div 
      className={`relative w-full aspect-video md:aspect-[4/3] xl:aspect-video rounded-2xl overflow-hidden bg-zinc-950 border transition-all duration-500 ${
        hasHand 
          ? 'border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.2)]' 
          : 'border-zinc-800 shadow-lg'
      }`}
    >
      {/* 1. Mirrored Camera Video Feed */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover scale-x-[-1] transition-transform duration-300"
        playsInline
        muted
      />

      {/* 2. Skeleton Canvas Overlay */}
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
      />

      {/* 3. Dark Overlay Gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

      {/* 4. Tracking and Camera Status Bar (Top Left) */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-xs font-medium text-white">
          <span className={`w-2 h-2 rounded-full ${cameraActive ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
          {cameraActive ? 'Camera Active' : 'Camera Off'}
          <span className="text-zinc-500">|</span>
          <span className="text-zinc-300">{resolution}</span>
        </div>

        {trackerReady && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-xs font-medium text-white">
            <Cpu className="w-3.5 h-3.5 text-blue-400" />
            <span>AI Tracking Active</span>
            <span className="text-zinc-500">|</span>
            <span className="text-zinc-300">{fps} FPS</span>
          </div>
        )}
      </div>

      {/* 5. Tracking Info Badge (Top Right) */}
      {hasHand && (
        <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-xs font-medium text-white z-10 animate-fade-in">
          <span className="text-zinc-400">Confidence:</span>
          <span className="text-blue-400 font-bold">{Math.round(confidence * 100)}%</span>
        </div>
      )}

      {/* 6. Center Prompts & Loaders */}
      {!cameraActive && !showErrorMessage && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-sm z-20">
          <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500 mb-4 animate-pulse">
            <CameraOff className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-white">Starting Webcam Feed...</p>
          <p className="text-xs text-zinc-500 mt-1">Please allow camera access if prompted</p>
        </div>
      )}

      {isInitializing && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/85 backdrop-blur-sm z-20">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-4" />
          <p className="text-sm font-semibold text-white">Loading Gesture Recognition...</p>
          <p className="text-xs text-zinc-500 mt-1">Downloading WebAssembly core (approx. 5MB)</p>
        </div>
      )}

      {showErrorMessage && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 border border-red-500/20 px-6 text-center z-20">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 text-red-500 mb-4">
            <Camera className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">Hardware Interface Error</h3>
          <p className="text-xs text-zinc-400 max-w-xs mb-4">{showErrorMessage}</p>
          <button
            onClick={() => {
              startCamera(resolution);
              reinitialize();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-white border border-zinc-800 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry Camera Connection
          </button>
        </div>
      )}

      {/* 7. Action Guide Overlay (When active but no hand) */}
      {cameraActive && trackerReady && !hasHand && !showErrorMessage && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/35 pointer-events-none">
          <div className="flex flex-col items-center p-6 rounded-2xl bg-zinc-900/75 border border-white/5 backdrop-blur-md animate-pulse">
            {/* Soft drawing of a hand */}
            <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-3">
              <span className="text-3xl">👋</span>
            </div>
            <p className="text-sm font-semibold text-white">Show your hand to begin</p>
            <p className="text-xs text-zinc-400 mt-1">Hold hand inside camera frame</p>
          </div>
        </div>
      )}

      {/* 8. Active Gesture Tag (Bottom Left) */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
        <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Detected Input</span>
            <span className={`text-sm font-bold transition-colors ${hasHand ? 'text-blue-400' : 'text-zinc-400'}`}>
              {getGestureLabel(detectedGesture)}
            </span>
          </div>
        </div>

        {/* Small pointer coordinate indicator */}
        {hasHand && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 text-[10px] text-zinc-400">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
            Hand Tracking Active
          </div>
        )}
      </div>
    </div>
  );
};

export default WebcamFeed;
