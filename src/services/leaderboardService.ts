/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  setDoc,
  doc,
  deleteDoc,
  getDocs,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db, auth, OperationType, handleFirestoreError } from '../lib/firebase';

export interface LeaderboardEntry {
  id: string;
  difficulty: number;
  playerName: string;
  score: number;
  solvedCount: number;
  bestStreak: number;
  userId: string;
  createdAt?: unknown;
}

const COLLECTION_PATH = 'leaderboard_scores';

/**
 * 即時監聽特定難度的全球排行榜 (所有裝置即時同步)
 */
export function subscribeToLeaderboard(
  difficulty: number,
  onUpdate: (entries: LeaderboardEntry[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(
    collection(db, COLLECTION_PATH),
    where('difficulty', '==', difficulty),
    orderBy('score', 'desc'),
    limit(30)
  );

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const results: LeaderboardEntry[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        results.push({
          id: docSnap.id,
          difficulty: data.difficulty,
          playerName: data.playerName || '心算挑戰者',
          score: data.score || 0,
          solvedCount: data.solvedCount || 0,
          bestStreak: data.bestStreak || 0,
          userId: data.userId || '',
          createdAt: data.createdAt,
        });
      });
      onUpdate(results);
    },
    (error) => {
      console.error('Error listening to leaderboard:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, COLLECTION_PATH);
    }
  );

  return unsubscribe;
}

/**
 * 後台管理員即時監聽所有排行榜記錄 (全難度)
 */
export function subscribeAllLeaderboard(
  onUpdate: (entries: LeaderboardEntry[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(
    collection(db, COLLECTION_PATH),
    orderBy('score', 'desc'),
    limit(100)
  );

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const results: LeaderboardEntry[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        results.push({
          id: docSnap.id,
          difficulty: data.difficulty,
          playerName: data.playerName || '心算挑戰者',
          score: data.score || 0,
          solvedCount: data.solvedCount || 0,
          bestStreak: data.bestStreak || 0,
          userId: data.userId || '',
          createdAt: data.createdAt,
        });
      });
      onUpdate(results);
    },
    (error) => {
      console.error('Error listening to all leaderboard scores:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, COLLECTION_PATH);
    }
  );

  return unsubscribe;
}

/**
 * 提交心算成績至全球排行榜
 */
export async function submitScoreToLeaderboard(data: {
  difficulty: number;
  playerName: string;
  score: number;
  solvedCount: number;
  bestStreak: number;
}): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('請先登入以提交成績至全球排行榜');
  }

  // 產生安全唯一 ID
  const scoreId = `score_${currentUser.uid.slice(0, 8)}_${data.difficulty}_${Date.now()}`;

  const payload = {
    difficulty: data.difficulty,
    playerName: (data.playerName || currentUser.displayName || '心算挑戰者').trim().slice(0, 30),
    score: Math.max(0, Math.min(500000, data.score)),
    solvedCount: Math.max(0, data.solvedCount),
    bestStreak: Math.max(0, data.bestStreak),
    userId: currentUser.uid,
    createdAt: serverTimestamp(),
  };

  try {
    const docRef = doc(db, COLLECTION_PATH, scoreId);
    await setDoc(docRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTION_PATH}/${scoreId}`);
  }
}

/**
 * 後台刪除單筆排行榜分數記錄
 */
export async function deleteLeaderboardEntry(scoreId: string): Promise<void> {
  const targetPath = `${COLLECTION_PATH}/${scoreId}`;
  try {
    const docRef = doc(db, COLLECTION_PATH, scoreId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, targetPath);
  }
}

/**
 * 後台清空指定難度之排行榜記錄
 */
export async function clearLeaderboardByDifficulty(difficulty: number): Promise<number> {
  try {
    const q = query(
      collection(db, COLLECTION_PATH),
      where('difficulty', '==', difficulty)
    );
    const snap = await getDocs(q);
    if (snap.empty) return 0;

    const batch = writeBatch(db);
    snap.docs.forEach((d) => {
      batch.delete(d.ref);
    });
    await batch.commit();
    return snap.size;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_PATH}?difficulty=${difficulty}`);
    return 0;
  }
}

/**
 * 後台一鍵清空所有難度排行榜記錄
 */
export async function clearAllLeaderboards(): Promise<number> {
  try {
    const snap = await getDocs(collection(db, COLLECTION_PATH));
    if (snap.empty) return 0;

    const batch = writeBatch(db);
    snap.docs.forEach((d) => {
      batch.delete(d.ref);
    });
    await batch.commit();
    return snap.size;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, COLLECTION_PATH);
    return 0;
  }
}
