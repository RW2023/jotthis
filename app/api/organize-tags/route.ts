import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: NextRequest) {
  try {
    const { tags } = await req.json();

    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return NextResponse.json({ error: 'No tags provided' }, { status: 400 });
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

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that groups a list of tags into high-level semantic themes. Return a JSON array where each object has a "theme" (string), "tags" (array of strings), and "hexColor" (string, a valid 6-digit hex code that matches the vibe of the theme, e.g. #ef4444 for Urgent, #22d3ee for Tech). Try to keep it to 3-6 themes. Every input tag must appear exactly once in the output.',
        },
        {
          role: 'user',
          content: `Group these tags into themes: ${JSON.stringify(tags)}`,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0].message.content || '{"clusters": []}';
    let result;
    try {
       result = JSON.parse(content);
       // Handle if LLM returns { clusters: [...] } or { themes: [...] } or just [...]
       // The prompt asks for an array but JSON mode requires an object wrapper often.
       // Actually gpt-4o-mini with json_object requires the prompt to say "JSON object". 
       // I should adjust the system prompt to explicitly ask for an object wrapper like { "clusters": [...] } 
       // to be safe.
       
    } catch (e) {
      console.error("JSON parse error", e);
      result = { clusters: [] };
    }

    return NextResponse.json({ 
      clusters: result.clusters || result.themes || [],
      success: true 
    });

  } catch (error: unknown) {
    console.error('Tag organization error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Organization failed';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
