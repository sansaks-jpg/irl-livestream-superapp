import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { app } = require('../src/index');

describe('API Endpoints', () => {
  it('GET /api/network-info should return network IPs and camera URL', async () => {
    const res = await request(app).get('/api/network-info');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.primaryIp).toBeDefined();
    expect(res.body.camUrlDev).toContain('/cam');
  });

  it('GET /api/config should not expose raw secrets', async () => {
    const res = await request(app).get('/api/config');
    expect(res.status).toBe(200);
    expect(res.body.config.streamKey).toBeUndefined();
    expect(res.body.config.obsPassword).toBeUndefined();
    expect(res.body.config.streamKeyMasked).toBeDefined();
  });

  it('POST /api/config should drop unknown keys', async () => {
    const res = await request(app).post('/api/config').send({ __probe: 'x' });
    expect(res.status).toBe(200);
    expect(res.body.config.__probe).toBeUndefined();

    const check = await request(app).get('/api/config');
    expect(check.body.config.__probe).toBeUndefined();
  });

  it('POST /api/youtube/set-video should reject empty body', async () => {
    const res = await request(app).post('/api/youtube/set-video');
    expect(res.status).toBe(400);
  });

  it('POST /api/youtube/send-chat should reject empty message', async () => {
    const res = await request(app).post('/api/youtube/send-chat').send({});
    expect(res.status).toBe(400);
  });

  it('GET /api/stream/status should return current stream status', async () => {
    const res = await request(app).get('/api/stream/status');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.isStreaming).toBe(false);
  });

  it('POST /api/youtube/toggle-simulation should toggle simulation state', async () => {
    const res1 = await request(app).post('/api/youtube/toggle-simulation');
    expect(res1.status).toBe(200);
    expect(res1.body.isSimulating).toBe(true);

    const res2 = await request(app).post('/api/youtube/toggle-simulation');
    expect(res2.status).toBe(200);
    expect(res2.body.isSimulating).toBe(false);
  });
});
