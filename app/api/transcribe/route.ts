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
    
    // --- Smart Note Cleanup ---
    // Use GPT-4o-mini to clean up the transcript (remove filler words, fix grammar)
    const cleanupCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert editor. Clean up the following transcript by removing filler words (um, uh, like, you know), falsestarts, and fixing grammar. Keep the tone and voice authentic. Do not summarize. Return ONLY the cleaned text.',
        },
        {
          role: 'user',
          content: transcript,
        },
      ],
    });

    const cleanedTranscript = cleanupCompletion.choices[0].message.content || transcript;


    // Generate title and tags using GPT-4
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant that generates concise, objective titles, relevant tags, a smart category, and triage metadata for voice notes. \n\n1. **Category**: Classify into exactly one: "Work", "Personal", "Family", "Hobby". If unclear, use "Uncategorized".\n2. **Priority**: Assign one: "critical" (immediate/urgent), "high" (important), "medium" (standard), "low" (someday/maybe).\n3. **Action Type**: Assign one: "task" (to-do), "calendar" (event/meeting), "purchase" (shopping), "idea" (thought), "reference" (note-taking).\n\nReturn JSON with fields: title (string), tags (string[]), category (string), priority (string), actionType (string).',
        },
        {
          role: 'user',
          content: `Generate metadata for this transcript:\n\n${cleanedTranscript}`,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');

    return NextResponse.json({
      transcript: cleanedTranscript,
      originalTranscript: transcript,
      title: result.title || 'Untitled Note',
      tags: result.tags || [],
      category: result.category || 'Uncategorized',
      triage: {
        priority: result.priority || 'medium',
        actionType: result.actionType || 'reference',
        status: 'pending'
      },
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
