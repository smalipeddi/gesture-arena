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

    const resolutionConstraints = {
      width: resolution === '1080p' ? { ideal: 1920 } : { ideal: 1280 },
      height: resolution === '1080p' ? { ideal: 1080 } : { ideal: 720 },
    };

    // Stage 1: Request camera permission with minimal constraints.
    // On deployed HTTPS origins (e.g. Vercel), enumerateDevices() returns
    // empty deviceId/label until permission has been granted. We first get
    // a basic stream to unlock the device list, then optionally upgrade.
    let baseStream: MediaStream | null = null;
    try {
      baseStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    } catch (permErr: any) {
      console.error('Fallback camera access also failed:', permErr);
      let errorMsg = 'Could not access webcam.';
      if (permErr.name === 'NotAllowedError') {
        errorMsg = 'Webcam permission denied. Please allow camera access in your browser settings.';
      } else if (permErr.name === 'NotFoundError') {
        errorMsg = 'No webcam found on this device. Please connect a camera and refresh.';
      }
      setError(errorMsg);
      return { stream: null, error: errorMsg };
    }

    // Stage 2: Now that permission is granted, enumerate real device IDs/labels
    // and try to get the best physical camera at the desired resolution.
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      const hasLabels = videoDevices.some((d) => d.label);

      if (hasLabels) {
        // Prefer a physical (non-virtual) camera
        const virtualKeywords = ['obs', 'virtual', 'epoc', 'manycam', 'splitcam', 'iriun', 'camo', 'elgato', 'virtualcamera'];
        const physicalDevices = videoDevices.filter((d) => {
          const label = d.label.toLowerCase();
          return !virtualKeywords.some((kw) => label.includes(kw));
        });

        const targetDevice = physicalDevices[0] ?? videoDevices[0];
        if (targetDevice?.deviceId) {
          // Stop the basic stream before requesting a better one
          baseStream.getTracks().forEach((t) => t.stop());
          baseStream = null;

          try {
            const upgradedStream = await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: { deviceId: { exact: targetDevice.deviceId }, ...resolutionConstraints },
            });
            attachStream(upgradedStream);
            return { stream: upgradedStream, error: null };
          } catch (upgradeErr) {
            console.warn('Upgraded camera constraints failed, falling back to base stream…', upgradeErr);
            // Re-acquire the basic stream since we stopped it
            baseStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          }
        }
      }
    } catch (e) {
      console.warn('Device enumeration or upgrade failed:', e);
    }

    // Fall through: use the already-acquired base stream
    attachStream(baseStream!);
    return { stream: baseStream, error: null };
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
