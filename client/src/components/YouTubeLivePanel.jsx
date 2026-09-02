import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Users, 
  ThumbsUp, 
  Volume2, 
  VolumeX, 
  Send, 
  Sparkles, 
  Trash2, 
  PlayCircle, 
  StopCircle,
  Radio
} from 'lucide-react';

export function YouTubeLivePanel({
  socket,
  initialStats = { viewerCount: 0, likes: 0, isSimulating: false, videoId: '' }
}) {
  const [messages, setMessages] = useState([]);
  const [stats, setStats] = useState(initialStats);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [ttsVolume, setTtsVolume] = useState(1.0);
  const [inputText, setInputText] = useState('');
  const [authorName, setAuthorName] = useState('Host');
  const [autoScroll, setAutoScroll] = useState(true);

  const chatContainerRef = useRef(null);
  const ttsQueueRef = useRef([]);
  const isSpeakingRef = useRef(false);

  // Sync incoming socket events
  useEffect(() => {
    if (!socket) return;

    const handleChat = (chatItem) => {
      setMessages((prev) => [...prev.slice(-150), chatItem]); // Keep max 150
      // Queue for TTS if enabled
      if (ttsEnabled && !chatItem.message.startsWith('!')) {
        speakMessage(chatItem);
      }
    };

    const handleStats = (newStats) => {
      setStats((prev) => ({ ...prev, ...newStats }));
    };

    socket.on('yt-chat', handleChat);
    socket.on('yt-stats', handleStats);

    return () => {
      socket.off('yt-chat', handleChat);
      socket.off('yt-stats', handleStats);
    };
  }, [socket, ttsEnabled]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (autoScroll && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  // Text-To-Speech implementation using Web Speech API
  const speakMessage = (chatItem) => {
    if (!('speechSynthesis' in window)) return;

    const textToSpeak = `${chatItem.author} berkata: ${chatItem.message}`;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.volume = ttsVolume;
    utterance.rate = 1.05; // slightly faster for live streaming
    utterance.pitch = 1.0;

    // Pick Indonesian voice if available
    const voices = window.speechSynthesis.getVoices();
    const indonesianVoice = voices.find(v => v.lang.includes('id') || v.lang.includes('ID'));
    if (indonesianVoice) {
      utterance.voice = indonesianVoice;
    }

    utterance.onend = () => {
      isSpeakingRef.current = false;
      if (ttsQueueRef.current.length > 0) {
        const next = ttsQueueRef.current.shift();
        speakMessage(next);
      }
    };

    if (window.speechSynthesis.speaking) {
      ttsQueueRef.current.push(chatItem);
    } else {
      isSpeakingRef.current = true;
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleSimulation = async () => {
    try {
      const res = await fetch('/api/youtube/toggle-simulation', { method: 'POST' });
      const data = await res.json();
      setStats(prev => ({ ...prev, isSimulating: data.isSimulating }));
    } catch (err) {
      console.error('Failed to toggle simulation:', err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    try {
      await fetch('/api/youtube/send-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: authorName, message: inputText })
      });
      setInputText('');
    } catch (err) {
      console.error('Failed to send chat:', err);
    }
  };

  const clearChat = () => {
    setMessages([]);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      ttsQueueRef.current = [];
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col h-[520px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-rose-500" />
          <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-200">
            YouTube Live Chat & Monitor
          </h3>
        </div>

        {/* Live Counters */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono text-slate-200">
            <Users className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            <span className="font-bold">{stats.viewerCount.toLocaleString()}</span>
            <span className="text-[10px] text-slate-400">viewers</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono text-slate-200">
            <ThumbsUp className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-bold">{stats.likes.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* IRL Streamer Toolbar: TTS & Simulation Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs border-b border-slate-800/80">
        {/* TTS Toggle */}
        <button
          type="button"
          onClick={() => {
            const next = !ttsEnabled;
            setTtsEnabled(next);
            if (!next && 'speechSynthesis' in window) {
              window.speechSynthesis.cancel();
            }
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition ${
            ttsEnabled
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50'
              : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
          }`}
          title="Membaca isi chat otomatis ke earphone streamer"
        >
          {ttsEnabled ? <Volume2 className="w-3.5 h-3.5 text-rose-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
          <span>TTS Earphone {ttsEnabled ? 'AKTIF' : 'OFF'}</span>
        </button>

        {/* Simulation Mode Toggle */}
        <button
          type="button"
          onClick={toggleSimulation}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition ${
            stats.isSimulating
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
              : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
          }`}
          title="Aktifkan simulasi chat & saweran untuk mengetes panel"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{stats.isSimulating ? 'Stop Simulasi' : 'Tes Simulasi Chat'}</span>
        </button>

        {/* Clear Chat */}
        <button
          type="button"
          onClick={clearChat}
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
          title="Bersihkan layar chat"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Chat Messages Scroll Area */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto space-y-2 p-2 my-2 bg-slate-950/60 rounded-lg border border-slate-800/60 font-sans text-xs"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
            <Radio className="w-8 h-8 opacity-40 animate-pulse" />
            <p className="text-center text-xs">Belum ada chat. Klik "Tes Simulasi Chat" atau hubungkan YouTube Live ID di Settings.</p>
          </div>
        ) : (
          messages.map((item) => (
            <div
              key={item.id}
              className={`p-2 rounded-lg border transition ${
                item.badge === 'donor'
                  ? 'bg-amber-950/40 border-amber-500/40 text-amber-100 shadow-sm'
                  : item.badge === 'mod'
                  ? 'bg-blue-950/30 border-blue-500/30 text-slate-200'
                  : item.badge === 'streamer'
                  ? 'bg-indigo-950/40 border-indigo-500/40 text-indigo-100'
                  : 'bg-slate-900/60 border-slate-800/60 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                {item.avatar && (
                  <img
                    src={item.avatar}
                    alt={item.author}
                    className="w-4 h-4 rounded-full bg-slate-800"
                  />
                )}
                <span className="font-semibold text-slate-200">{item.author}</span>

                {/* Badges */}
                {item.badge === 'donor' && (
                  <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-amber-500 text-slate-950">
                    SAWERAN
                  </span>
                )}
                {item.badge === 'mod' && (
                  <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-blue-500 text-slate-950">
                    MOD
                  </span>
                )}
                {item.badge === 'member' && (
                  <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-emerald-500 text-slate-950">
                    MEMBER
                  </span>
                )}

                <span className="ml-auto text-[10px] text-slate-500">{item.timestamp}</span>
              </div>

              {/* SuperChat Donation Amount */}
              {item.superChat && (
                <div className="text-[11px] font-bold text-amber-400 mb-1">
                  Saweran: {item.superChat.amount}
                </div>
              )}

              <p className="text-slate-200 break-words leading-relaxed">{item.message}</p>
            </div>
          ))
        )}
      </div>

      {/* Send Chat Bar */}
      <form onSubmit={handleSendMessage} className="flex gap-2 pt-1 border-t border-slate-800">
        <input
          type="text"
          placeholder="Ketik pesan live chat..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500"
        />
        <button
          type="submit"
          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-medium flex items-center gap-1 transition"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Kirim</span>
        </button>
      </form>
    </div>
  );
}
