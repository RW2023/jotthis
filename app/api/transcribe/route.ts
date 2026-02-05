import { NextRequest, NextResponse } from 'next/server';

// Mock transcription - replace with OpenAI Whisper when ready
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audio = formData.get('audio') as Blob;

    if (!audio) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock transcription result
    const mockTranscript =
      'This is a placeholder transcript for your voice note. In production, this will be transcribed by OpenAI Whisper. You can test the UI flow with this mock data.';

    // Mock AI-generated title and tags
    const mockTitle = 'Placeholder Voice Note';
    const mockTags = ['productivity', 'ideas', 'notes'];

    return NextResponse.json({
      transcript: mockTranscript,
      title: mockTitle,
      tags: mockTags,
      success: true,
    });
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 });
  }
}
