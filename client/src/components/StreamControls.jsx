import React, { useState } from 'react';
import { Play, Square, AlertTriangle } from 'lucide-react';
import { formatUptime } from '../utils/format';

export function StreamControls({
  isStreaming = false,
  isMock = false,
  stats = { fps: 0, bitrate: '0 kbps', uptimeSeconds: 0, frame: 0 },
  onStartStream,
  onStopStream,
  isLoading = false
}) {
  const [showConfirmStop, setShowConfirmStop] = useState(false);

  const handleStopClick = () => {
    if (showConfirmStop) {
      setShowConfirmStop(false);
      if (onStopStream) {
        onStopStream();
      }
    } else {
      setShowConfirmStop(true);
      setTimeout(() => setShowConfirmStop(false), 5000);
    }
  };

  return (
    <div className="bg-[#0f0f0f] border border-[#222222] rounded-xl p-4 flex flex-col gap-4">
      {/* Broadcast Status Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${isStreaming ? 'bg-[#ef4444] animate-ping' : 'bg-[#555555]'}`} />
          <span className="text-xs font-bold uppercase tracking-wider text-[#f1f1f1]">
            {isStreaming ? 'Sedang Siaran' : 'Standby'}
          </span>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#181818] border border-[#272727] text-[#aaaaaa]">
          {isStreaming ? (isMock ? 'Mode Uji Coba' : 'YouTube RTMP') : 'Siap Siaran'}
        </span>
      </div>

      {/* Telemetry Stats Grid */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-[#050505] p-2.5 rounded-lg border border-[#1f1f1f]">
          <span className="text-[10px] text-[#717171] uppercase tracking-wider block">Durasi</span>
          <span className="text-sm font-mono font-bold text-[#f1f1f1] mt-0.5 block">
            {formatUptime(stats.uptimeSeconds)}
          </span>
        </div>

        <div className="bg-[#050505] p-2.5 rounded-lg border border-[#1f1f1f]">
          <span className="text-[10px] text-[#717171] uppercase tracking-wider block">Bitrate</span>
          <span className="text-sm font-mono font-bold text-[#f1f1f1] mt-0.5 block">
            {isStreaming ? stats.bitrate : '0 kbps'}
          </span>
        </div>

        <div className="bg-[#050505] p-2.5 rounded-lg border border-[#1f1f1f]">
          <span className="text-[10px] text-[#717171] uppercase tracking-wider block">FPS</span>
          <span className="text-sm font-mono font-bold text-[#f1f1f1] mt-0.5 block">
            {isStreaming ? `${Math.round(stats.fps)}` : '0'}
          </span>
        </div>
      </div>

      {/* Main Broadcast Action Button */}
      <div>
        {!isStreaming ? (
          <button
            type="button"
            onClick={onStartStream}
            disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-xl font-bold text-sm tracking-wider uppercase transition flex items-center justify-center gap-2 bg-[#cc0000] hover:bg-[#b30000] text-white active:scale-[0.98] disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{isLoading ? 'Menghubungkan...' : 'Mulai Siaran'}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleStopClick}
            disabled={isLoading}
            className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm tracking-wider uppercase transition flex items-center justify-center gap-2 active:scale-[0.98] ${
              showConfirmStop
                ? 'bg-[#cc0000] text-white animate-pulse'
                : 'bg-[#181818] hover:bg-[#252525] text-[#ef4444] border border-[#333333]'
            }`}
          >
            <Square className="w-4 h-4 fill-current" />
            <span>{showConfirmStop ? 'Konfirmasi Akhiri Siaran' : 'Akhiri Siaran'}</span>
          </button>
        )}
      </div>

      {showConfirmStop && (
        <div className="flex items-center gap-1.5 text-xs text-[#ef4444] justify-center">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Klik sekali lagi untuk mengakhiri live stream.</span>
        </div>
      )}
    </div>
  );
}
