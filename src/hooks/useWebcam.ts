import { useState, useCallback, useRef } from 'react';

export const useWebcam = () => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const attachStream = (mediaStream: MediaStream) => {
    setStream(mediaStream);
    streamRef.current = mediaStream;
    if (videoRef.current) {
      videoRef.current.srcObject = mediaStream;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play().catch((e) => console.error('Video play error:', e));
      };
    }
  };

  const startCamera = useCallback(async (resolution: '720p' | '1080p' = '720p') => {
    setError(null);

    // Stop any existing tracks first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Default constraints
    let constraints: MediaStreamConstraints = {
      audio: false,
      video: {
        facingMode: 'user',
        width: resolution === '1080p' ? { ideal: 1920 } : { ideal: 1280 },
        height: resolution === '1080p' ? { ideal: 1080 } : { ideal: 720 },
      },
    };

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      
      const hasLabels = videoDevices.some(d => d.label);
      if (hasLabels) {
        // Keywords corresponding to virtual/software cameras
        const virtualKeywords = ['obs', 'virtual', 'epoc', 'manycam', 'splitcam', 'iriun', 'camo', 'elgato', 'virtualcamera'];
        const physicalDevices = videoDevices.filter((d) => {
          const label = d.label.toLowerCase();
          return !virtualKeywords.some((kw) => label.includes(kw));
        });

        if (physicalDevices.length > 0) {
          constraints = {
            audio: false,
            video: {
              deviceId: { ideal: physicalDevices[0].deviceId },
              width: resolution === '1080p' ? { ideal: 1920 } : { ideal: 1280 },
              height: resolution === '1080p' ? { ideal: 1080 } : { ideal: 720 }
            }
          };
        }
      }
    } catch (e) {
      console.warn('Failed to enumerate devices or filter virtual cameras:', e);
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      attachStream(mediaStream);
      return { stream: mediaStream, error: null };
    } catch (firstErr: any) {
      console.warn('Preferred camera constraints failed, trying fallback…', firstErr.name);

      // --- Attempt 2: minimal constraints (any camera, any resolution) ---
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        attachStream(mediaStream);
        return { stream: mediaStream, error: null };
      } catch (secondErr: any) {
        console.error('Fallback camera access also failed:', secondErr);

        let errorMsg = 'Could not access webcam.';
        if (secondErr.name === 'NotAllowedError' || firstErr.name === 'NotAllowedError') {
          errorMsg = 'Webcam permission denied. Please allow camera access in your browser settings.';
        } else if (secondErr.name === 'NotFoundError') {
          errorMsg = 'No webcam found on this device. Please connect a camera and refresh.';
        }
        setError(errorMsg);
        return { stream: null, error: errorMsg };
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  return {
    videoRef,
    stream,
    error,
    startCamera,
    stopCamera,
  };
};

export default useWebcam;
