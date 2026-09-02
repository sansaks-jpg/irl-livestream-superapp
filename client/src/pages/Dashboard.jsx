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
  Camera, 
  MessageSquare, 
  Sliders, 
  Radio, 
  Flame, 
  Settings, 
  FlipHorizontal, 
  Zap, 
  ZapOff, 
  Volume2, 
  VolumeX, 
  Smartphone, 
  Users, 
  Clock, 
  ShieldAlert,
  Maximize2,
  QrCode
} from 'lucide-react';

export function Dashboard() {
  const { socket, isConnected } = useSocket();

  // Navigation Tab: 'preview' | 'comments' | 'volume' | 'broadcast'
  const [activeTab, setActiveTab] = useState('preview');

  // Stream state
  const [isStreaming, setIsStreaming] = useState(false);
  const [isMock, setIsMock] = useState(false);
  const [streamStats, setStreamStats] = useState({ fps: 0, bitrate: '0 kbps', uptimeSeconds: 0, frame: 0 });
  const [isLoadingStream, setIsLoadingStream] = useState(false);

  // YouTube live stats for top bar
  const [ytStats, setYtStats] = useState({ viewerCount: 0, likes: 0 });

  // Camera Source: 'local' (Kamera HP ini) or 'remote' (Kamera HP kedua nirkabel)
  const [cameraSource, setCameraSource] = useState('local');
  const [localStream, setLocalStream] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (belakang) or 'user' (depan)
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);

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
  const activeStream = cameraSource === 'remote' ? remoteStream : localStream;

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

  // Format seconds to HH:MM:SS
  const formatUptime = (seconds = 0) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  // Initialize Native / Local Camera
  const initLocalCamera = async (facing) => {
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
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
      });
      setLocalStream(stream);

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities ? videoTrack.getCapabilities() : {};
        setHasTorch(!!capabilities.torch);
      }
    } catch (err) {
      console.warn('Gagal akses kamera lokal:', err.message);
    }
  };

  useEffect(() => {
    if (cameraSource === 'local') {
      initLocalCamera(facingMode);
    }
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [cameraSource, facingMode]);

  // Flip Camera
  const toggleCameraFacing = () => {
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

  // Sync socket events
  useEffect(() => {
    if (!socket) return;

    const handleStreamStatus = (status) => {
      setIsStreaming(status.isStreaming);
      if (status.isMock !== undefined) setIsMock(status.isMock);
    };

    const handleStreamStats = (stats) => {
      setStreamStats(stats);
    };

    const handleYtStats = (stats) => {
      setYtStats(prev => ({ ...prev, ...stats }));
    };

    socket.on('stream-status', handleStreamStatus);
    socket.on('stream-stats', handleStreamStats);
    socket.on('yt-stats', handleYtStats);

    return () => {
      socket.off('stream-status', handleStreamStatus);
      socket.off('stream-stats', handleStreamStats);
      socket.off('yt-stats', handleYtStats);
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

  // Toggle Privacy Shield
  const handleTogglePrivacy = () => {
    setIsPrivacyActive(prev => {
      const next = !prev;
      if (next && !isMuted) toggleMute();
      else if (!next && isMuted) toggleMute();
      return next;
    });
  };

  // Start Livestream
  const handleStartStream = async () => {
    setIsLoadingStream(true);
    try {
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

      const processed = getProcessedStream() || activeStream;
      if (processed && socket) {
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

        recorder.start(500);
        mediaRecorderRef.current = recorder;
      }
    } catch (err) {
      alert('Error: ' + err.message);
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

  const handleSaveConfig = async (newConfig) => {
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
      const data = await res.json();
      if (data.success) setConfig(data.config);
    } catch (err) {
      console.error('Failed to save config:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Top Mobile Status Header (Persistent) */}
      <header className="h-14 border-b border-slate-800/80 bg-slate-900/95 backdrop-blur-md px-3 sm:px-5 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          {/* Live Status Pill */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold font-mono tracking-wide ${
            isStreaming
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50'
              : 'bg-slate-800 text-slate-400 border border-slate-700'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-rose-500 animate-ping' : 'bg-slate-500'}`} />
            <span>{isStreaming ? `LIVE ${formatUptime(streamStats.uptimeSeconds)}` : 'OFFLINE'}</span>
          </div>

          {/* Viewers Count */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-[11px] font-mono text-slate-300">
            <Users className="w-3 h-3 text-rose-400" />
            <span>{ytStats.viewerCount.toLocaleString()}</span>
          </div>
        </div>

        {/* Top Right Actions */}
        <div className="flex items-center gap-2">
          {/* Privacy Shield Quick Button */}
          <button
            type="button"
            onClick={handleTogglePrivacy}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition ${
              isPrivacyActive
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-900/40 animate-pulse'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
            title="Privacy Shield / BRB Screen"
          >
            <ShieldAlert className="w-4 h-4" />
            <span className="hidden sm:inline">{isPrivacyActive ? 'BRB AKTIF' : 'BRB'}</span>
          </button>

          {/* Settings Button */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
            title="Pengaturan"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Tab Content Area */}
      <main className="flex-1 p-3 sm:p-5 max-w-4xl w-full mx-auto pb-24 overflow-y-auto">
        {/* ================= TAB 1: PREVIEW KAMERA ================= */}
        {activeTab === 'preview' && (
          <div className="flex flex-col gap-4 animate-in fade-in duration-150">
            {/* Camera Video Viewport */}
            <div className="relative w-full aspect-[4/3] sm:aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center">
              <video
                ref={previewVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${cameraSource === 'local' && facingMode === 'user' ? '-scale-x-100' : ''}`}
              />

              {/* Privacy Screen Overlay */}
              {isPrivacyActive && (
                <PrivacyScreen privacyText={config?.privacyText} />
              )}

              {/* Top Video HUD */}
              <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-20 pointer-events-none">
                <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-mono text-slate-200 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{cameraSource === 'local' ? (facingMode === 'environment' ? 'Cam Belakang' : 'Cam Depan') : 'HP Kedua (WebRTC)'}</span>
                </span>

                {/* Mini VU bar on camera */}
                <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                  {isMuted ? <VolumeX className="w-3 h-3 text-rose-400" /> : <Volume2 className="w-3 h-3 text-emerald-400" />}
                  <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${isMuted ? 'bg-rose-500' : 'bg-emerald-400'}`}
                      style={{ width: `${isMuted ? 100 : vuLevel}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Floating Camera Controls on Video */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between z-20">
                {/* Source Switcher */}
                <div className="flex items-center gap-1 bg-black/70 backdrop-blur-md p-1 rounded-xl border border-white/10 text-xs">
                  <button
                    type="button"
                    onClick={() => setCameraSource('local')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition ${
                      cameraSource === 'local' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    HP Ini
                  </button>
                  <button
                    type="button"
                    onClick={() => setCameraSource('remote')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition ${
                      cameraSource === 'remote' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    HP Kedua
                  </button>
                </div>

                {/* Hardware controls for local cam */}
                {cameraSource === 'local' && (
                  <div className="flex items-center gap-2">
                    {hasTorch && (
                      <button
                        type="button"
                        onClick={toggleTorch}
                        className={`p-2.5 rounded-xl backdrop-blur-md border transition ${
                          torchOn
                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                            : 'bg-black/70 text-slate-300 border-white/10'
                        }`}
                        title="Senter"
                      >
                        {torchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={toggleCameraFacing}
                      className="p-2.5 rounded-xl bg-black/70 backdrop-blur-md text-slate-300 hover:text-white border border-white/10 active:scale-95 transition"
                      title="Flip Kamera"
                    >
                      <FlipHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleTogglePrivacy}
                className={`py-2.5 px-3 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-1.5 transition ${
                  isPrivacyActive
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>{isPrivacyActive ? 'Matikan BRB' : 'Layar BRB / Privasi'}</span>
              </button>

              <button
                type="button"
                onClick={toggleMute}
                className={`py-2.5 px-3 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-1.5 transition ${
                  isMuted
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50'
                    : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                <span>{isMuted ? 'Unmute Mic' : 'Mute Mic'}</span>
              </button>
            </div>

            {/* Soundboard Bar */}
            <Soundboard />
          </div>
        )}

        {/* ================= TAB 2: KOMEN / CHAT YOUTUBE ================= */}
        {activeTab === 'comments' && (
          <div className="animate-in fade-in duration-150">
            <YouTubeLivePanel socket={socket} initialStats={ytStats} />
          </div>
        )}

        {/* ================= TAB 3: VOLUME / AUDIO MIXER ================= */}
        {activeTab === 'volume' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <AudioMixer
              gain={gain}
              setGain={setGain}
              isMuted={isMuted}
              toggleMute={toggleMute}
              limiterEnabled={limiterEnabled}
              toggleLimiter={toggleLimiter}
              vuLevel={vuLevel}
              isClipping={isClipping}
              inputLabel={cameraSource === 'local' ? 'Kamera HP Ini' : 'HP Kamera Kedua'}
            />
            <Soundboard />
          </div>
        )}

        {/* ================= TAB 4: BROADCAST & KONTROL ================= */}
        {activeTab === 'broadcast' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <StreamControls
              isStreaming={isStreaming}
              isMock={isMock}
              stats={streamStats}
              onStartStream={handleStartStream}
              onStopStream={handleStopStream}
              isLoading={isLoadingStream}
            />

            {/* Quick Settings Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                  Konfigurasi Siaran YouTube
                </span>
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(true)}
                  className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <Settings className="w-3 h-3" />
                  <span>Pengaturan Lengkap</span>
                </button>
              </div>

              <div className="text-xs text-slate-400 space-y-1">
                <p>• <strong>Target:</strong> {config?.rtmpUrl || 'rtmp://a.rtmp.youtube.com/live2'}</p>
                <p>• <strong>Stream Key:</strong> {config?.streamKeyMasked || '(Belum diisi / Mode Test)'}</p>
                <p>• <strong>Resolusi:</strong> {config?.resolution || '720p'} @ {config?.fps || 30} FPS</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ================= FIXED BOTTOM TAB NAVIGATION BAR ================= */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 z-50 px-2 sm:px-6 flex items-center justify-around">
        {/* Tab 1: Preview */}
        <button
          type="button"
          onClick={() => setActiveTab('preview')}
          className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition ${
            activeTab === 'preview'
              ? 'text-indigo-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Camera className={`w-5 h-5 transition-transform ${activeTab === 'preview' ? 'scale-110 text-indigo-400' : ''}`} />
          <span className="text-[10px] mt-0.5">Preview</span>
        </button>

        {/* Tab 2: Komen */}
        <button
          type="button"
          onClick={() => setActiveTab('comments')}
          className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl relative transition ${
            activeTab === 'comments'
              ? 'text-rose-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageSquare className={`w-5 h-5 transition-transform ${activeTab === 'comments' ? 'scale-110 text-rose-400' : ''}`} />
          <span className="text-[10px] mt-0.5">Komen</span>
        </button>

        {/* Tab 3: Volume */}
        <button
          type="button"
          onClick={() => setActiveTab('volume')}
          className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition ${
            activeTab === 'volume'
              ? 'text-emerald-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className={`w-5 h-5 transition-transform ${activeTab === 'volume' ? 'scale-110 text-emerald-400' : ''}`} />
          <span className="text-[10px] mt-0.5">Volume</span>
        </button>

        {/* Tab 4: Broadcast */}
        <button
          type="button"
          onClick={() => setActiveTab('broadcast')}
          className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl relative transition ${
            activeTab === 'broadcast'
              ? 'text-amber-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Radio className={`w-5 h-5 transition-transform ${activeTab === 'broadcast' ? 'scale-110 text-amber-400' : ''}`} />
          <span className="text-[10px] mt-0.5">Broadcast</span>
          {isStreaming && (
            <span className="absolute top-2 right-6 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          )}
        </button>
      </nav>

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
