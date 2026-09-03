import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare } from 'lucide-react';

export function YouTubeLivePanel({
  socket,
  videoId = '',
  channelHandle = '',
  messages: controlledMessages,
  onMessagesChange
}) {
  // Uncontrolled fallback so the panel also works standalone.
  const [internalMessages, setInternalMessages] = useState([]);
  const messages = controlledMessages ?? internalMessages;
  const setMessages = onMessagesChange ?? setInternalMessages;

  const [socketVideoId, setSocketVideoId] = useState(null);
  const activeVideoId = videoId || socketVideoId;
  const [useOfficialEmbed, setUseOfficialEmbed] = useState(false);
  const chatContainerRef = useRef(null);

  // Sync incoming live chat from socket
  useEffect(() => {
    if (!socket) return;

    const handleChat = (chatItem) => {
      setMessages((prev) => [...prev.slice(-120), chatItem]);
    };

    const handleYtStats = (data) => {
      if (data.videoId) setSocketVideoId(data.videoId);
    };

    socket.on('yt-chat', handleChat);
    socket.on('yt-stats', handleYtStats);

    return () => {
      socket.off('yt-chat', handleChat);
      socket.off('yt-stats', handleYtStats);
    };
  }, [socket, setMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Embed URL for official YouTube Pop-out Live Chat
  const embedDomain = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const embedUrl = activeVideoId 
    ? `https://www.youtube.com/live_chat?v=${activeVideoId}&embed_domain=${embedDomain}`
    : null;

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] w-full bg-[#0f0f0f] rounded-xl overflow-hidden border border-[#222222]">
      {/* YouTube Live Chat Official Style Header */}
      <div className="h-11 px-4 bg-[#0f0f0f] border-b border-[#272727] flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-medium text-[#f1f1f1] tracking-tight">
            Live chat
          </span>
          {activeVideoId && (
            <span className="w-2 h-2 rounded-full bg-[#cc0000] animate-pulse" />
          )}
        </div>

        <div className="flex items-center gap-2">
          {embedUrl && (
            <button
              type="button"
              onClick={() => setUseOfficialEmbed(!useOfficialEmbed)}
              className="px-2.5 py-1 text-[11px] font-medium rounded text-[#aaaaaa] hover:text-[#f1f1f1] hover:bg-[#222222] transition"
            >
              {useOfficialEmbed ? 'Mode Stream' : 'Bawaan YouTube'}
            </button>
          )}
        </div>
      </div>

      {/* Official YouTube Embed Option */}
      {useOfficialEmbed && embedUrl ? (
        <iframe
          src={embedUrl}
          title="YouTube Live Chat"
          className="w-full flex-1 border-0 bg-[#0f0f0f]"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      ) : (
        /* Pure 1:1 YouTube Native Chat Feed */
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto px-3 py-2 space-y-1 bg-[#0f0f0f] text-[13px] font-sans selection:bg-[#333333]"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[#717171] text-center p-6 space-y-2">
              <MessageSquare className="w-8 h-8 opacity-30 stroke-1" />
              <p className="text-xs text-[#aaaaaa]">
                {channelHandle
                  ? `Menunggu pesan chat dari ${channelHandle}...`
                  : 'Menunggu live chat...'}
              </p>
            </div>
          ) : (
            messages.map((item) => {
              const isSuperChat = item.superChat || item.badge === 'donor';

              if (isSuperChat) {
                // Official YouTube Super Chat Card
                const amount = item.superChat?.amount || 'Rp 25.000';
                return (
                  <div
                    key={item.id}
                    className="my-1.5 rounded-lg overflow-hidden border border-[#ffb300]/40 shadow-sm"
                  >
                    {/* Header Bar */}
                    <div className="bg-[#e65100] px-3 py-2 flex items-center justify-between text-white">
                      <div className="flex items-center gap-2">
                        {item.avatar && (
                          <img
                            src={item.avatar}
                            alt=""
                            className="w-6 h-6 rounded-full bg-[#333]"
                          />
                        )}
                        <span className="font-semibold text-xs text-white">
                          {item.author}
                        </span>
                      </div>
                      <span className="font-bold text-xs">{amount}</span>
                    </div>
                    {/* Body */}
                    <div className="bg-[#f57c00] px-3 py-2 text-white text-xs leading-relaxed">
                      {item.message}
                    </div>
                  </div>
                );
              }

              // Standard YouTube Live Message Row
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-2 py-1 px-1 rounded hover:bg-[#1a1a1a] transition-colors leading-[18px]"
                >
                  {/* Circular Avatar */}
                  {item.avatar ? (
                    <img
                      src={item.avatar}
                      alt=""
                      className="w-6 h-6 rounded-full shrink-0 mt-0.5 bg-[#222]"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-[#272727] shrink-0 mt-0.5" />
                  )}

                  {/* Content line */}
                  <div className="flex-1 break-words">
                    {/* Author Name */}
                    <span className="font-medium text-[#aaaaaa] mr-2 inline-flex items-center gap-1">
                      {item.author}
                      {item.badge === 'mod' && (
                        <span className="text-[10px] text-[#3ea6ff] font-bold">MOD</span>
                      )}
                      {item.badge === 'member' && (
                        <span className="text-[10px] text-[#2ba640] font-bold">MEMBER</span>
                      )}
                    </span>

                    {/* Message Body */}
                    <span className="text-[#f1f1f1] font-normal">
                      {item.message}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
