import {
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './firebase';
import { VoiceNote } from '@/types';

/**
 * Save a voice note to Firestore
 */
export async function saveVoiceNote(
  userId: string,
  note: Omit<VoiceNote, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const notesRef = collection(db, `users/${userId}/transcriptions`);
  const docRef = await addDoc(notesRef, {
    ...note,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
}

/**
 * Load all voice notes for a user
 */
export async function loadUserNotes(userId: string): Promise<VoiceNote[]> {
  const notesRef = collection(db, `users/${userId}/transcriptions`);
  const q = query(notesRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      userId: data.userId,
      title: data.title,
      transcript: data.transcript,
      tags: data.tags || [],
      audioUrl: data.audioUrl,
      insights: data.insights,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as VoiceNote;
  });
}

/**
 * Delete a voice note and its associated audio file
 */
export async function deleteVoiceNote(
  userId: string,
  noteId: string,
  audioUrl?: string
): Promise<void> {
  // Delete Firestore document
  const noteRef = doc(db, `users/${userId}/transcriptions`, noteId);
  await deleteDoc(noteRef);

  // Delete audio file if exists
  if (audioUrl) {
    try {
      await deleteAudio(userId, audioUrl);
    } catch (error) {
      console.error('Error deleting audio file:', error);
      // Don't fail the whole operation if audio deletion fails
    }
  }
}

/**
 * Upload audio blob to Firebase Storage
 */
export async function uploadAudio(
  userId: string,
  audioBlob: Blob
): Promise<string> {
  const timestamp = Date.now();
  const audioPath = `users/${userId}/audio/${timestamp}.webm`;
  const storageRef = ref(storage, audioPath);

  await uploadBytes(storageRef, audioBlob);
  const downloadURL = await getDownloadURL(storageRef);

  return downloadURL;
}

/**
 * Delete an audio file from Firebase Storage
 */
export async function deleteAudio(userId: string, audioUrl: string): Promise<void> {
  // Extract path from URL or use as-is if it's already a path
  const pathMatch = audioUrl.match(/\/o\/(.+?)\?/);
  const path = pathMatch
    ? decodeURIComponent(pathMatch[1])
    : audioUrl.replace(`users/${userId}/audio/`, '');

  const storageRef = ref(storage, `users/${userId}/audio/${path}`);
  await deleteObject(storageRef);
}

/**
 * Update insights for a voice note
 */
export async function updateNoteInsights(
  userId: string,
  noteId: string,
  insightType: 'actionItems' | 'contentIdeas' | 'research',
  insights: string[]
): Promise<void> {
  const noteRef = doc(db, `users/${userId}/transcriptions`, noteId);
  const updateData = {
    [`insights.${insightType}`]: insights,
    updatedAt: Timestamp.now(),
  };

  // Use updateDoc to update existing document
  const { updateDoc } = await import('firebase/firestore');
  await updateDoc(noteRef, updateData);
}
