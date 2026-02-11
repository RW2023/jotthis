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
    const body = await req.json().catch(() => ({}));
    const type = body.type || 'all';
    
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
    let systemPrompt = "You are an AI assistant that summarizes voice notes and extracts actionable tasks.";
    let userPrompt = "";

    if (type === 'summary') {
      systemPrompt = "You are a concise summarizer.";
      userPrompt = AI_PROMPTS.summary(transcript);
    } else if (type === 'actionItems') {
      systemPrompt = "You are a task extraction expert.";
      userPrompt = AI_PROMPTS.actionItems(transcript);
    } else if (type === 'research') {
      systemPrompt = "You are a research analyst.";
      userPrompt = AI_PROMPTS.research(transcript);
    } else if (type === 'contentIdeas') {
      systemPrompt = "You are a creative content strategist.";
      userPrompt = AI_PROMPTS.contentIdeas(transcript);
    } else if (type === 'questions') {
      systemPrompt = "You are a critical thinker identifying gaps.";
      userPrompt = AI_PROMPTS.questions(transcript);
    } else if (type === 'roadblocks') {
      systemPrompt = "You are a risk management expert.";
      userPrompt = AI_PROMPTS.roadblocks(transcript);
    } else if (type === 'socialMedia') {
      systemPrompt = "You are a social media growth hacker.";
      userPrompt = AI_PROMPTS.socialMedia(transcript);
    } else {
      userPrompt = AI_PROMPTS.analyzeNote(transcript);
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
    });

    const aiResponse = completion.choices[0].message.content;
    
    if (!aiResponse) {
      throw new Error('Failed to generate AI response');
    }

    const parsedResponse = JSON.parse(aiResponse);

    // 4. Update Note in Firestore
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (type === 'summary') {
      updateData.summary = parsedResponse.summary;
    } else if (type === 'actionItems') {
      updateData.actionItems = parsedResponse.actionItems || [];
    } else if (type === 'research') {
      updateData['insights.researchPointers'] = parsedResponse.research || [];
    } else if (type === 'contentIdeas') {
      updateData['insights.contentIdeas'] = parsedResponse.contentIdeas || [];
    } else if (type === 'questions') {
      updateData['insights.questionsToAnswer'] = parsedResponse.questions || [];
    } else if (type === 'roadblocks') {
      updateData['insights.potentialRoadblocks'] = parsedResponse.roadblocks || [];
    } else if (type === 'socialMedia') {
      updateData['insights.socialHooks'] = parsedResponse.socialMedia || [];
    } else {
      updateData.summary = parsedResponse.summary;
      updateData.actionItems = parsedResponse.actionItems || [];
      updateData.tags = parsedResponse.tags || [];
      updateData.isAnalyzed = true;
    }

    await noteRef.update(updateData);

    return NextResponse.json({ 
      success: true, 
      data: parsedResponse 
    });

  } catch (error: any) {
    console.error('AI Analysis Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
