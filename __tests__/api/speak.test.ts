import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSpeechCreate, mockExists, mockSave, mockGetSignedUrl, mockFile, mockBucket } = vi.hoisted(() => {
  const mockExists = vi.fn().mockResolvedValue([false]);
  const mockSave = vi.fn().mockResolvedValue(undefined);
  const mockGetSignedUrl = vi.fn().mockResolvedValue(['https://signed-url.example.com/audio.mp3']);
  const mockFile = vi.fn().mockReturnValue({
    exists: mockExists,
    save: mockSave,
    getSignedUrl: mockGetSignedUrl,
  });
  const mockBucket = vi.fn().mockReturnValue({ file: mockFile });
  const mockSpeechCreate = vi.fn();

  return { mockSpeechCreate, mockExists, mockSave, mockGetSignedUrl, mockFile, mockBucket };
});

vi.mock('@/lib/firebase-admin', () => ({
  adminStorage: { bucket: mockBucket },
  adminDb: {},
}));

vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      audio = { speech: { create: mockSpeechCreate } };
    },
  };
});

import { POST } from '@/app/api/speak/route';

function createSpeakRequest(body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/speak', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

describe('POST /api/speak', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExists.mockResolvedValue([false]);
    mockGetSignedUrl.mockResolvedValue(['https://signed-url.example.com/audio.mp3']);
    mockFile.mockReturnValue({
      exists: mockExists,
      save: mockSave,
      getSignedUrl: mockGetSignedUrl,
    });
    mockBucket.mockReturnValue({ file: mockFile });
  });

  it('should return 400 when text is missing', async () => {
    const req = createSpeakRequest({ voice: 'alloy', userId: 'user1' });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toBe('Missing required fields');
  });

  it('should return 400 when voice is missing', async () => {
    const req = createSpeakRequest({ text: 'hello', userId: 'user1' });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('should return 400 when userId is missing', async () => {
    const req = createSpeakRequest({ text: 'hello', voice: 'alloy' });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('should return cached URL when file exists', async () => {
    mockExists.mockResolvedValueOnce([true]);

    const req = createSpeakRequest({ text: 'hello', voice: 'alloy', userId: 'user1' });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.source).toBe('cache');
    expect(json.url).toBe('https://signed-url.example.com/audio.mp3');
    expect(mockSpeechCreate).not.toHaveBeenCalled();
  });

  it('should generate and cache audio on cache miss', async () => {
    mockExists.mockResolvedValueOnce([false]);
    mockSpeechCreate.mockResolvedValueOnce({
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
    });

    const req = createSpeakRequest({ text: 'hello', voice: 'alloy', userId: 'user1' });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.source).toBe('openai');
    expect(json.url).toBe('https://signed-url.example.com/audio.mp3');
    expect(mockSpeechCreate).toHaveBeenCalledWith({
      model: 'tts-1',
      voice: 'alloy',
      input: 'hello',
    });
    expect(mockSave).toHaveBeenCalledOnce();
  });

  it('should use deterministic file path based on text + voice hash', async () => {
    mockExists.mockResolvedValue([false]);
    mockSpeechCreate.mockResolvedValue({
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(10)),
    });

    const req1 = createSpeakRequest({ text: 'hello', voice: 'alloy', userId: 'user1' });
    await POST(req1);
    const path1 = mockFile.mock.calls[0][0];

    vi.clearAllMocks();
    mockExists.mockResolvedValue([false]);
    mockGetSignedUrl.mockResolvedValue(['https://signed-url.example.com/audio.mp3']);
    mockFile.mockReturnValue({
      exists: mockExists,
      save: mockSave,
      getSignedUrl: mockGetSignedUrl,
    });
    mockBucket.mockReturnValue({ file: mockFile });
    mockSpeechCreate.mockResolvedValue({
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(10)),
    });

    const req2 = createSpeakRequest({ text: 'hello', voice: 'alloy', userId: 'user1' });
    await POST(req2);
    const path2 = mockFile.mock.calls[0][0];

    expect(path1).toBe(path2);
  });

  it('should return 500 when OpenAI throws', async () => {
    mockExists.mockResolvedValueOnce([false]);
    mockSpeechCreate.mockRejectedValueOnce(new Error('TTS failed'));

    const req = createSpeakRequest({ text: 'hello', voice: 'alloy', userId: 'user1' });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe('TTS failed');
  });
});
