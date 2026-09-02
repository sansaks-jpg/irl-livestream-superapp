import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { StreamManager } = require('../src/streamManager');

describe('StreamManager', () => {
  const mockConfigManager = {
    get: () => ({
      rtmpUrl: 'rtmp://a.rtmp.youtube.com/live2',
      streamKey: 'test',
      fps: 30,
      videoBitrate: '2500k',
      audioBitrate: '128k'
    })
  };

  it('should initialize in idle state', () => {
    const sm = new StreamManager(mockConfigManager);
    const status = sm.getStatus();
    expect(status.isStreaming).toBe(false);
    expect(status.uptimeSeconds).toBe(0);
  });

  it('should parse FFmpeg stderr stats accurately', () => {
    const sm = new StreamManager(mockConfigManager);
    let capturedStats = null;
    sm.on('stats', (stats) => {
      capturedStats = stats;
    });

    const sampleLine = 'frame=  120 fps= 29.8 q=28.0 size=    1024kB time=00:00:04.00 bitrate=2540.2kbits/s speed=1.00x';
    sm.parseFfmpegOutput(sampleLine);

    expect(capturedStats).not.toBeNull();
    expect(capturedStats.frame).toBe(120);
    expect(capturedStats.fps).toBe(29.8);
    expect(capturedStats.bitrate).toBe('2540.2kbits/s');
    expect(capturedStats.speed).toBe('1.00x');
  });

  it('should prevent starting multiple streams concurrently', () => {
    const sm = new StreamManager(mockConfigManager);
    sm.isStreaming = true;
    expect(() => sm.startStream()).toThrow('Streaming is already active');
  });
});
