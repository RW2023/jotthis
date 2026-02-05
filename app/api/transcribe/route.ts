import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';



export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audio = formData.get('audio') as Blob;
    if (!audio) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Convert Blob to File for OpenAI API
    const audioFile = new File([audio], 'recording.webm', { type: 'audio/webm' });

    // Initialize OpenAI client with user key or server key
    const userApiKey = req.headers.get('x-openai-key');
    const openai = new OpenAI({
      apiKey: userApiKey || process.env.OPENAI_API_KEY,
    });

    // Transcribe with OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en', // Optional: specify language
    });

    const transcript = transcription.text;



    // Generate title and tags using GPT-4
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are an assistant that generates concise titles and relevant tags for voice notes. Return your response in JSON format with fields: title (string, max 60 chars) and tags (array of 2-4 strings).',
        },
        {
          role: 'user',
          content: `Generate a title and tags for this transcript:\n\n${transcript}`,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');

    return NextResponse.json({
      transcript,
      title: result.title || 'Untitled Note',
      tags: result.tags || [],
      success: true,
    });
  } catch (error: unknown) {
    console.error('Transcription error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Transcription failed';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
