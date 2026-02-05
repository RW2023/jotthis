import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

interface AnalyzeRequest {
  transcript: string;
  type: 'actionItems' | 'contentIdeas' | 'research';
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const PROMPTS = {
  actionItems: `Extract actionable items from this transcript. Return a JSON array of strings, each starting with an emoji (📋, ✅, 🔔, etc.) and describing a specific action to take. Limit to 3-5 items.`,
  contentIdeas: `Generate content ideas based on this transcript. Return a JSON array of strings, each starting with an emoji (📝, 🎥, 💡, etc.) and describing a content piece idea. Limit to 3-5 ideas.`,
  research: `Suggest research directions based on this transcript. Return a JSON array of strings, each starting with an emoji (🔍, 📚, 🌐, etc.) and describing a topic to research. Limit to 3-5 suggestions.`,
};

export async function POST(req: NextRequest) {
  try {
    const body: AnalyzeRequest = await req.json();
    const { transcript, type } = body;

    if (!transcript) {
      return NextResponse.json({ error: 'No transcript provided' }, { status: 400 });
    }

    if (!PROMPTS[type]) {
      return NextResponse.json({ error: 'Invalid analysis type' }, { status: 400 });
    }

    // Use GPT-4 to generate insights
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: PROMPTS[type],
        },
        {
          role: 'user',
          content: transcript,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0].message.content || '{"items":[]}');
    const insights = result.items || result.insights || [];

    return NextResponse.json({
      insights,
      success: true,
    });
  } catch (error: any) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: error.message || 'Analysis failed' },
      { status: 500 }
    );
  }
}
