import { db } from '../firebase';
import { doc, setDoc, collection, getDocs, writeBatch, query } from 'firebase/firestore';
import { Novel, Chapter } from '../types';

export const saveNovelToFirestore = async (userId: string, novel: Novel) => {
  const { chapters, ...novelMetadata } = novel;
  
  // Save metadata
  await setDoc(doc(db, `users/${userId}/novels`, novel.id), novelMetadata);

  // Save chapters in a batch
  const batch = writeBatch(db);
  const chaptersRef = collection(db, `users/${userId}/novels`, novel.id, 'chapters');
  
  for (const chapter of chapters) {
    const chapterDocRef = doc(chaptersRef, chapter.id);
    batch.set(chapterDocRef, chapter);
  }
  
  await batch.commit();
};

export const loadChaptersFromFirestore = async (userId: string, novelId: string): Promise<Chapter[]> => {
  const chaptersRef = collection(db, `users/${userId}/novels`, novelId, 'chapters');
  const snapshot = await getDocs(query(chaptersRef));
  return snapshot.docs.map(doc => doc.data() as Chapter);
};

export const deleteNovelFromFirestore = async (userId: string, novelId: string) => {
  const chaptersRef = collection(db, `users/${userId}/novels`, novelId, 'chapters');
  const snapshot = await getDocs(chaptersRef);
  
  const batch = writeBatch(db);
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  batch.delete(doc(db, `users/${userId}/novels`, novelId));
  
  await batch.commit();
};
