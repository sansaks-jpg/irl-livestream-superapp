import React from 'react';
import { Volume2, VolumeX, Shield, Sliders, Mic, AlertCircle } from 'lucide-react';

export function AudioMixer({
  gain = 1.0,
  setGain,
  isMuted = false,
  toggleMute,
  limiterEnabled = true,
  toggleLimiter,
  vuLevel = 0,
  isClipping = false,
  inputLabel = 'Kamera Audio / Mic'
}) {
  // Convert linear gain to approx dB
  const dbValue = gain > 0 ? (20 * Math.log10(gain)).toFixed(1) : '-inf';

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-indigo-400" />
          <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-200">
            Audio Gain & Level Mixer
          </h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Mic className="w-3.5 h-3.5 text-emerald-400" /> {inputLabel}
          </span>
        </div>
      </div>

      {/* Stereo VU Meter */}
      <div className="space-y-1 bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
        <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
          <span>-40dB</span>
          <span>-20dB</span>
          <span>-6dB</span>
          <span className={isClipping ? 'text-rose-500 font-bold animate-pulse' : 'text-slate-500'}>
            CLIP 0dB
          </span>
        </div>

        {/* L/R Meter Bar */}
        <div className="relative h-4 bg-slate-900 rounded overflow-hidden flex">
          <div
            className={`h-full transition-all duration-75 ${
              isMuted
                ? 'bg-slate-700'
                : vuLevel > 85
                ? 'bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500'
                : vuLevel > 60
                ? 'bg-gradient-to-r from-emerald-500 to-amber-400'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${isMuted ? 0 : vuLevel}%` }}
          />

          {/* Peak Indicator line */}
          {!isMuted && vuLevel > 5 && (
            <div
              className="absolute top-0 bottom-0 w-1 bg-white opacity-80"
              style={{ left: `${Math.min(99, vuLevel)}%` }}
            />
          )}
        </div>

        <div className="flex justify-between items-center text-[11px] pt-0.5">
          <span className="text-slate-400">Level Input</span>
          <span className="font-mono text-slate-200 font-semibold">
            {isMuted ? 'MUTED' : `${vuLevel}%`}
          </span>
        </div>
      </div>

      {/* Gain Slider & Value */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
            Level Gain (Volume Boost)
          </label>
          <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-indigo-300">
            {Math.round(gain * 100)}% ({gain >= 1 ? `+${dbValue}` : `${dbValue}`} dB)
          </span>
        </div>

        <input
          type="range"
          min="0"
          max="2.5"
          step="0.05"
          value={gain}
          onChange={(e) => setGain && setGain(parseFloat(e.target.value))}
          disabled={isMuted}
          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 disabled:opacity-40"
        />

        {/* Quick Gain Presets */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => setGain && setGain(0.7)}
            className="flex-1 py-1 text-[11px] rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition"
          >
            Pelan (70%)
          </button>
          <button
            type="button"
            onClick={() => setGain && setGain(1.0)}
            className="flex-1 py-1 text-[11px] rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition"
          >
            Normal (100%)
          </button>
          <button
            type="button"
            onClick={() => setGain && setGain(1.5)}
            className="flex-1 py-1 text-[11px] rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition"
          >
            Boost (+3.5dB)
          </button>
          <button
            type="button"
            onClick={() => setGain && setGain(2.0)}
            className="flex-1 py-1 text-[11px] rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition"
          >
            Max (+6dB)
          </button>
        </div>
      </div>

      {/* Action Buttons: Mute & Limiter */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        {/* Mute Toggle */}
        <button
          type="button"
          onClick={toggleMute}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-medium text-xs transition ${
            isMuted
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 hover:bg-rose-500/30'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
          }`}
        >
          {isMuted ? (
            <>
              <VolumeX className="w-4 h-4 text-rose-400" />
              <span>Mic Ter-MUTE</span>
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4 text-emerald-400" />
              <span>Mic Aktif</span>
            </>
          )}
        </button>

        {/* Dynamic Limiter Toggle */}
        <button
          type="button"
          onClick={toggleLimiter}
          title="Mencegah suara pecah/pekak akibat teriakan atau klakson di jalan"
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-medium text-xs transition ${
            limiterEnabled
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/50 hover:bg-indigo-500/30'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
          }`}
        >
          <Shield className={`w-4 h-4 ${limiterEnabled ? 'text-indigo-400' : 'text-slate-500'}`} />
          <span>Limiter Anti-Pecah {limiterEnabled ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {isClipping && !isMuted && (
        <div className="flex items-center gap-1.5 text-[11px] text-rose-400 bg-rose-950/40 p-1.5 rounded border border-rose-900/50">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Peringatan: Level audio terlalu tinggi (Clipping)! Turunkan gain.</span>
        </div>
      )}
    </div>
  );
}
