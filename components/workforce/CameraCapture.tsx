'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (base64Image: string) => void;
  label?: string;
  isDark?: boolean;
}

export default function CameraCapture({ onCapture, label = 'Capture Photo', isDark = false }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    setError(null);
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user' }, audio: false })
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
  }, []);

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
      .getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then((s) => {
        if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch((e) => setError(e?.message || 'Camera access denied.'));
  };

  if (error) {
    return (
      <div className={`rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'} p-6 text-center`}>
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'} mb-4`}>{error}</p>
        <button
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
      <div className="aspect-[3/4] max-h-[320px] rounded-lg overflow-hidden bg-slate-800">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
      </div>
      <button
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
