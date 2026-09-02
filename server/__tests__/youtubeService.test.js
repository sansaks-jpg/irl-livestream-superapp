import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { YouTubeService } = require('../src/youtubeService');

describe('YouTubeService', () => {
  let ytService;

  beforeEach(() => {
    ytService = new YouTubeService();
  });

  afterEach(() => {
    ytService.stop();
  });

  it('should extract video ID correctly from different YouTube URL formats', () => {
    ytService.setVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(ytService.currentVideoId).toBe('dQw4w9WgXcQ');

    ytService.setVideoId('https://youtu.be/abcdef12345');
    expect(ytService.currentVideoId).toBe('abcdef12345');

    ytService.setVideoId('https://www.youtube.com/live/liveStreamId99');
    expect(ytService.currentVideoId).toBe('liveStreamId99');

    ytService.setVideoId('raw_video_id_123');
    expect(ytService.currentVideoId).toBe('raw_video_id_123');
  });

  it('should emit chat events when addChatMessage is called', () => {
    let received = null;
    ytService.on('chat', (msg) => {
      received = msg;
    });

    ytService.addChatMessage({
      id: '1',
      author: 'Tester',
      message: 'Halo IRL streamer!'
    });

    expect(received).not.toBeNull();
    expect(received.message).toBe('Halo IRL streamer!');
    expect(ytService.chatHistory.length).toBe(1);
  });
});
