const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const os = require('os');
const { ConfigManager } = require('./configManager');
const { StreamManager } = require('./streamManager');
const { YouTubeService } = require('./youtubeService');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  maxHttpBufferSize: 1e8 // 100MB for media chunks
});

const configManager = new ConfigManager();
const streamManager = new StreamManager(configManager);
const youtubeService = new YouTubeService();

app.use(cors());
app.use(express.json());

// Helper: Get local network IPs
function getLocalNetworkIPs() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    // Exclude virtual/host-only/vpn adapters
    const lower = name.toLowerCase();
    if (lower.includes('virtual') || lower.includes('vethernet') || lower.includes('wg-') || lower.includes('openvpn')) {
      continue;
    }
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        // Exclude virtualbox default host-only 192.168.56.x
        if (iface.address.startsWith('192.168.56.')) continue;
        addresses.push({ name, address: iface.address });
      }
    }
  }
  // Prioritize Wi-Fi or WLAN
  const primary = addresses.find(a => 
    a.name.toLowerCase().includes('wi-fi') || 
    a.name.toLowerCase().includes('wlan') ||
    a.name.toLowerCase().includes('wireless')
  ) || addresses.find(a => a.name.toLowerCase().includes('ethernet')) || addresses[0] || { address: 'localhost', name: 'loopback' };

  return {
    primaryIp: primary.address,
    allIps: addresses
  };
}

// REST Endpoints
app.get('/api/network-info', (req, res) => {
  const net = getLocalNetworkIPs();
  const port = process.env.PORT || 5000;
  const clientPort = 3000; // Vite dev port
  res.json({
    success: true,
    primaryIp: net.primaryIp,
    allIps: net.allIps,
    serverPort: port,
    camUrlDev: `http://${net.primaryIp}:${clientPort}/cam`,
    camUrlProd: `http://${net.primaryIp}:${port}/cam`
  });
});

app.get('/api/config', (req, res) => {
  res.json({
    success: true,
    config: configManager.getSanitized()
  });
});

app.post('/api/config', (req, res) => {
  try {
    const updated = configManager.save(req.body);
    // If youtubeVideoId changed, update YouTube service
    if (req.body.youtubeVideoId !== undefined) {
      youtubeService.setVideoId(req.body.youtubeVideoId);
    }
    res.json({
      success: true,
      config: configManager.getSanitized()
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/stream/status', (req, res) => {
  res.json({
    success: true,
    ...streamManager.getStatus()
  });
});

app.post('/api/stream/start', (req, res) => {
  try {
    const result = streamManager.startStream(req.body || {});
    io.emit('stream-status', { isStreaming: true, isMock: result.isMock });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/stream/stop', (req, res) => {
  try {
    const result = streamManager.stopStream();
    io.emit('stream-status', { isStreaming: false });
    res.json({ success: true, stopped: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/youtube/auto-detect', async (req, res) => {
  const channel = req.query.channel || configManager.get('youtubeChannel');
  if (!channel) {
    return res.status(400).json({ success: false, error: 'Channel handle tidak disertakan' });
  }
  const videoId = await youtubeService.detectLiveFromHandle(channel);
  if (videoId) {
    configManager.save({ youtubeVideoId: videoId });
    io.emit('yt-stats', { videoId, isLive: true });
    return res.json({ success: true, videoId, isLive: true });
  }
  res.json({ success: true, videoId: null, isLive: false, message: 'Belum ada live stream aktif di channel ini' });
});

app.post('/api/youtube/set-video', (req, res) => {
  const { videoId } = req.body;
  youtubeService.setVideoId(videoId);
  res.json({ success: true, videoId: youtubeService.currentVideoId });
});

app.post('/api/youtube/toggle-simulation', (req, res) => {
  if (youtubeService.isSimulating) {
    youtubeService.stopSimulation();
  } else {
    youtubeService.startSimulation();
  }
  res.json({ success: true, isSimulating: youtubeService.isSimulating });
});

app.post('/api/youtube/send-chat', (req, res) => {
  const { author, message } = req.body;
  if (!message) {
    return res.status(400).json({ success: false, error: 'Pesan tidak boleh kosong' });
  }
  const chatItem = youtubeService.sendManualChat(author, message);
  res.json({ success: true, chat: chatItem });
});

// Serve frontend static files if client/dist exists
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDist));
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    return next();
  }
  const indexPath = path.join(clientDist, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(200).send('IRL Stream Hub API Server is running. Launch Vite dev server on port 3000 for frontend, or run npm run build in client.');
    }
  });
});

// StreamManager Events forward to Socket.IO
streamManager.on('started', (data) => {
  io.emit('stream-status', { isStreaming: true, ...data });
});

streamManager.on('stopped', (data) => {
  io.emit('stream-status', { isStreaming: false, ...data });
});

streamManager.on('stats', (stats) => {
  io.emit('stream-stats', stats);
});

streamManager.on('error', (err) => {
  io.emit('stream-error', { message: err.message });
});

// YouTube Service Events forward to Socket.IO
youtubeService.on('chat', (chatItem) => {
  io.emit('yt-chat', chatItem);
});

youtubeService.on('stats', (stats) => {
  io.emit('yt-stats', stats);
});

// Socket.IO Connection & WebRTC Signaling
const rooms = new Map(); // roomName -> Set of socket IDs

io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  // Send current state
  socket.emit('stream-status', streamManager.getStatus());
  socket.emit('yt-stats', {
    viewerCount: youtubeService.viewerCount,
    likes: youtubeService.likes,
    isSimulating: youtubeService.isSimulating,
    videoId: youtubeService.currentVideoId
  });

  // Room Join for WebRTC (Mobile Cam <-> Dashboard)
  socket.on('join-room', ({ room = 'stream-room', role = 'dashboard' }) => {
    socket.join(room);
    socket.room = room;
    socket.role = role;

    if (!rooms.has(room)) {
      rooms.set(room, new Set());
    }
    rooms.get(room).add(socket.id);

    console.log(`[Socket.IO] Socket ${socket.id} joined room "${room}" as [${role}]`);
    
    // Notify other peers in room
    socket.to(room).emit('peer-joined', { peerId: socket.id, role });

    // Send existing peers in room to newly joined socket
    const existingPeers = Array.from(rooms.get(room)).filter(id => id !== socket.id);
    socket.emit('room-peers', { peers: existingPeers });
  });

  // WebRTC Signaling Relay: offer, answer, ice-candidate
  socket.on('signal', ({ target, data }) => {
    if (target) {
      io.to(target).emit('signal', { sender: socket.id, data });
    } else if (socket.room) {
      socket.to(socket.room).emit('signal', { sender: socket.id, data });
    }
  });

  // Phone Camera Status (battery, camera facing, torch state)
  socket.on('cam-status-update', (data) => {
    if (socket.room) {
      socket.to(socket.room).emit('cam-status', { sender: socket.id, ...data });
    }
  });

  // Dashboard remote control commands to Phone Camera (toggle-torch, switch-camera)
  socket.on('cam-command', (command) => {
    if (socket.room) {
      socket.to(socket.room).emit('cam-command-received', command);
    }
  });

  // Streaming data chunk from client (MediaRecorder chunks) -> piped to FFmpeg stdin
  socket.on('stream-chunk', (chunk) => {
    if (Buffer.isBuffer(chunk)) {
      streamManager.writeChunk(chunk);
    } else if (chunk instanceof ArrayBuffer) {
      streamManager.writeChunk(Buffer.from(chunk));
    }
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    if (socket.room && rooms.has(socket.room)) {
      rooms.get(socket.room).delete(socket.id);
      socket.to(socket.room).emit('peer-left', { peerId: socket.id, role: socket.role });
      if (rooms.get(socket.room).size === 0) {
        rooms.delete(socket.room);
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, '0.0.0.0', () => {
    const net = getLocalNetworkIPs();
    console.log(`====================================================`);
    console.log(`  IRL LIVESTREAM SUPERAPP SERVER RUNNING`);
    console.log(`  Local URL:    http://localhost:${PORT}`);
    console.log(`  Network URL:  http://${net.primaryIp}:${PORT}`);
    console.log(`  Mobile Cam:   http://${net.primaryIp}:3000/cam (Dev)`);
    console.log(`====================================================`);
  });
}

module.exports = {
  app,
  server,
  io,
  streamManager,
  youtubeService,
  configManager
};
