import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockNextRequest } from '../helpers/request';

const { mockChatCreate } = vi.hoisted(() => ({
  mockChatCreate: vi.fn(),
}));

vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      chat = { completions: { create: mockChatCreate } };
    },
  };
});

import { POST } from '@/app/api/analyze/route';

describe('POST /api/analyze', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 when transcript is missing', async () => {
    const req = createMockNextRequest({
      body: { type: 'actionItems' },
      headers: { 'x-openai-key': 'sk-test' },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toBe('No transcript provided');
  });

  it('should return 400 for invalid analysis type', async () => {
    const req = createMockNextRequest({
      body: { transcript: 'hello', type: 'invalid' },
      headers: { 'x-openai-key': 'sk-test' },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toBe('Invalid analysis type');
  });

  it('should return 401 when no API key is provided', async () => {
    const req = createMockNextRequest({
      body: { transcript: 'hello', type: 'actionItems' },
    });

    const original = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const res = await POST(req);
    expect(res.status).toBe(401);

    process.env.OPENAI_API_KEY = original;
  });

  it('should swap admin access key for server OpenAI key', async () => {
    mockChatCreate.mockResolvedValueOnce({
      choices: [{ message: { content: '{"insights":["item1"]}' } }],
    });

    const req = createMockNextRequest({
      body: { transcript: 'Test transcript', type: 'actionItems' },
      headers: { 'x-openai-key': 'admin-test-key' },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it('should return insights for actionItems', async () => {
    mockChatCreate.mockResolvedValueOnce({
      choices: [{ message: { content: '{"insights":["Task 1","Task 2"]}' } }],
    });

    const req = createMockNextRequest({
      body: { transcript: 'I need to do stuff', type: 'actionItems' },
      headers: { 'x-openai-key': 'sk-test' },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.insights).toEqual(['Task 1', 'Task 2']);
  });

  it('should return insights for contentIdeas', async () => {
    mockChatCreate.mockResolvedValueOnce({
      choices: [{ message: { content: '{"insights":["Blog post"]}' } }],
    });

    const req = createMockNextRequest({
      body: { transcript: 'Content creation notes', type: 'contentIdeas' },
      headers: { 'x-openai-key': 'sk-test' },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.insights).toEqual(['Blog post']);
  });

  it('should return insights for research', async () => {
    mockChatCreate.mockResolvedValueOnce({
      choices: [{ message: { content: '{"insights":["Research topic"]}' } }],
    });

    const req = createMockNextRequest({
      body: { transcript: 'Research notes', type: 'research' },
      headers: { 'x-openai-key': 'sk-test' },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.insights).toEqual(['Research topic']);
  });

  it('should fall back to result.items when insights key is missing', async () => {
    mockChatCreate.mockResolvedValueOnce({
      choices: [{ message: { content: '{"items":["fallback item"]}' } }],
    });

    const req = createMockNextRequest({
      body: { transcript: 'test', type: 'actionItems' },
      headers: { 'x-openai-key': 'sk-test' },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(json.insights).toEqual(['fallback item']);
  });

  it('should return 500 when OpenAI throws', async () => {
    mockChatCreate.mockRejectedValueOnce(new Error('OpenAI rate limit'));

    const req = createMockNextRequest({
      body: { transcript: 'test', type: 'actionItems' },
      headers: { 'x-openai-key': 'sk-test' },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe('OpenAI rate limit');
  });
});
