/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth, OperationType, handleFirestoreError } from '../lib/firebase';
import { getLocalPlayerId, getLocalPlayerName, setLocalPlayerName } from './multiplayerService';

export interface UserProfile {
  uid: string;
  displayName: string;
  avatar: string;
  friendCode: string;
  singlePlayerStats: {
    totalScore: number;
    totalSolved: number;
    bestStreak: number;
  };
  multiplayerStats: {
    matches: number;
    wins: number;
    losses: number;
    draws: number;
    totalScore: number;
  };
  friendUids: string[];
  updatedAt?: any;
}

export type PlayerProfile = UserProfile;

const COLLECTION_PATH = 'user_profiles';
const LOCAL_PROFILE_KEY = 'mental_math_user_profile_v1';

export const AVATAR_OPTIONS = [
  { id: 'fox', emoji: '🦊', name: '機智小狐' },
  { id: 'owl', emoji: '🦉', name: '心算學士' },
  { id: 'lion', emoji: '🦁', name: '霸氣獅王' },
  { id: 'lightning', emoji: '⚡', name: '雷霆神算' },
  { id: 'crown', emoji: '👑', name: '數學之王' },
  { id: 'target', emoji: '🎯', name: '精準神射' },
  { id: 'rocket', emoji: '🚀', name: '極速火箭' },
  { id: 'panda', emoji: '🐼', name: '淡定熊貓' },
];

/**
 * 依 UID 生成穩定的 6 位數好友代碼
 */
function generateFriendCodeFromUid(uid: string): string {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = (hash * 31 + uid.charCodeAt(i)) % 900000;
  }
  return (100000 + Math.abs(hash)).toString();
}

/**
 * 取得本地預設個人檔案
 */
export function getLocalProfile(): UserProfile {
  const uid = getLocalPlayerId();
  try {
    const raw = localStorage.getItem(LOCAL_PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.uid === uid) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to read local profile:', err);
  }

  const defaultProfile: UserProfile = {
    uid,
    displayName: getLocalPlayerName(),
    avatar: '🦊',
    friendCode: generateFriendCodeFromUid(uid),
    singlePlayerStats: {
      totalScore: 0,
      totalSolved: 0,
      bestStreak: 0,
    },
    multiplayerStats: {
      matches: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      totalScore: 0,
    },
    friendUids: [],
  };

  saveLocalProfile(defaultProfile);
  return defaultProfile;
}

function saveLocalProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(profile));
  } catch (err) {
    console.error('Failed to save local profile:', err);
  }
}

/**
 * 同步本地檔案至 Firestore
 */
export async function syncProfileToCloud(profile: UserProfile): Promise<void> {
  const docRef = doc(db, COLLECTION_PATH, profile.uid);
  try {
    await setDoc(
      docRef,
      {
        ...profile,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    // 網絡離線時本地已留存
    console.warn('Cloud profile sync deferred:', err);
  }
}

/**
 * 更新個人暱稱或頭像
 */
export async function updatePlayerIdentity(
  displayName: string,
  avatar: string
): Promise<UserProfile> {
  const current = getLocalProfile();
  const cleanName = displayName.trim().slice(0, 16) || current.displayName;
  setLocalPlayerName(cleanName);

  const updated: UserProfile = {
    ...current,
    displayName: cleanName,
    avatar: avatar || current.avatar,
  };

  saveLocalProfile(updated);
  await syncProfileToCloud(updated);
  return updated;
}

/**
 * 紀錄一場多人對戰結果
 */
export async function recordBattleResult(
  isWin: boolean,
  isDraw: boolean,
  matchScore: number
): Promise<void> {
  const current = getLocalProfile();
  const mp = { ...current.multiplayerStats };

  mp.matches += 1;
  if (isDraw) {
    mp.draws += 1;
  } else if (isWin) {
    mp.wins += 1;
  } else {
    mp.losses += 1;
  }
  mp.totalScore += Math.max(0, matchScore);

  const updated: UserProfile = {
    ...current,
    multiplayerStats: mp,
  };

  saveLocalProfile(updated);
  await syncProfileToCloud(updated);
}

/**
 * 查詢特定玩家個人公開戰績檔案 (例如在對戰中點看對手)
 */
export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  if (uid === getLocalPlayerId()) {
    return getLocalProfile();
  }

  const docRef = doc(db, COLLECTION_PATH, uid);
  try {
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return null;
    }
    return snap.data() as UserProfile;
  } catch (err) {
    console.warn('Fetch user profile error:', err);
    return null;
  }
}

/**
 * 依 6 位數好友代碼搜尋玩家
 */
export async function searchPlayerByFriendCode(code: string): Promise<UserProfile | null> {
  const cleanCode = code.trim();
  const q = query(
    collection(db, COLLECTION_PATH),
    where('friendCode', '==', cleanCode)
  );

  try {
    const snap = await getDocs(q);
    if (snap.empty) {
      return null;
    }
    return snap.docs[0].data() as UserProfile;
  } catch (err) {
    console.warn('Search friend by code error:', err);
    return null;
  }
}

/**
 * 新增好友
 */
export async function addFriend(targetUid: string): Promise<boolean> {
  const myUid = getLocalPlayerId();
  if (targetUid === myUid) return false;

  const current = getLocalProfile();
  if (current.friendUids.includes(targetUid)) {
    return true; // 已經是好友
  }

  const updatedFriends = [...current.friendUids, targetUid];
  const updated: UserProfile = {
    ...current,
    friendUids: updatedFriends,
  };

  saveLocalProfile(updated);
  await syncProfileToCloud(updated);
  return true;
}

/**
 * 刪除好友
 */
export async function removeFriend(targetUid: string): Promise<void> {
  const current = getLocalProfile();
  const updatedFriends = current.friendUids.filter((id) => id !== targetUid);
  const updated: UserProfile = {
    ...current,
    friendUids: updatedFriends,
  };

  saveLocalProfile(updated);
  await syncProfileToCloud(updated);
}

/**
 * 取得好友清單完整戰績資訊
 */
export async function fetchFriendsProfiles(): Promise<UserProfile[]> {
  const current = getLocalProfile();
  if (!current.friendUids || current.friendUids.length === 0) {
    return [];
  }

  const results: UserProfile[] = [];
  for (const fUid of current.friendUids) {
    const profile = await fetchUserProfile(fUid);
    if (profile) {
      results.push(profile);
    }
  }
  return results;
}

/**
 * 監聽雲端所有玩家資訊 (管理後台即時更新)
 */
export function subscribeAllProfiles(
  callback: (profiles: UserProfile[]) => void,
  onError?: (err: any) => void
): () => void {
  const colRef = collection(db, COLLECTION_PATH);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list = snapshot.docs.map((d) => d.data() as UserProfile);
      callback(list);
    },
    (err) => {
      console.error('Subscribe all profiles error:', err);
      if (onError) onError(err);
      handleFirestoreError(err, OperationType.GET, COLLECTION_PATH);
    }
  );
}

/**
 * 重置本地玩家個人檔案
 */
export function resetLocalProfile(): UserProfile {
  const uid = getLocalPlayerId();
  const defaultProfile: UserProfile = {
    uid,
    displayName: getLocalPlayerName(),
    avatar: '🦊',
    friendCode: generateFriendCodeFromUid(uid),
    singlePlayerStats: {
      totalScore: 0,
      totalSolved: 0,
      bestStreak: 0,
    },
    multiplayerStats: {
      matches: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      totalScore: 0,
    },
    friendUids: [],
  };
  saveLocalProfile(defaultProfile);
  return defaultProfile;
}

/**
 * 刪除單一玩家資訊 (管理後台)
 */
export async function deleteUserProfile(userId: string): Promise<void> {
  const docRef = doc(db, COLLECTION_PATH, userId);
  try {
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${COLLECTION_PATH}/${userId}`);
  }

  // 若刪除的是當前本機玩家，同時重置本機檔案
  if (userId === getLocalPlayerId()) {
    resetLocalProfile();
  }
}

/**
 * 清空雲端所有玩家資訊 (管理後台一鍵刪除所有玩家資訊)
 */
export async function deleteAllUserProfiles(): Promise<number> {
  const colRef = collection(db, COLLECTION_PATH);
  let snap;
  try {
    snap = await getDocs(colRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, COLLECTION_PATH);
    return 0;
  }

  if (snap.empty) {
    resetLocalProfile();
    return 0;
  }

  const docs = snap.docs;
  // 分批批次刪除 (每批最多 400 筆)
  const batchSize = 400;
  for (let i = 0; i < docs.length; i += batchSize) {
    const chunk = docs.slice(i, i + batchSize);
    const batch = writeBatch(db);
    for (const d of chunk) {
      batch.delete(d.ref);
    }
    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, COLLECTION_PATH);
    }
  }

  // 重置本地個人資料
  resetLocalProfile();
  return docs.length;
}
