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
      targetUrl = `${rtmpUrl.replace(/\/$/, '')}/${streamKey}`;
      console.log(`[StreamManager] Starting live stream to: ${rtmpUrl}/****`);
    }

    // Build FFmpeg command arguments
    // Expect WebM with VP8/VP9/H264 + Opus audio from browser MediaRecorder
    const args = [
      '-hide_banner',
      '-loglevel', 'info',
      '-re',
      '-f', 'webm',
      '-i', 'pipe:0'
    ];

    if (isMock) {
      // Mock mode: decode and discard, still calculate fps/stats
      args.push(
        '-f', 'null',
        '-'
      );
    } else {
      // Real RTMP mode: encode to H.264 + AAC in FLV container
      args.push(
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-tune', 'zerolatency',
        '-b:v', videoBitrate || '3000k',
        '-maxrate', videoBitrate || '3000k',
        '-bufsize', '6000k',
        '-pix_fmt', 'yuv420p',
        '-r', String(fps || 30),
        '-g', String((fps || 30) * 2),
        '-c:a', 'aac',
        '-b:a', audioBitrate || '128k',
        '-ar', '44100',
        '-f', 'flv',
        targetUrl
      );
    }

    try {
      this.ffmpegProcess = spawn('ffmpeg', args, {
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.isStreaming = true;
      this.startTime = Date.now();
      this.emit('started', { isMock, target: isMock ? 'TEST_MODE' : 'YOUTUBE_LIVE' });

      // Start uptime counter
      this.uptimeInterval = setInterval(() => {
        if (this.startTime) {
          this.stats.uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
          this.emit('stats', this.stats);
        }
      }, 1000);

      // Listen to stderr for stats
      this.ffmpegProcess.stderr.on('data', (data) => {
        const line = data.toString();
        this.parseFfmpegOutput(line);
      });

      this.ffmpegProcess.on('error', (err) => {
        console.error('[StreamManager] FFmpeg process error:', err.message);
        this.emit('error', err);
        this.cleanup();
      });

      this.ffmpegProcess.on('close', (code) => {
        console.log(`[StreamManager] FFmpeg closed with code ${code}`);
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
    if (!this.isStreaming || !this.ffmpegProcess || !this.ffmpegProcess.stdin.writable) {
      return false;
    }
    try {
      return this.ffmpegProcess.stdin.write(chunk);
    } catch (err) {
      console.error('[StreamManager] Error writing chunk to stdin:', err.message);
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
        if (this.ffmpegProcess.stdin.writable) {
          this.ffmpegProcess.stdin.end();
        }
        // If it doesn't close in 2 seconds, kill it
        setTimeout(() => {
          if (this.ffmpegProcess) {
            this.ffmpegProcess.kill('SIGTERM');
          }
        }, 2000);
      } catch (err) {
        this.ffmpegProcess.kill('SIGKILL');
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
    // Example line: frame=  120 fps= 30 q=28.0 size=    1024kB time=00:00:04.00 bitrate=2097.2kbits/s speed=1.00x
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
