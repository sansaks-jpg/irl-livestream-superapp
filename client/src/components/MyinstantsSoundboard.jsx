import React, { useState } from 'react';
import { Sparkles, Music, Volume2 } from 'lucide-react';

const VIRAL_SOUNDS = [
  { id: 'boom', name: 'Vine Boom', url: 'https://www.myinstants.com/media/sounds/vine-boom.mp3', tag: 'Meme' },
  { id: 'bruh', name: 'Bruh', url: 'https://www.myinstants.com/media/sounds/bruh.mp3', tag: 'Meme' },
  { id: 'wow', name: 'Anime Wow', url: 'https://www.myinstants.com/media/sounds/anime-wow-sound-effect.mp3', tag: 'Anime' },
  { id: 'metal', name: 'Metal Pipe', url: 'https://www.myinstants.com/media/sounds/metal-pipe-falling-sound-effect.mp3', tag: 'Meme' },
  { id: 'discord', name: 'Discord Ping', url: 'https://www.myinstants.com/media/sounds/discord-notification.mp3', tag: 'SFX' },
  { id: 'horn', name: 'Air Horn', url: 'https://www.myinstants.com/media/sounds/air-horn-club-sample_1.mp3', tag: 'Hype' },
  { id: 'sad', name: 'Sad Violin', url: 'https://www.myinstants.com/media/sounds/sad-violin.mp3', tag: 'Drama' },
  { id: 'fbi', name: 'FBI Open Up', url: 'https://www.myinstants.com/media/sounds/fbi-open-up_mH4en7L.mp3', tag: 'Meme' },
  { id: 'levelup', name: 'Level Up', url: 'https://www.myinstants.com/media/sounds/level-up-sound-effect.mp3', tag: 'Game' },
  { id: 'dundun', name: 'Dun Dun Dun', url: 'https://www.myinstants.com/media/sounds/dun-dun-dunnn.mp3', tag: 'Drama' },
  { id: 'quack', name: 'Bebek Quack', url: 'https://www.myinstants.com/media/sounds/quack_5.mp3', tag: 'Funny' },
  { id: 'badum', name: 'Ba-Dum Tss', url: 'https://www.myinstants.com/media/sounds/ba-dum-tss.mp3', tag: 'Punch' }
];

export function MyinstantsSoundboard({ onPlaySound }) {
  const [activeId, setActiveId] = useState(null);

  const handlePlay = (sound) => {
    setActiveId(sound.id);
    setTimeout(() => setActiveId(null), 600);

    if (onPlaySound) {
      onPlaySound(sound.url);
    } else {
      const audio = new Audio(sound.url);
      audio.play().catch(() => {});
    }
  };

  return (
    <div className="bg-[#0f0f0f] border border-[#222222] rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#f1f1f1] flex items-center gap-1.5">
          <Music className="w-3.5 h-3.5 text-[#aaaaaa]" />
          <span>Soundboard Myinstants</span>
        </span>
        <span className="text-[10px] text-[#717171] font-mono">Masuk ke audio live stream</span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {VIRAL_SOUNDS.map((snd) => {
          const isPlaying = activeId === snd.id;
          return (
            <button
              key={snd.id}
              type="button"
              onClick={() => handlePlay(snd)}
              className={`p-2 rounded-lg border text-left flex flex-col justify-between h-14 transition active:scale-95 ${
                isPlaying
                  ? 'bg-[#222222] border-[#f1f1f1] text-white'
                  : 'bg-[#141414] hover:bg-[#1c1c1c] border-[#222222] text-[#cccccc]'
              }`}
            >
              <span className="text-[11px] font-medium leading-tight line-clamp-2">
                {snd.name}
              </span>
              <span className="text-[9px] text-[#717171] uppercase tracking-wider font-mono">
                {snd.tag}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
