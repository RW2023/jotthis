import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = await params;
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');

  if (!id || !token) {
    return NextResponse.json({ error: 'Missing ID or token' }, { status: 400 });
  }

  try {
    // Search across all users to find the note with this ID
    // Since notes are in subcollections users/{userId}/transcriptions/{noteId}
    // we strictly need the note ID and the parent path, OR we use a collectionGroup query if the ID is unique enough?
    // But wait, we have the ID. But we don't have the UserID.
    
    // With admin SDK, we can't easily "get" a doc if we don't know the path.
    // OPTION: We added shareToken to the doc.
    // Implementation Plan Step 2 said: "Get handler... Verify token matches shareToken"
    
    // Efficient way: Collection Group Query for 'transcriptions' where 'shareToken' == token.
    // This is secure because tokens are unique (hopefully). 
    // AND we also check if doc.id == id.
    
    const notesRef = adminDb.collectionGroup('transcriptions');
    const snapshot = await notesRef
      .where('shareToken', '==', token)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ error: 'Invalid token or note not found' }, { status: 404 });
    }

    // There should theoretically be only one doc with this token if we use random long strings.
    // But let's find the one that also matches the ID just to be sure.
    
    const doc = snapshot.docs.find(d => d.id === id);

    if (!doc) {
      return NextResponse.json({ error: 'Note not found matching ID' }, { status: 404 });
    }

    const data = doc.data();

    // Verify isShared flag just in case
    if (!data.isShared) {
       return NextResponse.json({ error: 'Sharing is disabled for this note' }, { status: 403 });
    }

    // Return only public data
    const publicNote = {
      id: doc.id,
      title: data.title,
      transcript: data.transcript,
      tags: data.tags,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
    };

    return NextResponse.json({ success: true, note: publicNote });
    
  } catch (error) {
    console.error('Error fetching shared note:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
