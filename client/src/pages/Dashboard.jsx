import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useWebRTC } from '../hooks/useWebRTC';
import { useAudioProcessor } from '../hooks/useAudioProcessor';
import { AudioMixer } from '../components/AudioMixer';
import { YouTubeLivePanel } from '../components/YouTubeLivePanel';
import { StreamControls } from '../components/StreamControls';
import { PrivacyScreen } from '../components/PrivacyOverlay';
import { SettingsModal } from '../components/SettingsModal';
import { 
  Camera, 
  MessageSquare, 
  Sliders, 
  Radio, 
  Settings, 
  FlipHorizontal, 
  Zap, 
  ZapOff, 
  Volume2, 
  VolumeX, 
  Users,
  EyeOff
} from 'lucide-react';
import { apiFetch } from '../utils/api';

export function Dashboard() {
  const { socket, isConnected } = useSocket();

  // Tab navigation: 'preview' | 'comments' | 'volume' | 'broadcast'
  const [activeTab, setActiveTab] = useState('preview');

  // Stream state
  const [isStreaming, setIsStreaming] = useState(false);
  const [isMock, setIsMock] = useState(false);
  const [streamStats, setStreamStats] = useState({ fps: 0, bitrate: '0 kbps', uptimeSeconds: 0, frame: 0 });
  const [isLoadingStream, setIsLoadingStream] = useState(false);

  // YouTube live stats & video ID
  const [ytStats, setYtStats] = useState({ viewerCount: 0, likes: 0 });
  const [activeVideoId, setActiveVideoId] = useState('');

  // Camera source: 'local' (kamera HP ini) or 'remote' (HP kedua)
  const [cameraSource, setCameraSource] = useState('local');
  const [localStream, setLocalStream] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' or 'user'
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);

  // Standby / Jeda layar
  const [isPrivacyActive, setIsPrivacyActive] = useState(false);

  // Config & Modals
  const [config, setConfig] = useState(null);
  const [networkInfo, setNetworkInfo] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Video & Recorder Refs
  const previewVideoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const wakeLockRef = useRef(null);

  // WebRTC hook for remote phone camera
  const { remoteStream, connectionState } = useWebRTC({
    socket,
    role: 'dashboard',
    room: 'stream-room'
  });

  const activeStream = cameraSource === 'remote' ? remoteStream : localStream;

  // Web Audio hook
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

  const formatUptime = (seconds = 0) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  // Keep screen awake while streaming to prevent network/webview sleep
  useEffect(() => {
    async function acquireWakeLock() {
      if (isStreaming && 'wakeLock' in navigator) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          console.log('[Dashboard] Screen wake lock acquired for streaming');
        } catch (err) {
          console.warn('[Dashboard] Wake lock error:', err.message);
        }
      }
    }
    acquireWakeLock();

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [isStreaming]);

  // Init local camera (runs once and stays active)
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
      console.warn('Gagal akses kamera:', err.message);
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

  const toggleCameraFacing = () => {
    setTorchOn(false);
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  const toggleTorch = async () => {
    if (!localStream) return;
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack && hasTorch) {
      try {
        const next = !torchOn;
        await videoTrack.applyConstraints({ advanced: [{ torch: next }] });
        setTorchOn(next);
      } catch (err) {
        console.warn('Torch error:', err);
      }
    }
  };

  // Fetch initial config & check live comments
  useEffect(() => {
    apiFetch('/api/config')
      .then(data => {
        if (data.success) {
          setConfig(data.config);
          if (data.config.youtubeVideoId) {
            setActiveVideoId(data.config.youtubeVideoId);
          }
          if (data.config.youtubeChannel) {
            apiFetch(`/api/youtube/auto-detect?channel=${encodeURIComponent(data.config.youtubeChannel)}`)
              .then(res => {
                if (res.videoId) setActiveVideoId(res.videoId);
              })
              .catch(() => {});
          }
        }
      })
      .catch(err => console.warn('Config fetch notice:', err.message));

    apiFetch('/api/network-info')
      .then(data => data.success && setNetworkInfo(data))
      .catch(() => {});

    apiFetch('/api/stream/status')
      .then(data => {
        if (data.success) {
          setIsStreaming(data.isStreaming);
          if (data.stats) setStreamStats(data.stats);
        }
      })
      .catch(() => {});
  }, []);

  // Socket broadcast sync
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
      if (stats.videoId) setActiveVideoId(stats.videoId);
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

  // Video preview element binding (persistent across tab changes)
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

  const handleTogglePrivacy = () => {
    setIsPrivacyActive(prev => {
      const next = !prev;
      if (next && !isMuted) toggleMute();
      else if (!next && isMuted) toggleMute();
      return next;
    });
  };

  // Start Live Stream via safe apiFetch & ArrayBuffer chunk stream
  const handleStartStream = async () => {
    setIsLoadingStream(true);
    try {
      const data = await apiFetch('/api/stream/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

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

        recorder.ondataavailable = async (event) => {
          if (event.data && event.data.size > 0 && socket.connected) {
            try {
              const arrayBuffer = await event.data.arrayBuffer();
              socket.emit('stream-chunk', arrayBuffer);
            } catch (e) {
              // ignore
            }
          }
        };

        // 350ms slices for smooth continuous transmission
        recorder.start(350);
        mediaRecorderRef.current = recorder;
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setIsLoadingStream(false);
    }
  };

  // Stop Live Stream
  const handleStopStream = async () => {
    setIsLoadingStream(true);
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current = null;
      }
      await apiFetch('/api/stream/stop', { method: 'POST' });
      setIsStreaming(false);
    } catch (err) {
      console.error('Stop stream error:', err);
    } finally {
      setIsLoadingStream(false);
    }
  };

  const handleSaveConfig = async (newConfig) => {
    try {
      const data = await apiFetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
      if (data.success) {
        setConfig(data.config);
        if (newConfig.youtubeChannel) {
          apiFetch(`/api/youtube/auto-detect?channel=${encodeURIComponent(newConfig.youtubeChannel)}`)
            .then(res => {
              if (res.videoId) setActiveVideoId(res.videoId);
            })
            .catch(() => {});
        }
      }
    } catch (err) {
      console.error('Save config error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#f1f1f1] flex flex-col justify-between font-sans select-none">
      {/* Top Header Bar */}
      <header className="h-12 border-b border-[#1f1f1f] bg-[#0a0a0a] px-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          {/* Status Indicator */}
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-[#ef4444] animate-ping' : 'bg-[#555555]'}`} />
            <span className="text-xs font-bold font-mono tracking-wider">
              {isStreaming ? `LIVE ${formatUptime(streamStats.uptimeSeconds)}` : 'STANDBY'}
            </span>
          </div>

          {/* Viewers Badge */}
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#aaaaaa]">
            <Users className="w-3.5 h-3.5" />
            <span>{ytStats.viewerCount.toLocaleString()}</span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Standby Screen Toggle */}
          <button
            type="button"
            onClick={handleTogglePrivacy}
            className={`p-1.5 rounded-lg text-xs transition border ${
              isPrivacyActive
                ? 'bg-[#eab308]/20 text-[#eab308] border-[#eab308]/40'
                : 'text-[#aaaaaa] hover:text-[#f1f1f1] border-transparent'
            }`}
            title="Jeda Layar"
          >
            <EyeOff className="w-4 h-4" />
          </button>

          {/* Settings */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 text-[#aaaaaa] hover:text-[#f1f1f1] rounded-lg transition"
            title="Setelan"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content: Persistent Camera Viewfinder to avoid browser stream teardown */}
      <main className="flex-1 p-3 sm:p-4 max-w-2xl w-full mx-auto pb-20 overflow-y-auto">
        {/* ================= TAB 1: KAMERA (PERSISTENT DOM) ================= */}
        <div className={activeTab === 'preview' ? 'flex flex-col gap-3' : 'hidden'}>
          {/* Viewfinder Video Frame */}
          <div className="relative w-full aspect-[4/3] sm:aspect-video bg-black rounded-xl overflow-hidden border border-[#1f1f1f] flex items-center justify-center">
            <video
              ref={previewVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${cameraSource === 'local' && facingMode === 'user' ? '-scale-x-100' : ''}`}
            />

            {isPrivacyActive && (
              <PrivacyScreen privacyText={config?.privacyText || 'STANDBY'} />
            )}

            {/* Viewfinder Top HUD */}
            <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-20">
              <span className="px-2 py-0.5 rounded bg-black/70 text-[10px] font-mono text-[#aaaaaa] border border-[#333333]">
                {cameraSource === 'local' ? (facingMode === 'environment' ? 'Belakang' : 'Depan') : 'HP Kedua'}
              </span>

              {/* Mini Audio VU */}
              <div className="flex items-center gap-1.5 bg-black/70 px-2 py-0.5 rounded border border-[#333333]">
                {isMuted ? <VolumeX className="w-3 h-3 text-[#ef4444]" /> : <Volume2 className="w-3 h-3 text-[#22c55e]" />}
                <div className="w-10 h-1.5 bg-[#222222] rounded-full overflow-hidden">
                  <div
                    className={`h-full ${isMuted ? 'bg-[#ef4444]' : 'bg-[#22c55e]'}`}
                    style={{ width: `${isMuted ? 100 : vuLevel}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Viewfinder Bottom Controls */}
            <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between z-20">
              {/* Source Toggle */}
              <div className="flex items-center gap-1 bg-black/80 p-0.5 rounded-lg border border-[#333333] text-[11px]">
                <button
                  type="button"
                  onClick={() => setCameraSource('local')}
                  className={`px-2 py-0.5 rounded font-medium transition ${
                    cameraSource === 'local' ? 'bg-[#333333] text-white' : 'text-[#717171] hover:text-white'
                  }`}
                >
                  HP Ini
                </button>
                <button
                  type="button"
                  onClick={() => setCameraSource('remote')}
                  className={`px-2 py-0.5 rounded font-medium transition ${
                    cameraSource === 'remote' ? 'bg-[#333333] text-white' : 'text-[#717171] hover:text-white'
                  }`}
                >
                  HP Kedua
                </button>
              </div>

              {/* Local Hardware Controls */}
              {cameraSource === 'local' && (
                <div className="flex items-center gap-1.5">
                  {hasTorch && (
                    <button
                      type="button"
                      onClick={toggleTorch}
                      className={`p-2 rounded-lg border transition ${
                        torchOn
                          ? 'bg-[#eab308] text-black border-[#eab308]'
                          : 'bg-black/80 text-[#aaaaaa] border-[#333333]'
                      }`}
                      title="Flash"
                    >
                      {torchOn ? <Zap className="w-3.5 h-3.5" /> : <ZapOff className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={toggleCameraFacing}
                    className="p-2 rounded-lg bg-black/80 text-[#aaaaaa] hover:text-white border border-[#333333] active:scale-95 transition"
                    title="Balik Kamera"
                  >
                    <FlipHorizontal className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleTogglePrivacy}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition border ${
                isPrivacyActive
                  ? 'bg-[#eab308]/20 text-[#eab308] border-[#eab308]/40'
                  : 'bg-[#121212] border-[#222222] text-[#aaaaaa] hover:text-white'
              }`}
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>{isPrivacyActive ? 'Layar Dijeda' : 'Jeda Layar'}</span>
            </button>

            <button
              type="button"
              onClick={toggleMute}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition border ${
                isMuted
                  ? 'bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]/40'
                  : 'bg-[#121212] border-[#222222] text-[#aaaaaa] hover:text-white'
              }`}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span>{isMuted ? 'Mic Muted' : 'Mute Mic'}</span>
            </button>
          </div>
        </div>

        {/* ================= TAB 2: CHAT YOUTUBE (100% CLEAN) ================= */}
        {activeTab === 'comments' && (
          <div className="h-full">
            <YouTubeLivePanel
              socket={socket}
              videoId={activeVideoId}
              channelHandle={config?.youtubeChannel}
              initialStats={ytStats}
            />
          </div>
        )}

        {/* ================= TAB 3: AUDIO MIXER ================= */}
        {activeTab === 'volume' && (
          <div>
            <AudioMixer
              gain={gain}
              setGain={setGain}
              isMuted={isMuted}
              toggleMute={toggleMute}
              limiterEnabled={limiterEnabled}
              toggleLimiter={toggleLimiter}
              vuLevel={vuLevel}
              isClipping={isClipping}
              inputLabel={cameraSource === 'local' ? 'Mikrofon HP' : 'HP Kedua'}
            />
          </div>
        )}

        {/* ================= TAB 4: SIARAN ================= */}
        {activeTab === 'broadcast' && (
          <div className="space-y-3">
            <StreamControls
              isStreaming={isStreaming}
              isMock={isMock}
              stats={streamStats}
              onStartStream={handleStartStream}
              onStopStream={handleStopStream}
              isLoading={isLoadingStream}
            />

            <div className="bg-[#0f0f0f] border border-[#222222] rounded-xl p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between text-[#aaaaaa]">
                <span className="font-semibold uppercase tracking-wider">Info Siaran</span>
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(true)}
                  className="text-[#f1f1f1] hover:underline"
                >
                  Ubah Setelan
                </button>
              </div>
              <div className="font-mono text-[11px] text-[#717171] space-y-1">
                <div>Channel: {config?.youtubeChannel || '(Belum diset)'}</div>
                <div>Target: {config?.rtmpUrl || 'rtmp://a.rtmp.youtube.com/live2'}</div>
                <div>Resolusi: {config?.resolution || '720p'} @ {config?.fps || 30} FPS</div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ================= BOTTOM TAB NAVIGATION ================= */}
      <nav className="fixed bottom-0 left-0 right-0 h-14 bg-[#0a0a0a] border-t border-[#1f1f1f] z-50 px-4 flex items-center justify-around">
        {/* Tab 1: Kamera */}
        <button
          type="button"
          onClick={() => setActiveTab('preview')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
            activeTab === 'preview' ? 'text-white' : 'text-[#717171] hover:text-[#aaaaaa]'
          }`}
        >
          <Camera className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Kamera</span>
        </button>

        {/* Tab 2: Chat */}
        <button
          type="button"
          onClick={() => setActiveTab('comments')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
            activeTab === 'comments' ? 'text-white' : 'text-[#717171] hover:text-[#aaaaaa]'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Chat</span>
        </button>

        {/* Tab 3: Audio */}
        <button
          type="button"
          onClick={() => setActiveTab('volume')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
            activeTab === 'volume' ? 'text-white' : 'text-[#717171] hover:text-[#aaaaaa]'
          }`}
        >
          <Sliders className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Audio</span>
        </button>

        {/* Tab 4: Siaran */}
        <button
          type="button"
          onClick={() => setActiveTab('broadcast')}
          className={`flex flex-col items-center justify-center flex-1 py-1 relative transition ${
            activeTab === 'broadcast' ? 'text-white' : 'text-[#717171] hover:text-[#aaaaaa]'
          }`}
        >
          <Radio className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Siaran</span>
          {isStreaming && (
            <span className="absolute top-1 right-5 w-2 h-2 rounded-full bg-[#ef4444] animate-ping" />
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
