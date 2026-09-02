import React from 'react';
import { EyeOff, Radio } from 'lucide-react';

export function PrivacyOverlay({
  isActive = false,
  onToggle,
  privacyText = 'STANDBY'
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition border ${
        isActive
          ? 'bg-[#eab308]/20 text-[#eab308] border-[#eab308]/40'
          : 'bg-[#181818] text-[#aaaaaa] hover:text-[#f1f1f1] border-[#252525]'
      }`}
    >
      <EyeOff className="w-3.5 h-3.5" />
      <span>{isActive ? 'Layar Dijeda' : 'Jeda Layar'}</span>
    </button>
  );
}

export function PrivacyScreen({
  privacyText = 'STANDBY'
}) {
  return (
    <div className="absolute inset-0 z-30 bg-black/95 flex flex-col items-center justify-center text-center p-6 select-none animate-in fade-in duration-200">
      <div className="w-3 h-3 rounded-full bg-[#eab308] mb-3 animate-pulse" />
      <h2 className="text-lg font-bold tracking-widest text-[#f1f1f1] uppercase font-mono mb-1">
        {privacyText || 'STANDBY'}
      </h2>
      <span className="text-xs text-[#717171]">
        Siaran kamera dan audio dijeda sementara.
      </span>
    </div>
  );
}
