'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, SwitchCamera } from 'lucide-react';

export type CameraFacing = 'user' | 'environment';

interface CameraCaptureProps {
  onCapture: (base64Image: string) => void;
  label?: string;
  isDark?: boolean;
  /** Starting camera: `user` = front/selfie, `environment` = rear/back. User can switch anytime. */
  defaultFacing?: CameraFacing;
}

function buildVideoConstraints(facing: CameraFacing): MediaStreamConstraints {
  return {
    audio: false,
    video: {
      facingMode: { ideal: facing },
    },
  };
}

export default function CameraCapture({
  onCapture,
  label = 'Capture Photo',
  isDark = false,
  defaultFacing = 'user',
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [facing, setFacing] = useState<CameraFacing>(defaultFacing);

  useEffect(() => {
    setFacing(defaultFacing);
  }, [defaultFacing]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    setError(null);
    navigator.mediaDevices
      .getUserMedia(buildVideoConstraints(facing))
      .then((s) => {
        stream = s;
        streamRef.current = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch((e) => {
        setError(e?.message || 'Camera access denied. Please enable camera.');
      });
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [facing]);

  const handleCapture = () => {
    if (!videoRef.current || !streamRef.current) return;
    setIsCapturing(true);
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const base64 = canvas.toDataURL('image/jpeg', 0.8);
      onCapture(base64);
    }
    setIsCapturing(false);
  };

  const handleRetry = () => {
    setError(null);
    navigator.mediaDevices
      .getUserMedia(buildVideoConstraints(facing))
      .then((s) => {
        if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch((e) => setError(e?.message || 'Camera access denied.'));
  };

  const flipCamera = () => {
    setFacing((f) => (f === 'user' ? 'environment' : 'user'));
  };

  if (error) {
    return (
      <div className={`rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'} p-6 text-center`}>
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'} mb-4`}>{error}</p>
        <button
          type="button"
          onClick={handleRetry}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-[#6B8E23] hover:bg-[#5a7a1e] text-white"
        >
          Retry Camera
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="aspect-[3/4] max-h-[320px] rounded-lg overflow-hidden bg-slate-800 relative">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
      </div>
      <button
        type="button"
        onClick={flipCamera}
        className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold border ${
          isDark ? 'border-slate-600 bg-slate-800/80 text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-800'
        } hover:bg-black/5 dark:hover:bg-white/5`}
      >
        <SwitchCamera className="w-4 h-4 shrink-0" />
        {facing === 'user' ? 'Use rear camera' : 'Use front camera (selfie)'}
      </button>
      <button
        type="button"
        onClick={handleCapture}
        disabled={isCapturing}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm bg-[#6B8E23] hover:bg-[#5a7a1e] text-white disabled:opacity-50"
      >
        {isCapturing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
        {label}
      </button>
    </div>
  );
}
