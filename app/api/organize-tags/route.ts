import { NextRequest, NextResponse } from 'next/server';


export async function POST(req: NextRequest) {
  try {
    console.log('API: organize-tags started');
    const { tags } = await req.json();
    console.log('API: Parsed tags', tags ? tags.length : 'null');

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
    console.log('API: API Key determined');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API Key is required. Please add it in Settings.' },
        { status: 401 }
      );
    }

    // Use direct fetch to avoid potential OpenAI SDK issues in this specific route environment
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that groups a list of tags into high-level semantic themes. Return a JSON object with a key "clusters" containing an array of objects. Each object should have "theme" (string), "tags" (array of strings), and "hexColor" (string). Example: { "clusters": [{ "theme": "Work", "tags": ["meeting"], "hexColor": "#ef4444" }] }.',
          },
          {
            role: 'user',
            content: `Group these tags into themes: ${JSON.stringify(tags)}`,
          },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API Error:', errorText);
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content || '{"clusters": []}';
    
    let result;
    try {
        result = JSON.parse(content);
    } catch (e) {
      console.error("JSON parse error", e);
      result = { clusters: [] };
    }



    return NextResponse.json({ 
      clusters: result.clusters || [],
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
