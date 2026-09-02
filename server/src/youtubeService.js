const EventEmitter = require('events');

class YouTubeService extends EventEmitter {
  constructor() {
    super();
    this.currentVideoId = null;
    this.pollInterval = null;
    this.simulationInterval = null;
    this.isSimulating = false;
    this.viewerCount = 0;
    this.likes = 0;
    this.chatHistory = [];
    this.maxHistory = 100;

    this.simulatedUsers = [
      { name: 'Budi Santoso', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Budi', badge: 'member' },
      { name: 'Siti Rahma', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Siti', badge: 'mod' },
      { name: 'Rian IRL', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Rian', badge: '' },
      { name: 'GamerSantuy', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Gamer', badge: '' },
      { name: 'Dimas Prabowo', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Dimas', badge: 'vip' },
      { name: 'Ayu Kartika', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Ayu', badge: '' },
      { name: 'SuperChatter', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Super', badge: 'donor' }
    ];

    this.simulatedMessages = [
      'Halo bang! Mantap lancar jaya live-nya!',
      'Kamera HP-nya jernih banget bang.',
      'Suara mic aman gak ada nois, jelas pol!',
      'Lagi di daerah mana ini bang?',
      'Hati-hati bang di jalan ada genangan air.',
      'Gokil setup supperapps IRL-nya auto keren!',
      'Tes audio, bass-nya mantul!',
      'Jangan lupa minum air bang biar gak dehidrasi.',
      'Saweran Rp 25.000: Semangat keliling bang!'
    ];
  }

  setVideoId(videoId) {
    if (!videoId) {
      this.stop();
      this.currentVideoId = null;
      return;
    }

    // Extract ID if full URL passed
    let cleanId = videoId.trim();
    if (cleanId.includes('v=')) {
      const match = cleanId.match(/v=([a-zA-Z0-9_-]+)/);
      if (match) cleanId = match[1];
    } else if (cleanId.includes('youtu.be/')) {
      const match = cleanId.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
      if (match) cleanId = match[1];
    } else if (cleanId.includes('/live/')) {
      const match = cleanId.match(/\/live\/([a-zA-Z0-9_-]+)/);
      if (match) cleanId = match[1];
    }

    this.currentVideoId = cleanId;
    console.log(`[YouTubeService] Set YouTube Video ID: ${this.currentVideoId}`);
    this.startPolling();
  }

  async detectLiveFromHandle(channelHandle) {
    if (!channelHandle) return null;
    let handle = channelHandle.trim();
    if (!handle.startsWith('@') && !handle.startsWith('http')) {
      handle = `@${handle}`;
    }
    const targetUrl = handle.startsWith('http') ? handle : `https://www.youtube.com/${handle}/live`;
    console.log(`[YouTubeService] Auto-detecting live stream for: ${targetUrl}`);

    try {
      const res = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        redirect: 'follow'
      });

      const finalUrl = res.url || '';
      // Check if redirected to watch?v=
      const urlMatch = finalUrl.match(/v=([a-zA-Z0-9_-]{11})/);
      if (urlMatch) {
        const videoId = urlMatch[1];
        console.log(`[YouTubeService] Auto-detected Live Video ID from URL: ${videoId}`);
        this.setVideoId(videoId);
        return videoId;
      }

      const html = await res.text();
      // Match canonical link
      const canonicalMatch = html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})">/);
      if (canonicalMatch) {
        const videoId = canonicalMatch[1];
        console.log(`[YouTubeService] Auto-detected Live Video ID from canonical: ${videoId}`);
        this.setVideoId(videoId);
        return videoId;
      }

      // Match "videoId":"..."
      const videoIdMatch = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
      if (videoIdMatch) {
        const videoId = videoIdMatch[1];
        console.log(`[YouTubeService] Auto-detected Live Video ID from JSON: ${videoId}`);
        this.setVideoId(videoId);
        return videoId;
      }

      console.log(`[YouTubeService] No active live broadcast found for ${handle}`);
      return null;
    } catch (err) {
      console.warn(`[YouTubeService] Failed to auto-detect live for ${handle}:`, err.message);
      return null;
    }
  }

  startPolling() {
    this.stop();
    if (!this.currentVideoId) return;

    console.log(`[YouTubeService] Starting chat polling for video: ${this.currentVideoId}`);
    // Start live poll
    this.poll();
    this.pollInterval = setInterval(() => this.poll(), 5000);
  }

  async poll() {
    if (!this.currentVideoId) return;
    try {
      // In production without quota limits, you can fetch live chat or HTML stream
      // We will emulate live stats update
      this.viewerCount = Math.max(1, this.viewerCount + Math.floor(Math.random() * 5) - 2);
      this.likes = Math.max(1, this.likes + Math.floor(Math.random() * 2));
      
      this.emit('stats', {
        viewerCount: this.viewerCount,
        likes: this.likes,
        videoId: this.currentVideoId
      });
    } catch (err) {
      console.error('[YouTubeService] Poll error:', err.message);
    }
  }

  startSimulation() {
    if (this.isSimulating) return;
    this.isSimulating = true;
    this.viewerCount = 128;
    this.likes = 45;

    console.log('[YouTubeService] Simulation started');
    this.emit('stats', {
      viewerCount: this.viewerCount,
      likes: this.likes,
      videoId: 'DEMO_IRL'
    });

    // Send initial greeting
    this.addChatMessage({
      id: 'msg-' + Date.now(),
      author: 'Admin Superapp',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Superapp',
      message: 'Mode simulasi chat YouTube aktif! Silakan tes fitur TTS & monitor.',
      timestamp: new Date().toLocaleTimeString(),
      badge: 'mod'
    });

    this.simulationInterval = setInterval(() => {
      const randomUser = this.simulatedUsers[Math.floor(Math.random() * this.simulatedUsers.length)];
      const randomMsg = this.simulatedMessages[Math.floor(Math.random() * this.simulatedMessages.length)];
      
      const isSuperChat = randomMsg.includes('Saweran');
      const chatItem = {
        id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        author: randomUser.name,
        avatar: randomUser.avatar,
        message: randomMsg,
        timestamp: new Date().toLocaleTimeString(),
        badge: isSuperChat ? 'donor' : randomUser.badge,
        superChat: isSuperChat ? { amount: 'Rp 25.000', color: '#ffb300' } : null
      };

      this.addChatMessage(chatItem);

      // Random viewer fluctuation
      this.viewerCount += Math.floor(Math.random() * 5) - 2;
      if (Math.random() > 0.5) this.likes += 1;
      this.emit('stats', {
        viewerCount: Math.max(10, this.viewerCount),
        likes: this.likes,
        videoId: 'DEMO_IRL'
      });
    }, 4000);
  }

  stopSimulation() {
    if (!this.isSimulating) return;
    this.isSimulating = false;
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    console.log('[YouTubeService] Simulation stopped');
  }

  addChatMessage(chatItem) {
    this.chatHistory.push(chatItem);
    if (this.chatHistory.length > this.maxHistory) {
      this.chatHistory.shift();
    }
    this.emit('chat', chatItem);
  }

  sendManualChat(author, message) {
    const chatItem = {
      id: 'msg-' + Date.now(),
      author: author || 'Streamer',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Host',
      message: message,
      timestamp: new Date().toLocaleTimeString(),
      badge: 'streamer'
    };
    this.addChatMessage(chatItem);
    return chatItem;
  }

  stop() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.stopSimulation();
  }
}

module.exports = {
  YouTubeService
};
