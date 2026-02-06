import { NextRequest } from 'next/server';

export function createMockNextRequest(options: {
  method?: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  formData?: FormData;
}): NextRequest {
  const { method = 'POST', body, headers = {}, formData } = options;

  if (formData) {
    return new NextRequest('http://localhost/api/test', {
      method,
      headers,
      body: formData,
    });
  }

  return new NextRequest('http://localhost/api/test', {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
}
