const { spawn, spawnSync } = require('child_process');
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
    this._expectClose = false;
  }

  startStream(customOptions = {}) {
    if (this.isStreaming) {
      throw new Error('Streaming is already active');
    }

    const config = { ...this.configManager.get(), ...customOptions };
    const { rtmpUrl, streamKey, fps, videoBitrate, audioBitrate } = config;

    let targetUrl;
    const isMock = !streamKey || String(streamKey).trim() === '' || String(streamKey).trim().toLowerCase() === 'test';

    if (isMock) {
      console.log('[StreamManager] Starting in TEST/MOCK mode (output to null)...');
    } else {
      const safeRtmp = (rtmpUrl || '').replace(/\/$/, '');
      if (!safeRtmp) {
        throw new Error('RTMP URL belum dikonfigurasi');
      }
      targetUrl = `${safeRtmp}/${String(streamKey).trim()}`;
      console.log(`[StreamManager] Starting live stream to: ${safeRtmp}/****`);
    }

    // Fail fast with a clear error instead of reporting success and dying async.
    try {
      const probe = spawnSync('ffmpeg', ['-version'], { windowsHide: true, timeout: 10000 });
      if (probe.error) {
        throw probe.error;
      }
      if (typeof probe.status === 'number' && probe.status !== 0) {
        throw new Error(`ffmpeg -version exited with code ${probe.status}`);
      }
    } catch (err) {
      throw new Error(`FFmpeg tidak tersedia: ${err.message}`);
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
        const expected = this._expectClose;
        this._expectClose = false;
        this.cleanup();
        // stopStream() already emitted 'stopped' — don't double-emit.
        if (!expected) {
          this.emit('stopped', { code });
        }
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
    // Capture the process: cleanup() below nulls this.ffmpegProcess,
    // so the fallback kill timer must reference the local handle.
    const proc = this.ffmpegProcess;
    if (proc) {
      try {
        if (proc.stdin && proc.stdin.writable) {
          proc.stdin.end();
        }
        this._expectClose = true;
        setTimeout(() => {
          try {
            if (proc.exitCode === null && proc.signalCode === null) {
              proc.kill('SIGTERM');
            }
          } catch (err) {
            // Already exited — nothing to do.
          }
        }, 1500);
      } catch (err) {
        try {
          proc.kill('SIGKILL');
        } catch (e) {
          // ignore
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
