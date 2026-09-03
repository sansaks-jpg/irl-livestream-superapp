import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { ConfigManager, DEFAULT_CONFIG } = require('../src/configManager');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_CONFIG_PATH = path.join(__dirname, 'test-config.json');

describe('ConfigManager', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_CONFIG_PATH)) {
      fs.unlinkSync(TEST_CONFIG_PATH);
    }
  });

  afterEach(() => {
    if (fs.existsSync(TEST_CONFIG_PATH)) {
      fs.unlinkSync(TEST_CONFIG_PATH);
    }
  });

  it('should initialize with default config when file does not exist', () => {
    const manager = new ConfigManager(TEST_CONFIG_PATH);
    const config = manager.get();
    expect(config.rtmpUrl).toBe(DEFAULT_CONFIG.rtmpUrl);
    expect(config.fps).toBe(30);
    expect(fs.existsSync(TEST_CONFIG_PATH)).toBe(true);
  });

  it('should save and reload updated config', () => {
    const manager = new ConfigManager(TEST_CONFIG_PATH);
    manager.save({ streamKey: 'live_test_12345678', fps: 60 });
    
    const reloaded = new ConfigManager(TEST_CONFIG_PATH);
    expect(reloaded.get('streamKey')).toBe('live_test_12345678');
    expect(reloaded.get('fps')).toBe(60);
  });

  it('should return sanitized config without raw secrets', () => {
    const manager = new ConfigManager(TEST_CONFIG_PATH);
    manager.save({ streamKey: 'abcd1234efgh5678', obsPassword: 's3cret' });
    const sanitized = manager.getSanitized();
    expect(sanitized.streamKey).toBeUndefined();
    expect(sanitized.obsPassword).toBeUndefined();
    expect(sanitized.streamKeyMasked).toBe('abcd...5678');
    // Raw values remain readable internally
    expect(manager.get('streamKey')).toBe('abcd1234efgh5678');
  });

  it('should drop unknown/derived keys on save', () => {
    const manager = new ConfigManager(TEST_CONFIG_PATH);
    manager.save({ fps: 60, streamKeyMasked: 'abcd...5678', evilKey: 1 });
    expect(manager.get('fps')).toBe(60);
    expect(manager.get('streamKeyMasked')).toBeUndefined();
    expect(manager.get('evilKey')).toBeUndefined();
  });
});
