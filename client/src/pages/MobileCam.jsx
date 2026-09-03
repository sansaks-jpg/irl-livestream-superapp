import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useWebRTC } from '../hooks/useWebRTC';
import {
  FlipHorizontal,
  Zap,
  ZapOff,
  Battery,
  Mic,
  MicOff,
  Maximize,
  Radio
} from 'lucide-react';

export function MobileCam() {
  const { socket } = useSocket();
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (belakang) or 'user' (depan)
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0);

  const videoRef = useRef(null);
  const wakeLockRef = useRef(null);
  const localStreamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const audioRafRef = useRef(null);

  // WebRTC hook as cam-sender
  const { connectionState } = useWebRTC({
    socket,
    role: 'cam-sender',
    room: 'stream-room',
    localStream
  });

  // Keep screen awake using Screen Wake Lock API
  useEffect(() => {
    async function requestWakeLock() {
      if ('wakeLock' in navigator) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          console.log('[MobileCam] Screen wake lock acquired');
        } catch (err) {
          console.warn('[MobileCam] Wake lock request failed:', err.message);
        }
      }
    }
    requestWakeLock();

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
      }
    };
  }, []);

  // Monitor Battery API
  useEffect(() => {
    let battery = null;
    let updateBattery = null;
    let cancelled = false;
    if ('getBattery' in navigator) {
      navigator.getBattery().then((b) => {
        if (cancelled) return;
        battery = b;
        updateBattery = () => {
          setBatteryLevel(Math.round(battery.level * 100));
        };
        updateBattery();
        battery.addEventListener('levelchange', updateBattery);
      }).catch(() => {});
    }
    return () => {
      cancelled = true;
      if (battery && updateBattery) {
        battery.removeEventListener('levelchange', updateBattery);
      }
    };
  }, []);

  const stopAudioMonitor = useCallback(() => {
    if (audioRafRef.current) {
      cancelAnimationFrame(audioRafRef.current);
      audioRafRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  }, []);

  // Initialize Camera & Microphone Stream
  const initCamera = useCallback(async (facing) => {
    stopAudioMonitor();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }

    try {
      const constraints = {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);
      setErrorMsg(null);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Check flashlight/torch capability
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities ? videoTrack.getCapabilities() : {};
        setHasTorch(!!capabilities.torch);
      }

      // Set up audio level monitoring
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        src.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const checkAudio = () => {
          if (!stream.active) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
          const avg = sum / dataArray.length;
          setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
          audioRafRef.current = requestAnimationFrame(checkAudio);
        };
        checkAudio();
      } catch (e) {
        // audio ctx error ignore
      }

    } catch (err) {
      console.error('[MobileCam] getUserMedia error:', err);
      setErrorMsg(`Izin kamera/mic ditolak atau tidak didukung: ${err.message}`);
    }
  }, [stopAudioMonitor]);

  useEffect(() => {
    initCamera(facingMode);
    return () => {
      if (audioRafRef.current) {
        cancelAnimationFrame(audioRafRef.current);
        audioRafRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
      }
    };
  }, [facingMode, initCamera]);

  // Flip Camera
  const toggleCamera = () => {
    setTorchOn(false);
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Toggle Torch
  const toggleTorch = async () => {
    if (!localStream) return;
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack && hasTorch) {
      try {
        const next = !torchOn;
        await videoTrack.applyConstraints({
          advanced: [{ torch: next }]
        });
        setTorchOn(next);
      } catch (err) {
        console.warn('Torch error:', err);
      }
    }
  };

  // Toggle Mute
  const toggleMute = () => {
    if (!localStream) return;
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden flex flex-col items-center justify-center select-none">
      {/* Live Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
      />

      {/* Top HUD Overlay */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between text-white z-20">
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-md ${
            connectionState === 'connected'
              ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
              : 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
          }`}>
            <Radio className={`w-3.5 h-3.5 ${connectionState === 'connected' ? 'animate-pulse' : ''}`} />
            <span>{connectionState === 'connected' ? 'TERHUBUNG KE DASHBOARD' : 'MENUNGGU DASHBOARD...'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          {batteryLevel !== null && (
            <div className="flex items-center gap-1 bg-black/50 px-2 py-1 rounded-lg backdrop-blur-md">
              <Battery className="w-3.5 h-3.5 text-emerald-400" />
              <span>{batteryLevel}%</span>
            </div>
          )}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 bg-black/50 rounded-lg text-slate-300 hover:text-white backdrop-blur-md"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Audio Level Mini Bar */}
      <div className="absolute top-16 left-4 z-20 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
        {isMuted ? <MicOff className="w-3.5 h-3.5 text-rose-400" /> : <Mic className="w-3.5 h-3.5 text-emerald-400" />}
        <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-75 ${isMuted ? 'bg-rose-500' : 'bg-emerald-400'}`}
            style={{ width: `${isMuted ? 100 : audioLevel}%` }}
          />
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="absolute inset-x-4 top-24 z-30 bg-rose-950/90 border border-rose-600 text-rose-200 p-3 rounded-xl text-xs backdrop-blur-md text-center">
          {errorMsg}
        </div>
      )}

      {/* Bottom Camera Action Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-center justify-around z-20">
        {/* Flip Camera Button */}
        <button
          type="button"
          onClick={toggleCamera}
          className="flex flex-col items-center gap-1 text-white p-3 rounded-2xl bg-white/10 backdrop-blur-md active:scale-90 transition"
        >
          <FlipHorizontal className="w-6 h-6 text-indigo-300" />
          <span className="text-[10px] font-semibold uppercase">
            {facingMode === 'environment' ? 'Kamera Depan' : 'Kamera Belakang'}
          </span>
        </button>

        {/* Torch / Flashlight Button */}
        {hasTorch && (
          <button
            type="button"
            onClick={toggleTorch}
            className={`flex flex-col items-center gap-1 text-white p-3 rounded-2xl backdrop-blur-md active:scale-90 transition ${
              torchOn ? 'bg-amber-500/40 text-amber-300' : 'bg-white/10'
            }`}
          >
            {torchOn ? <Zap className="w-6 h-6 text-amber-300" /> : <ZapOff className="w-6 h-6 text-slate-400" />}
            <span className="text-[10px] font-semibold uppercase">Senter {torchOn ? 'ON' : 'OFF'}</span>
          </button>
        )}

        {/* Mute Button */}
        <button
          type="button"
          onClick={toggleMute}
          className={`flex flex-col items-center gap-1 text-white p-3 rounded-2xl backdrop-blur-md active:scale-90 transition ${
            isMuted ? 'bg-rose-500/40 text-rose-300' : 'bg-white/10'
          }`}
        >
          {isMuted ? <MicOff className="w-6 h-6 text-rose-400" /> : <Mic className="w-6 h-6 text-emerald-400" />}
          <span className="text-[10px] font-semibold uppercase">{isMuted ? 'Mic Muted' : 'Mic Aktif'}</span>
        </button>
      </div>
    </div>
  );
}
