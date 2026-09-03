const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'data', 'config.json');

const DEFAULT_CONFIG = {
  rtmpUrl: 'rtmp://a.rtmp.youtube.com/live2',
  streamKey: '',
  resolution: '1280x720',
  fps: 30,
  videoBitrate: '3000k',
  audioBitrate: '128k',
  audioGain: 1.0,
  audioLimiterEnabled: true,
  audioLimiterThreshold: -6,
  youtubeVideoId: '',
  youtubeChannel: '',
  obsEnabled: false,
  obsUrl: 'ws://localhost:4455',
  obsPassword: '',
  privacyText: 'STANDBY'
};

class ConfigManager {
  constructor(customPath = null) {
    this.configPath = customPath || CONFIG_PATH;
    this.config = { ...DEFAULT_CONFIG };
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf8');
        const parsed = JSON.parse(raw);
        this.config = { ...DEFAULT_CONFIG, ...parsed };
      } else {
        this.save(this.config);
      }
    } catch (err) {
      console.error('Failed to load config, using default:', err.message);
      this.config = { ...DEFAULT_CONFIG };
    }
    return this.config;
  }

  save(newConfig = {}) {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      // Only persist known keys — drop derived/junk fields (e.g. streamKeyMasked)
      // that clients may round-trip from GET /api/config responses.
      const allowed = new Set(Object.keys(DEFAULT_CONFIG));
      const filtered = {};
      for (const key of Object.keys(newConfig || {})) {
        if (allowed.has(key)) {
          filtered[key] = newConfig[key];
        }
      }
      this.config = {
        ...this.config,
        ...filtered
      };
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf8');
      return this.config;
    } catch (err) {
      console.error('Failed to save config:', err.message);
      throw err;
    }
  }

  get(key) {
    return key ? this.config[key] : { ...this.config };
  }

  getSanitized() {
    // Never expose raw secrets — only a masked hint for display.
    const sanitized = { ...this.config };
    if (sanitized.streamKey) {
      sanitized.streamKeyMasked = sanitized.streamKey.length > 8 
        ? `${sanitized.streamKey.slice(0, 4)}...${sanitized.streamKey.slice(-4)}`
        : '****';
    } else {
      sanitized.streamKeyMasked = '';
    }
    delete sanitized.streamKey;
    delete sanitized.obsPassword;
    return sanitized;
  }
}

module.exports = {
  ConfigManager,
  DEFAULT_CONFIG
};
