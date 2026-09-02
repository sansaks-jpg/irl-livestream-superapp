import React from 'react';
import { EyeOff, Radio, ShieldAlert, Sparkles } from 'lucide-react';

export function PrivacyOverlay({
  isActive = false,
  onToggle,
  privacyText = 'BRB - SINYAL GANGGUAN / PRIVACY SHIELD'
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 border shadow-md active:scale-95 ${
        isActive
          ? 'bg-amber-600 hover:bg-amber-500 text-slate-950 border-amber-400 animate-pulse shadow-amber-900/40'
          : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border-slate-700'
      }`}
      title="Sembunyikan kamera & auto-mute mic untuk menjaga privasi / sinyal drop"
    >
      <EyeOff className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-amber-400'}`} />
      <span>{isActive ? 'MATIKAN PRIVACY SHIELD' : 'PRIVACY / BRB SHIELD'}</span>
    </button>
  );
}

export function PrivacyScreen({
  privacyText = 'BRB - SINYAL GANGGUAN / SEGERA KEMBALI'
}) {
  return (
    <div className="absolute inset-0 z-30 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 select-none animate-in fade-in duration-300">
      <div className="relative mb-4">
        <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center animate-pulse">
          <ShieldAlert className="w-8 h-8 text-amber-400" />
        </div>
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
        </span>
      </div>

      <h2 className="text-xl font-extrabold tracking-wider text-amber-400 mb-2 font-mono">
        {privacyText}
      </h2>

      <p className="text-xs text-slate-400 max-w-sm">
        Siaran kamera dan mikrofon sedang dinonaktifkan sementara oleh streamer untuk keperluan privasi.
      </p>

      <div className="mt-4 flex items-center gap-2 px-3 py-1 bg-slate-900 rounded-full border border-slate-800 text-[11px] text-slate-400">
        <Radio className="w-3.5 h-3.5 text-amber-400 animate-spin" />
        <span>IRL Superapp Standby Protection Active</span>
      </div>
    </div>
  );
}
