import React, { useState } from 'react';
import { 
  Radio, 
  Play, 
  Square, 
  Activity, 
  Clock, 
  Wifi, 
  AlertTriangle,
  Flame
} from 'lucide-react';

export function StreamControls({
  isStreaming = false,
  isMock = false,
  stats = { fps: 0, bitrate: '0 kbps', uptimeSeconds: 0, frame: 0 },
  onStartStream,
  onStopStream,
  isLoading = false
}) {
  const [showConfirmStop, setShowConfirmStop] = useState(false);

  // Format seconds to HH:MM:SS
  const formatUptime = (seconds = 0) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const handleStopClick = () => {
    if (showConfirmStop) {
      setShowConfirmStop(false);
      onStopStream && onStopStream();
    } else {
      setShowConfirmStop(true);
      setTimeout(() => setShowConfirmStop(false), 5000); // Reset confirm after 5s
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col gap-4">
      {/* Header & Status Badges */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`relative flex items-center justify-center w-4 h-4`}>
            {isStreaming ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
              </>
            ) : (
              <span className="inline-flex rounded-full h-3 w-3 bg-slate-600" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-wide uppercase text-slate-100 flex items-center gap-1.5">
              {isStreaming ? (
                <span className="text-rose-400 flex items-center gap-1">
                  <Flame className="w-4 h-4 text-rose-500 animate-bounce" /> SEDANG LIVE
                </span>
              ) : (
                <span className="text-slate-400">STANDBY / OFFLINE</span>
              )}
            </h3>
          </div>
        </div>

        {/* Mode Tag */}
        <span className={`text-[11px] font-mono px-2 py-0.5 rounded ${
          isStreaming 
            ? (isMock ? 'bg-amber-950/60 text-amber-400 border border-amber-800' : 'bg-rose-950/60 text-rose-300 border border-rose-800')
            : 'bg-slate-800 text-slate-400'
        }`}>
          {isStreaming ? (isMock ? 'TEST MODE' : 'YOUTUBE RTMP') : 'READY'}
        </span>
      </div>

      {/* Realtime Telemetry Grid */}
      <div className="grid grid-cols-3 gap-2">
        {/* Uptime */}
        <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80 flex flex-col">
          <span className="text-[10px] text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" /> Durasi Live
          </span>
          <span className="text-sm font-mono font-bold text-slate-100 mt-1">
            {formatUptime(stats.uptimeSeconds)}
          </span>
        </div>

        {/* Bitrate */}
        <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80 flex flex-col">
          <span className="text-[10px] text-slate-400 flex items-center gap-1">
            <Wifi className="w-3 h-3 text-indigo-400" /> Bitrate RTMP
          </span>
          <span className="text-sm font-mono font-bold text-indigo-300 mt-1">
            {isStreaming ? stats.bitrate : '0 kbps'}
          </span>
        </div>

        {/* FPS */}
        <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80 flex flex-col">
          <span className="text-[10px] text-slate-400 flex items-center gap-1">
            <Activity className="w-3 h-3 text-emerald-400" /> Framerate
          </span>
          <span className="text-sm font-mono font-bold text-emerald-300 mt-1">
            {isStreaming ? `${Math.round(stats.fps)} FPS` : '0 FPS'}
          </span>
        </div>
      </div>

      {/* Main Broadcast Trigger Button */}
      <div>
        {!isStreaming ? (
          <button
            type="button"
            onClick={onStartStream}
            disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-xl font-bold text-sm tracking-wide uppercase transition-all duration-200 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-lg shadow-emerald-900/30 active:scale-[0.98] disabled:opacity-50"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>{isLoading ? 'Menghubungkan FFmpeg...' : 'MULAI LIVE STREAM'}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleStopClick}
            disabled={isLoading}
            className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm tracking-wide uppercase transition-all duration-200 flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] ${
              showConfirmStop
                ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse shadow-rose-900/50'
                : 'bg-slate-800 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60'
            }`}
          >
            <Square className="w-5 h-5 fill-current" />
            <span>{showConfirmStop ? 'KLIK SEKALI LAGI UNTUK STOP' : 'AKHIRI STREAM'}</span>
          </button>
        )}
      </div>

      {showConfirmStop && (
        <div className="flex items-center gap-1.5 text-xs text-rose-400 justify-center">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Konfirmasi untuk mengakhiri siaran langsung.</span>
        </div>
      )}
    </div>
  );
}
