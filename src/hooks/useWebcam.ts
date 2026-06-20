import { useState, useCallback, useRef } from 'react';

export const useWebcam = () => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const attachStream = (mediaStream: MediaStream) => {
    setStream(mediaStream);
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
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    // --- Attempt 1: preferred resolution with facingMode ---
    const preferredConstraints: MediaStreamConstraints = {
      audio: false,
      video: {
        facingMode: 'user',
        width: resolution === '1080p' ? { ideal: 1920 } : { ideal: 1280 },
        height: resolution === '1080p' ? { ideal: 1080 } : { ideal: 720 },
      },
    };

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia(preferredConstraints);
      attachStream(mediaStream);
      return mediaStream;
    } catch (firstErr: any) {
      console.warn('Preferred camera constraints failed, trying fallback…', firstErr.name);

      // --- Attempt 2: minimal constraints (any camera, any resolution) ---
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        attachStream(mediaStream);
        return mediaStream;
      } catch (secondErr: any) {
        console.error('Fallback camera access also failed:', secondErr);

        let errorMsg = 'Could not access webcam.';
        if (secondErr.name === 'NotAllowedError' || firstErr.name === 'NotAllowedError') {
          errorMsg = 'Webcam permission denied. Please allow camera access in your browser settings.';
        } else if (secondErr.name === 'NotFoundError') {
          errorMsg = 'No webcam found on this device. Please connect a camera and refresh.';
        }
        setError(errorMsg);
        return null;
      }
    }
  }, [stream]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  return {
    videoRef,
    stream,
    error,
    startCamera,
    stopCamera,
  };
};

export default useWebcam;
