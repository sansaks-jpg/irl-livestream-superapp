import React, { useState } from 'react';
import { Music, Volume2, Sparkles, Bell, PartyPopper, Zap, Laugh } from 'lucide-react';

export function Soundboard() {
  const [activeSound, setActiveSound] = useState(null);

  // Play synthesized SFX using Web Audio API
  const playSfx = (type) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      setActiveSound(type);

      setTimeout(() => setActiveSound(null), 800);

      if (type === 'horn') {
        // Airhorn style multi-tone brass
        const freqs = [311.13, 370, 415.3, 466.16];
        freqs.forEach(f => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(f, now);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.6);
        });
      } else if (type === 'coin') {
        // Mario coin style chime
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(987.77, now); // B5
        osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (type === 'ding') {
        // High alert ding
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1760, now); // A6
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.8);
      } else if (type === 'fail') {
        // Sad trombone drop
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(150, now + 0.6);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.6);
      } else if (type === 'applause') {
        // Noise burst applause / cheering
        const bufferSize = ctx.sampleRate * 0.8;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1000;
        filter.Q.value = 1.2;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(now);
        noise.stop(now + 0.8);
      }
    } catch (err) {
      console.warn('SFX Error:', err);
    }
  };

  const soundList = [
    { id: 'horn', name: 'Air Horn', icon: Zap, color: 'hover:text-amber-400' },
    { id: 'coin', name: 'Saweran Ding', icon: Sparkles, color: 'hover:text-yellow-400' },
    { id: 'applause', name: 'Tepuk Tangan', icon: PartyPopper, color: 'hover:text-emerald-400' },
    { id: 'ding', name: 'Notifikasi', icon: Bell, color: 'hover:text-blue-400' },
    { id: 'fail', name: 'Fail / Zonk', icon: Laugh, color: 'hover:text-rose-400' }
  ];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-lg flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 uppercase tracking-wider">
          <Music className="w-3.5 h-3.5 text-pink-400" />
          <span>IRL Soundboard Cepat</span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">No Copyright SFX</span>
      </div>

      <div className="grid grid-cols-5 gap-1.5">
        {soundList.map((snd) => {
          const IconComponent = snd.icon;
          const isPlaying = activeSound === snd.id;
          return (
            <button
              key={snd.id}
              type="button"
              onClick={() => playSfx(snd.id)}
              className={`p-2 rounded-lg bg-slate-950 border border-slate-800 flex flex-col items-center justify-center gap-1 transition ${
                isPlaying
                  ? 'border-indigo-500 bg-indigo-950/40 scale-95 shadow-md'
                  : 'hover:bg-slate-800/80 hover:border-slate-700'
              }`}
              title={`Mainkan suara ${snd.name}`}
            >
              <IconComponent className={`w-4 h-4 transition ${isPlaying ? 'text-indigo-400 animate-bounce' : snd.color}`} />
              <span className="text-[10px] font-medium text-slate-300 truncate max-w-full">
                {snd.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
