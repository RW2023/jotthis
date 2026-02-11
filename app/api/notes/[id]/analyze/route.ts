import { NextResponse } from 'next/server';
import { openai, AI_PROMPTS } from '@/lib/ai';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> } // Params are now Promises in Next.js 15
) {
  try {
    // 1. Verify Authentication
    const sessionCookie = req.headers.get('cookie')?.split('; ').find(row => row.startsWith('session='))?.split('=')[1];
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true).catch(() => null);

    if (!decodedClaims) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    
    // 2. Fetch Note from Firestore
    const noteRef = adminDb
      .collection('users')
      .doc(decodedClaims.uid)
      .collection('transcriptions')
      .doc(id);
    const noteSnap = await noteRef.get();

    if (!noteSnap.exists) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    const noteData = noteSnap.data();

    // Verify ownership
    if (noteData?.userId !== decodedClaims.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const transcript = noteData?.transcript;

    if (!transcript || transcript.length < 10) {
      return NextResponse.json({ error: 'Transcript too short for analysis' }, { status: 400 });
    }

    // 3. Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Use gpt-4o-mini for speed/cost efficiently
      messages: [
        { role: "system", content: "You are an AI assistant that summarizes voice notes and extracts actionable tasks." },
        { role: "user", content: AI_PROMPTS.analyzeNote(transcript) }
      ],
      response_format: { type: "json_object" },
    });

    const aiResponse = completion.choices[0].message.content;
    
    if (!aiResponse) {
      throw new Error('Failed to generate AI response');
    }

    const parsedResponse = JSON.parse(aiResponse);

    // 4. Update Note in Firestore
    await noteRef.update({
      summary: parsedResponse.summary,
      actionItems: parsedResponse.actionItems || [],
      tags: parsedResponse.tags || [],
      isAnalyzed: true,
      updatedAt: new Date(),
    });

    return NextResponse.json({ 
      success: true, 
      data: parsedResponse 
    });

  } catch (error: any) {
    console.error('AI Analysis Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
