import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useWebRTC } from '../hooks/useWebRTC';
import { useAudioProcessor } from '../hooks/useAudioProcessor';
import { AudioMixer } from '../components/AudioMixer';
import { YouTubeLivePanel } from '../components/YouTubeLivePanel';
import { StreamControls } from '../components/StreamControls';
import { PrivacyOverlay, PrivacyScreen } from '../components/PrivacyOverlay';
import { Soundboard } from '../components/Soundboard';
import { SettingsModal } from '../components/SettingsModal';
import { 
  Radio, 
  Settings, 
  Smartphone, 
  Camera, 
  Maximize2, 
  Wifi, 
  ShieldCheck, 
  Volume2, 
  VolumeX, 
  QrCode,
  Flame,
  CheckCircle2,
  Tv
} from 'lucide-react';

export function Dashboard() {
  const { socket, isConnected } = useSocket();

  // Stream state
  const [isStreaming, setIsStreaming] = useState(false);
  const [isMock, setIsMock] = useState(false);
  const [streamStats, setStreamStats] = useState({ fps: 0, bitrate: '0 kbps', uptimeSeconds: 0, frame: 0 });
  const [isLoadingStream, setIsLoadingStream] = useState(false);

  // Camera Source: 'remote' (HP Kamera via WebRTC) or 'local' (Webcam/Capture Card)
  const [cameraSource, setCameraSource] = useState('remote');
  const [localWebcamStream, setLocalWebcamStream] = useState(null);

  // Emergency / Privacy State
  const [isPrivacyActive, setIsPrivacyActive] = useState(false);

  // Config & Modals
  const [config, setConfig] = useState(null);
  const [networkInfo, setNetworkInfo] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Video Refs
  const previewVideoRef = useRef(null);
  const mediaRecorderRef = useRef(null);

  // WebRTC hook for remote phone camera
  const { remoteStream, connectionState } = useWebRTC({
    socket,
    role: 'dashboard',
    room: 'stream-room'
  });

  // Determine active raw stream
  const activeStream = cameraSource === 'remote' ? remoteStream : localWebcamStream;

  // Audio Processor Web Audio hook
  const {
    gain,
    setGain,
    isMuted,
    toggleMute,
    limiterEnabled,
    toggleLimiter,
    vuLevel,
    isClipping,
    getProcessedStream
  } = useAudioProcessor(activeStream);

  // Fetch initial config & network info
  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => data.success && setConfig(data.config))
      .catch(err => console.error('Failed to fetch config:', err));

    fetch('/api/network-info')
      .then(res => res.json())
      .then(data => data.success && setNetworkInfo(data))
      .catch(err => console.error('Failed to fetch network info:', err));

    fetch('/api/stream/status')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setIsStreaming(data.isStreaming);
          if (data.stats) setStreamStats(data.stats);
        }
      })
      .catch(() => {});
  }, []);

  // Listen to socket broadcast events
  useEffect(() => {
    if (!socket) return;

    const handleStreamStatus = (status) => {
      setIsStreaming(status.isStreaming);
      if (status.isMock !== undefined) setIsMock(status.isMock);
    };

    const handleStreamStats = (stats) => {
      setStreamStats(stats);
    };

    socket.on('stream-status', handleStreamStatus);
    socket.on('stream-stats', handleStreamStats);

    return () => {
      socket.off('stream-status', handleStreamStatus);
      socket.off('stream-stats', handleStreamStats);
    };
  }, [socket]);

  // Sync Video preview element
  useEffect(() => {
    if (previewVideoRef.current) {
      if (activeStream) {
        previewVideoRef.current.srcObject = activeStream;
        previewVideoRef.current.play().catch(() => {});
      } else {
        previewVideoRef.current.srcObject = null;
      }
    }
  }, [activeStream]);

  // Switch to local webcam
  const handleSelectLocalWebcam = async () => {
    setCameraSource('local');
    if (!localWebcamStream) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true
        });
        setLocalWebcamStream(stream);
      } catch (err) {
        alert('Gagal mengakses kamera/mic lokal: ' + err.message);
      }
    }
  };

  const handleSelectRemoteCam = () => {
    setCameraSource('remote');
  };

  // Toggle Privacy Shield
  const handleTogglePrivacy = () => {
    setIsPrivacyActive(prev => {
      const next = !prev;
      // Auto mute mic when privacy shield activates
      if (next && !isMuted) {
        toggleMute();
      } else if (!next && isMuted) {
        toggleMute();
      }
      return next;
    });
  };

  // Start Livestream (Pipes MediaRecorder to FFmpeg backend via Socket.IO)
  const handleStartStream = async () => {
    setIsLoadingStream(true);
    try {
      // 1. Tell backend to start FFmpeg
      const res = await fetch('/api/stream/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Gagal memulai stream');
      }

      setIsStreaming(true);
      setIsMock(!!data.isMock);

      // 2. Start capturing processed stream in browser
      const processed = getProcessedStream() || activeStream;
      if (processed && socket) {
        // Preferred codecs: webm with h264 or vp8
        let mimeType = 'video/webm;codecs=vp8,opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm';
        }

        const recorder = new MediaRecorder(processed, {
          mimeType,
          videoBitsPerSecond: 3000000
        });

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0 && socket.connected) {
            socket.emit('stream-chunk', event.data);
          }
        };

        recorder.start(500); // 500ms chunks
        mediaRecorderRef.current = recorder;
        console.log('[Dashboard] MediaRecorder streaming pipeline started');
      }
    } catch (err) {
      alert('Error saat memulai livestream: ' + err.message);
    } finally {
      setIsLoadingStream(false);
    }
  };

  // End Livestream
  const handleStopStream = async () => {
    setIsLoadingStream(true);
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current = null;
      }
      await fetch('/api/stream/stop', { method: 'POST' });
      setIsStreaming(false);
    } catch (err) {
      console.error('Error stopping stream:', err);
    } finally {
      setIsLoadingStream(false);
    }
  };

  // Save Settings
  const handleSaveConfig = async (newConfig) => {
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
      }
    } catch (err) {
      console.error('Failed to save config:', err);
    }
  };

  // Fullscreen video
  const handleFullscreenVideo = () => {
    const videoContainer = document.getElementById('main-video-container');
    if (videoContainer) {
      if (!document.fullscreenElement) {
        videoContainer.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-rose-600 to-indigo-600 rounded-xl shadow-md">
            <Radio className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-wide uppercase bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              IRL Stream Master
            </h1>
            <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Superapp Livestream Monitor
            </span>
          </div>
        </div>

        {/* Center / Right Header Badges */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Network IP for Phone */}
          {networkInfo && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono text-slate-300">
              <Wifi className="w-3.5 h-3.5 text-indigo-400" />
              <span>IP: {networkInfo.primaryIp}</span>
            </div>
          )}

          {/* Quick QR Code / Settings Button */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition shadow-sm"
          >
            <QrCode className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">Koneksi HP & Settings</span>
          </button>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Center Column: Video Preview & Primary Controls (7 cols on lg) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Main Video Preview Container */}
          <div
            id="main-video-container"
            className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center group"
          >
            {/* Live Video Element */}
            <video
              ref={previewVideoRef}
              autoPlay
              playsInline
              muted // Always mute on preview to prevent local feedback loop
              className="w-full h-full object-contain"
            />

            {/* Privacy / BRB Overlay Screen */}
            {isPrivacyActive && (
              <PrivacyScreen privacyText={config?.privacyText} />
            )}

            {/* Empty State when no camera connected */}
            {!activeStream && !isPrivacyActive && (
              <div className="flex flex-col items-center justify-center text-center p-6 space-y-3 select-none">
                <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
                  <Smartphone className="w-8 h-8 text-slate-500 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-300">Menunggu Feed Kamera</h4>
                  <p className="text-xs text-slate-500 max-w-xs mt-1">
                    Buka halaman <span className="font-mono text-indigo-400">/cam</span> di HP kamera Anda, atau klik tombol di bawah untuk beralih ke webcam lokal.
                  </p>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(true)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Scan QR Code HP</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectLocalWebcam}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Pakai Webcam Laptop/PC</span>
                  </button>
                </div>
              </div>
            )}

            {/* Top HUD Badges on Preview */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-20">
              <div className="flex items-center gap-2">
                {isStreaming ? (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-600/90 text-white font-bold text-[11px] backdrop-blur-md shadow-md">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                    <span>LIVE</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-black/60 text-slate-300 font-semibold text-[11px] backdrop-blur-md border border-white/10">
                    PREVIEW
                  </span>
                )}

                <span className="px-2.5 py-1 rounded-full bg-black/60 text-indigo-300 font-semibold text-[11px] backdrop-blur-md border border-white/10 flex items-center gap-1">
                  {cameraSource === 'remote' ? (
                    <>
                      <Smartphone className="w-3 h-3" />
                      <span>HP Cam: {connectionState === 'connected' ? 'Aktif' : 'Menunggu...'}</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-3 h-3" />
                      <span>Webcam Lokal</span>
                    </>
                  )}
                </span>
              </div>

              {/* Fullscreen Button */}
              <button
                type="button"
                onClick={handleFullscreenVideo}
                className="pointer-events-auto p-1.5 rounded-lg bg-black/60 text-white/80 hover:text-white hover:bg-black/90 backdrop-blur-md transition"
                title="Fullscreen Preview"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>

            {/* Bottom Camera Selector Bar on Hover */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
              <div className="flex items-center gap-2 bg-slate-950/80 backdrop-blur-md p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={handleSelectRemoteCam}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    cameraSource === 'remote'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>HP Cam (Nirkabel)</span>
                </button>
                <button
                  type="button"
                  onClick={handleSelectLocalWebcam}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    cameraSource === 'local'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Webcam Lokal</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Action Bar (Privacy & Soundboard) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <PrivacyOverlay
              isActive={isPrivacyActive}
              onToggle={handleTogglePrivacy}
              privacyText={config?.privacyText}
            />
            <Soundboard />
          </div>

          {/* Audio Gain & VU Meter Mixer */}
          <AudioMixer
            gain={gain}
            setGain={setGain}
            isMuted={isMuted}
            toggleMute={toggleMute}
            limiterEnabled={limiterEnabled}
            toggleLimiter={toggleLimiter}
            vuLevel={vuLevel}
            isClipping={isClipping}
            inputLabel={cameraSource === 'remote' ? 'HP Kamera Audio' : 'Webcam/Mic Lokal'}
          />
        </div>

        {/* Right Column: Broadcast Controls & YouTube Live Feed (5 cols on lg) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Main Broadcast Control Center */}
          <StreamControls
            isStreaming={isStreaming}
            isMock={isMock}
            stats={streamStats}
            onStartStream={handleStartStream}
            onStopStream={handleStopStream}
            isLoading={isLoadingStream}
          />

          {/* Real-time YouTube Live Chat & Metrics */}
          <YouTubeLivePanel socket={socket} />
        </div>
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onSaveConfig={handleSaveConfig}
        networkInfo={networkInfo}
      />
    </div>
  );
}
