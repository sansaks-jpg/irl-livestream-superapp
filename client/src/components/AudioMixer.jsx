import React from 'react';
import { Volume2, VolumeX, Shield, Mic, AlertCircle } from 'lucide-react';

export function AudioMixer({
  gain = 1.0,
  setGain,
  isMuted = false,
  toggleMute,
  limiterEnabled = true,
  toggleLimiter,
  vuLevel = 0,
  isClipping = false,
  inputLabel = 'Mikrofon'
}) {
  const dbValue = gain > 0 ? (20 * Math.log10(gain)).toFixed(1) : '-inf';

  return (
    <div className="bg-[#0f0f0f] border border-[#222222] rounded-xl p-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-[#aaaaaa]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[#f1f1f1]">
            Mixer Audio
          </span>
        </div>
        <span className="text-[11px] font-mono text-[#717171]">
          {inputLabel}
        </span>
      </div>

      {/* Segmented LED VU Meter */}
      <div className="bg-[#050505] p-3 rounded-lg border border-[#1f1f1f] space-y-1.5">
        <div className="flex justify-between items-center text-[10px] font-mono text-[#717171]">
          <span>-40dB</span>
          <span>-20dB</span>
          <span>-6dB</span>
          <span className={isClipping ? 'text-[#ef4444] font-bold' : 'text-[#717171]'}>
            0dB CLIP
          </span>
        </div>

        {/* Meter Track */}
        <div className="relative h-3 bg-[#181818] rounded-sm overflow-hidden flex">
          <div
            className={`h-full transition-all duration-75 ${
              isMuted
                ? 'bg-[#333333]'
                : vuLevel > 85
                ? 'bg-[#ef4444]'
                : vuLevel > 65
                ? 'bg-[#eab308]'
                : 'bg-[#22c55e]'
            }`}
            style={{ width: `${isMuted ? 0 : Math.min(100, vuLevel)}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-[11px] text-[#aaaaaa] font-mono pt-0.5">
          <span>Tingkat Sinyal</span>
          <span>{isMuted ? 'MUTE' : `${vuLevel}%`}</span>
        </div>
      </div>

      {/* Gain Fader */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-[#aaaaaa] font-medium">Gain Fader</span>
          <span className="font-mono font-semibold px-2 py-0.5 bg-[#181818] rounded border border-[#272727] text-[#f1f1f1]">
            {gain >= 1 ? `+${dbValue}` : dbValue} dB ({Math.round(gain * 100)}%)
          </span>
        </div>

        <input
          type="range"
          min="0"
          max="2.0"
          step="0.05"
          value={gain}
          onChange={(e) => setGain && setGain(parseFloat(e.target.value))}
          disabled={isMuted}
          className="w-full h-2 bg-[#181818] rounded appearance-none cursor-pointer accent-[#f1f1f1] disabled:opacity-30"
        />

        {/* Quick Fader Presets */}
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => setGain && setGain(1.0)}
            className="py-1 text-[11px] font-mono rounded bg-[#181818] hover:bg-[#252525] text-[#aaaaaa] hover:text-[#f1f1f1] transition border border-[#222222]"
          >
            0 dB (100%)
          </button>
          <button
            type="button"
            onClick={() => setGain && setGain(1.4)}
            className="py-1 text-[11px] font-mono rounded bg-[#181818] hover:bg-[#252525] text-[#aaaaaa] hover:text-[#f1f1f1] transition border border-[#222222]"
          >
            +3 dB
          </button>
          <button
            type="button"
            onClick={() => setGain && setGain(2.0)}
            className="py-1 text-[11px] font-mono rounded bg-[#181818] hover:bg-[#252525] text-[#aaaaaa] hover:text-[#f1f1f1] transition border border-[#222222]"
          >
            +6 dB
          </button>
        </div>
      </div>

      {/* Hardware Toggles: Mute & Limiter */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          type="button"
          onClick={toggleMute}
          className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition border ${
            isMuted
              ? 'bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]/40'
              : 'bg-[#181818] text-[#aaaaaa] hover:text-[#f1f1f1] border-[#252525]'
          }`}
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          <span>{isMuted ? 'Mic Muted' : 'Mute Mic'}</span>
        </button>

        <button
          type="button"
          onClick={toggleLimiter}
          className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition border ${
            limiterEnabled
              ? 'bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/30'
              : 'bg-[#181818] text-[#717171] border-[#252525]'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Limiter {limiterEnabled ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {isClipping && !isMuted && (
        <div className="flex items-center gap-1.5 text-[11px] text-[#ef4444] bg-[#ef4444]/10 p-2 rounded border border-[#ef4444]/20">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Audio clipping. Turunkan gain untuk menjaga kejernihan suara.</span>
        </div>
      )}
    </div>
  );
}
