import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

type Destination = 'andy' | 'pipeline' | 'idea';

interface RelayNote {
  id: string;
  title: string;
  transcript: string;
  tags?: string[];
  category?: string;
  triage?: {
    priority?: string;
    actionType?: string;
  };
}

export async function POST(req: NextRequest) {
  // Admin gate
  const adminKey = req.headers.get('x-admin-key');
  if (!adminKey || adminKey !== process.env.ADMIN_ACCESS_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { destination, note } = (await req.json()) as {
      destination: Destination;
      note: RelayNote;
    };

    if (!destination || !note?.transcript) {
      return NextResponse.json({ error: 'Missing destination or note data' }, { status: 400 });
    }

    switch (destination) {
      case 'andy': {
        const message = [
          `[JotThis] ${note.title}`,
          '',
          note.transcript,
          '',
          note.tags?.length ? `Tags: ${note.tags.join(', ')}` : '',
          note.triage?.priority ? `Priority: ${note.triage.priority}` : '',
          note.triage?.actionType ? `Action: ${note.triage.actionType}` : '',
        ].filter(Boolean).join('\n');

        const result = await pool.query(
          `INSERT INTO agent_messages (from_agent, to_agent, message, context, read)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          ['jotthis', 'andy', message, 'vault', false]
        );

        return NextResponse.json({
          success: true,
          destination: 'andy',
          messageId: result.rows[0].id,
        });
      }

      case 'pipeline': {
        const mlSecret = process.env.ML_SECRET;
        if (!mlSecret) {
          return NextResponse.json({ error: 'ML_SECRET not configured' }, { status: 500 });
        }

        const response = await fetch(
          'https://automations.maplelinkservices.com/webhook/yt-content-pipeline',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-ml-secret': mlSecret,
            },
            body: JSON.stringify({
              topic: note.title,
              content: note.transcript,
              source: 'jotthis',
            }),
          }
        );

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Pipeline webhook failed: ${response.status} ${text}`);
        }

        return NextResponse.json({
          success: true,
          destination: 'pipeline',
        });
      }

      case 'idea': {
        const result = await pool.query(
          `INSERT INTO ideas (idea, category, captured_at)
           VALUES ($1, $2, NOW()) RETURNING id, captured_at`,
          [
            `${note.title}: ${note.transcript}`,
            'voice-note',
          ]
        );

        return NextResponse.json({
          success: true,
          destination: 'idea',
          ideaId: result.rows[0].id,
        });
      }

      default:
        return NextResponse.json({ error: `Unknown destination: ${destination}` }, { status: 400 });
    }
  } catch (error: unknown) {
    console.error('Relay error:', error);
    const message = error instanceof Error ? error.message : 'Relay failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
