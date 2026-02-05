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

    // Initialize OpenAI client
    const userApiKey = req.headers.get('x-openai-key');
    let apiKey: string | undefined = userApiKey || undefined;

    // Check if user provided the Admin Access Key
    if (userApiKey === process.env.ADMIN_ACCESS_KEY) {
      apiKey = process.env.OPENAI_API_KEY;
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API Key is required. Please add it in Settings.' },
        { status: 401 }
      );
    }

    const openai = new OpenAI({
      apiKey: apiKey,
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
