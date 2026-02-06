import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockTranscriptionCreate, mockChatCreate } = vi.hoisted(() => ({
  mockTranscriptionCreate: vi.fn(),
  mockChatCreate: vi.fn(),
}));

vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      audio = { transcriptions: { create: mockTranscriptionCreate } };
      chat = { completions: { create: mockChatCreate } };
    },
  };
});

import { POST } from '@/app/api/transcribe/route';

function createTranscribeRequest(hasAudio: boolean, headers: Record<string, string> = {}) {
  const mockFormData = new FormData();
  if (hasAudio) {
    const audioBlob = new Blob(['fake audio'], { type: 'audio/webm' });
    mockFormData.append('audio', audioBlob, 'recording.webm');
  }

  return {
    formData: () => Promise.resolve(mockFormData),
    headers: new Headers(headers),
  } as any;
}

describe('POST /api/transcribe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 when no audio is provided', async () => {
    const req = createTranscribeRequest(false, { 'x-openai-key': 'sk-test' });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toBe('No audio file provided');
  });

  it('should return 401 when no API key is provided', async () => {
    const original = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const req = createTranscribeRequest(true);

    const res = await POST(req);
    expect(res.status).toBe(401);

    process.env.OPENAI_API_KEY = original;
  });

  it('should swap admin key for server OpenAI key', async () => {
    mockTranscriptionCreate.mockResolvedValueOnce({ text: 'Hello world' });
    mockChatCreate
      .mockResolvedValueOnce({
        choices: [{ message: { content: 'Hello world' } }],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { content: '{"title":"Test","tags":["hello"],"category":"Personal","priority":"medium","actionType":"reference"}' } }],
      });

    const req = createTranscribeRequest(true, { 'x-openai-key': 'admin-test-key' });

    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it('should transcribe, clean up, and return metadata', async () => {
    mockTranscriptionCreate.mockResolvedValueOnce({ text: 'Um, hello uh world' });
    mockChatCreate
      .mockResolvedValueOnce({
        choices: [{ message: { content: 'Hello world' } }],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { content: '{"title":"Greeting","tags":["hello","world"],"category":"Personal","priority":"low","actionType":"reference"}' } }],
      });

    const req = createTranscribeRequest(true, { 'x-openai-key': 'sk-test' });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.transcript).toBe('Hello world');
    expect(json.originalTranscript).toBe('Um, hello uh world');
    expect(json.title).toBe('Greeting');
    expect(json.tags).toEqual(['hello', 'world']);
    expect(json.category).toBe('Personal');
    expect(json.triage).toEqual({
      priority: 'low',
      actionType: 'reference',
      status: 'pending',
    });
  });

  it('should default title to Untitled Note when empty', async () => {
    mockTranscriptionCreate.mockResolvedValueOnce({ text: 'test' });
    mockChatCreate
      .mockResolvedValueOnce({
        choices: [{ message: { content: 'test' } }],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { content: '{}' } }],
      });

    const req = createTranscribeRequest(true, { 'x-openai-key': 'sk-test' });

    const res = await POST(req);
    const json = await res.json();

    expect(json.title).toBe('Untitled Note');
    expect(json.tags).toEqual([]);
    expect(json.category).toBe('Uncategorized');
    expect(json.triage.priority).toBe('medium');
    expect(json.triage.actionType).toBe('reference');
  });

  it('should return 500 when OpenAI throws', async () => {
    mockTranscriptionCreate.mockRejectedValueOnce(new Error('API Error'));

    const req = createTranscribeRequest(true, { 'x-openai-key': 'sk-test' });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe('API Error');
  });
});
