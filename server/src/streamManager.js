const { spawn } = require('child_process');
const EventEmitter = require('events');

class StreamManager extends EventEmitter {
  constructor(configManager) {
    super();
    this.configManager = configManager;
    this.ffmpegProcess = null;
    this.isStreaming = false;
    this.startTime = null;
    this.stats = {
      fps: 0,
      bitrate: '0 kbps',
      frame: 0,
      uptimeSeconds: 0,
      speed: '0x'
    };
    this.uptimeInterval = null;
    this.recentLogs = [];
  }

  startStream(customOptions = {}) {
    if (this.isStreaming) {
      throw new Error('Streaming is already active');
    }

    const config = { ...this.configManager.get(), ...customOptions };
    const { rtmpUrl, streamKey, fps, videoBitrate, audioBitrate } = config;

    let targetUrl;
    const isMock = !streamKey || streamKey.trim() === '' || streamKey.toLowerCase() === 'test';

    if (isMock) {
      console.log('[StreamManager] Starting in TEST/MOCK mode (output to null)...');
    } else {
      targetUrl = `${rtmpUrl.replace(/\/$/, '')}/${streamKey.trim()}`;
      console.log(`[StreamManager] Starting live stream to: ${rtmpUrl}/****`);
    }

    // FFmpeg args optimized for live WebM pipe -> YouTube RTMP
    const args = [
      '-hide_banner',
      '-loglevel', 'info',
      // Low latency input flags for pipe:0
      '-fflags', '+nobuffer+genpts+discardcorrupt',
      '-probesize', '1000000',
      '-analyzeduration', '1000000',
      '-f', 'webm',
      '-i', 'pipe:0'
    ];

    if (isMock) {
      args.push('-f', 'null', '-');
    } else {
      args.push(
        // Video encoder settings
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-tune', 'zerolatency',
        '-b:v', videoBitrate || '3000k',
        '-maxrate', videoBitrate || '3000k',
        '-bufsize', '4000k',
        '-pix_fmt', 'yuv420p',
        '-r', String(fps || 30),
        '-g', String((fps || 30) * 2),
        // Audio encoder settings
        '-c:a', 'aac',
        '-b:a', audioBitrate || '128k',
        '-ar', '44100',
        // RTMP output flags
        '-flvflags', 'no_duration_filesize',
        '-f', 'flv',
        targetUrl
      );
    }

    try {
      this.recentLogs = [];
      this.ffmpegProcess = spawn('ffmpeg', args, {
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.isStreaming = true;
      this.startTime = Date.now();
      this.emit('started', { isMock, target: isMock ? 'TEST_MODE' : 'YOUTUBE_LIVE' });

      // Handle stdin error to prevent unhandled EPIPE
      this.ffmpegProcess.stdin.on('error', (err) => {
        if (err.code !== 'EPIPE') {
          console.warn('[StreamManager] Stdin warning:', err.message);
        }
      });

      // Start uptime counter
      this.uptimeInterval = setInterval(() => {
        if (this.startTime) {
          this.stats.uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
          this.emit('stats', this.stats);
        }
      }, 1000);

      // Listen to stderr for stats and log errors
      this.ffmpegProcess.stderr.on('data', (data) => {
        const text = data.toString();
        this.recentLogs.push(text);
        if (this.recentLogs.length > 20) this.recentLogs.shift();

        // Print connection messages
        if (text.includes('Opening') || text.includes('error') || text.includes('Error') || text.includes('failed') || text.includes('Connection')) {
          console.log('[FFmpeg log]', text.trim());
        }

        this.parseFfmpegOutput(text);
      });

      this.ffmpegProcess.on('error', (err) => {
        console.error('[StreamManager] FFmpeg process spawn error:', err.message);
        this.emit('error', err);
        this.cleanup();
      });

      this.ffmpegProcess.on('close', (code) => {
        console.log(`[StreamManager] FFmpeg closed with code ${code}`);
        if (code !== 0 && code !== null) {
          console.error('[StreamManager] Last FFmpeg logs:\n', this.recentLogs.slice(-5).join(''));
        }
        this.cleanup();
        this.emit('stopped', { code });
      });

      return { success: true, isMock };
    } catch (err) {
      console.error('[StreamManager] Failed to spawn FFmpeg:', err.message);
      this.cleanup();
      throw err;
    }
  }

  writeChunk(chunk) {
    if (!this.isStreaming || !this.ffmpegProcess || !this.ffmpegProcess.stdin || !this.ffmpegProcess.stdin.writable) {
      return false;
    }
    try {
      return this.ffmpegProcess.stdin.write(chunk);
    } catch (err) {
      // Ignored if process was stopping
      return false;
    }
  }

  stopStream() {
    if (!this.isStreaming) {
      return false;
    }
    console.log('[StreamManager] Stopping stream gracefully...');
    if (this.ffmpegProcess) {
      try {
        if (this.ffmpegProcess.stdin && this.ffmpegProcess.stdin.writable) {
          this.ffmpegProcess.stdin.end();
        }
        setTimeout(() => {
          if (this.ffmpegProcess) {
            this.ffmpegProcess.kill('SIGTERM');
          }
        }, 1500);
      } catch (err) {
        if (this.ffmpegProcess) {
          this.ffmpegProcess.kill('SIGKILL');
        }
      }
    }
    this.cleanup();
    this.emit('stopped', { code: 0 });
    return true;
  }

  cleanup() {
    this.isStreaming = false;
    this.startTime = null;
    if (this.uptimeInterval) {
      clearInterval(this.uptimeInterval);
      this.uptimeInterval = null;
    }
    this.ffmpegProcess = null;
    this.stats = {
      fps: 0,
      bitrate: '0 kbps',
      frame: 0,
      uptimeSeconds: 0,
      speed: '0x'
    };
  }

  parseFfmpegOutput(line) {
    const frameMatch = line.match(/frame=\s*(\d+)/);
    const fpsMatch = line.match(/fps=\s*([\d.]+)/);
    const bitrateMatch = line.match(/bitrate=\s*([\d.]+kbits\/s)/);
    const speedMatch = line.match(/speed=\s*([\d.]+x)/);

    let updated = false;
    if (frameMatch) {
      this.stats.frame = parseInt(frameMatch[1], 10);
      updated = true;
    }
    if (fpsMatch) {
      this.stats.fps = parseFloat(fpsMatch[1]);
      updated = true;
    }
    if (bitrateMatch) {
      this.stats.bitrate = bitrateMatch[1];
      updated = true;
    }
    if (speedMatch) {
      this.stats.speed = speedMatch[1];
      updated = true;
    }

    if (updated) {
      this.emit('stats', { ...this.stats });
    }
  }

  getStatus() {
    return {
      isStreaming: this.isStreaming,
      stats: this.stats,
      uptimeSeconds: this.stats.uptimeSeconds
    };
  }
}

module.exports = {
  StreamManager
};
