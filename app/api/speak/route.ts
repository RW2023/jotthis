import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import OpenAI from 'openai';
import { adminStorage } from '@/lib/firebase-admin';
import { SHA256 } from 'crypto-js';

// OpenAI client is initialized lazily inside the handler


export async function POST(req: Request) {
  try {
    const { text, voice, userId } = await req.json();

    if (!text || !voice || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Use server-side API Key
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API Key configuration missing' }, { status: 500 });
    }
    
    const client = new OpenAI({ apiKey });

    // 1. Generate Hash for Caching
    // Hash based on text + voice to allow different versions
    const hash = SHA256(text + voice).toString();
    const filePath = `users/${userId}/tts/${hash}.mp3`;
    const bucket = adminStorage.bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
    const file = bucket.file(filePath);

    // 2. Check Cache
    const [exists] = await file.exists();
    if (exists) {
      // Get signed URL or public URL
      // Ideally we use a signed URL that expires in 1 hour
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 1000 * 60 * 60, // 1 hour
      });
      return NextResponse.json({ url, source: 'cache' });
    }

    // 3. Generate Audio via OpenAI
    const mp3 = await client.audio.speech.create({
      model: "tts-1",
      voice: voice as any,
      input: text,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());

    // 4. Upload to Firebase Storage
    await file.save(buffer, {
      contentType: 'audio/mpeg',
      metadata: {
        metadata: {
          originalText: text.substring(0, 100), // Store snippet
          voice,
        }
      }
    });

    // 5. Return URL
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 1000 * 60 * 60, // 1 hour
    });

    return NextResponse.json({ url, source: 'openai' });

  } catch (error: any) {
    console.error('TTS Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate speech' }, { status: 500 });
  }
}
