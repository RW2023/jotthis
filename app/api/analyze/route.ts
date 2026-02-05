import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

interface AnalyzeRequest {
  transcript: string;
  type: 'actionItems' | 'contentIdeas' | 'research';
}



const PROMPTS = {
  actionItems: `Extract actionable items strictly from this transcript. Return a JSON object with a key "insights" containing an array of strings. Each string should start with an emoji (📋, ✅, 🔔, etc.) and describe a specific action mentioned. If no clear actions are present, return an empty array. Do not make up actions. Limit to 3-5 items. Example: { "insights": ["📋 Call mom", "✅ Pay bills"] }`,
  contentIdeas: `Generate content ideas that are directly derived from this transcript. Return a JSON object with a key "insights" containing an array of strings. Each string should start with an emoji (📝, 🎥, 💡, etc.) and describe a content piece idea based on the topics discussed. If the transcript is too short or unrelated to content creation, do not force ideas. Limit to 3-5 ideas. Example: { "insights": ["📝 Blog post about...", "🎥 Video tutorial on..."] }`,
  research: `Suggest research directions based strictly on topics mentioned in this transcript. Return a JSON object with a key "insights" containing an array of strings. Each string should start with an emoji (🔍, 📚, 🌐, etc.) and describe a topic to research. Do not hallucinate topics not discussed. Limit to 3-5 suggestions. Example: { "insights": ["🔍 Research deeper into...", "📚 Read about..."] }`,
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
  } catch (error: unknown) {
    console.error('Analysis error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
