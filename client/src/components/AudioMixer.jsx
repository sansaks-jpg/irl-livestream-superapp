import React, { useState } from 'react';
import { Volume2, VolumeX, Shield, Mic, AlertCircle, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react';

export function AudioMixer({
  gain = 1.0,
  setGain,
  isMuted = false,
  toggleMute,
  limiterEnabled = true,
  toggleLimiter,
  bass = 0,
  updateBass,
  mid = 0,
  updateMid,
  treble = 0,
  updateTreble,
  vuLevel = 0,
  isClipping = false,
  inputLabel = 'Mikrofon'
}) {
  const [showEq, setShowEq] = useState(false);
  const dbValue = gain > 0 ? (20 * Math.log10(gain)).toFixed(1) : '-inf';

  return (
    <div className="bg-[#0f0f0f] border border-[#222222] rounded-xl p-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-[#aaaaaa]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[#f1f1f1]">
            Mixer Audio Studio
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

      {/* Master Gain Fader */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-[#aaaaaa] font-medium">Master Gain Fader</span>
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

      {/* 3-Band Studio EQ Accordion */}
      <div className="border border-[#222222] rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setShowEq(!showEq)}
          className="w-full px-3 py-2 bg-[#141414] hover:bg-[#1a1a1a] flex items-center justify-between text-xs text-[#aaaaaa] hover:text-[#f1f1f1] transition"
        >
          <div className="flex items-center gap-1.5 font-medium">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>3-Band Studio Equalizer (EQ)</span>
          </div>
          {showEq ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showEq && (
          <div className="p-3 bg-[#0a0a0a] space-y-3 border-t border-[#222222]">
            {/* Bass */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-[#aaaaaa]">
                <span>Bass (150 Hz)</span>
                <span className="font-mono">{bass > 0 ? `+${bass}` : bass} dB</span>
              </div>
              <input
                type="range"
                min="-12"
                max="12"
                step="1"
                value={bass}
                onChange={(e) => updateBass && updateBass(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#222222] rounded appearance-none cursor-pointer accent-[#f1f1f1]"
              />
            </div>

            {/* Mid */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-[#aaaaaa]">
                <span>Vokal Mid (1.2 kHz)</span>
                <span className="font-mono">{mid > 0 ? `+${mid}` : mid} dB</span>
              </div>
              <input
                type="range"
                min="-12"
                max="12"
                step="1"
                value={mid}
                onChange={(e) => updateMid && updateMid(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#222222] rounded appearance-none cursor-pointer accent-[#f1f1f1]"
              />
            </div>

            {/* Treble */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-[#aaaaaa]">
                <span>Treble (6 kHz)</span>
                <span className="font-mono">{treble > 0 ? `+${treble}` : treble} dB</span>
              </div>
              <input
                type="range"
                min="-12"
                max="12"
                step="1"
                value={treble}
                onChange={(e) => updateTreble && updateTreble(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#222222] rounded appearance-none cursor-pointer accent-[#f1f1f1]"
              />
            </div>
          </div>
        )}
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
