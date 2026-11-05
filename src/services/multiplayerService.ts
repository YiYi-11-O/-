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
  getDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth, OperationType, handleFirestoreError } from '../lib/firebase';
import { MentalMathEngine, QuestionData } from '../logic/mentalMath';
import { getTimeLimits, DEFAULT_TIME_LIMITS } from './gameSettingsService';

export interface PlayerState {
  uid: string;
  displayName: string;
  photoURL?: string | null;
  score: number;
  roundScore: number;
  solvedInRound: boolean;
  cardsUsedCount?: number;
  equationPreview?: string;
  solveTimeRemaining?: number;
}

export interface BattleRoomData {
  id: string;
  roomCode: string; // 4 位數字代碼
  difficulty: number;
  status: 'waiting' | 'countdown' | 'playing' | 'round_result' | 'finished';
  currentRound: number;
  totalRounds: number;
  roundTimeLimit: number;
  roundStartTime: number; // 毫秒戳
  host: PlayerState;
  guest?: PlayerState | null;
  currentQuestion: QuestionData;
  winner?: string | null; // uid 或 'draw'
  createdAt: any;
  updatedAt: any;
}

const COLLECTION_PATH = 'battle_rooms';
const PLAYER_ID_KEY = 'mental_math_multiplayer_uid_v1';
const PLAYER_NAME_KEY = 'mental_math_multiplayer_name_v1';

/**
 * 取得本裝置唯一玩家 ID (優先使用 Firebase 登入 UID，若無則生成持久唯一 ID)
 */
export function getLocalPlayerId(): string {
  if (auth.currentUser?.uid) {
    return auth.currentUser.uid;
  }
  let localId = localStorage.getItem(PLAYER_ID_KEY);
  if (!localId) {
    localId = `guest_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
    localStorage.setItem(PLAYER_ID_KEY, localId);
  }
  return localId;
}

/**
 * 取得本裝置玩家暱稱
 */
export function getLocalPlayerName(): string {
  if (auth.currentUser?.displayName) {
    return auth.currentUser.displayName;
  }
  let localName = localStorage.getItem(PLAYER_NAME_KEY);
  if (!localName) {
    localName = `心算先鋒#${Math.floor(1000 + Math.random() * 9000)}`;
    localStorage.setItem(PLAYER_NAME_KEY, localName);
  }
  return localName;
}

/**
 * 設定並儲存本裝置玩家暱稱
 */
export function setLocalPlayerName(name: string): void {
  const sanitized = name.trim().slice(0, 16) || '心算挑戰者';
  localStorage.setItem(PLAYER_NAME_KEY, sanitized);
}

/**
 * 生成 4 位隨機房間邀請代碼
 */
function generateRoomCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * 建立多人對戰房間 (房主)
 */
export async function createBattleRoom(
  difficulty: number,
  totalRounds = 3,
  customName?: string
): Promise<string> {
  const playerId = getLocalPlayerId();
  const playerName = customName || getLocalPlayerName();
  const photoURL = auth.currentUser?.photoURL || null;

  const roomCode = generateRoomCode();
  const roomId = `room_${roomCode}_${Date.now()}`;
  const timeLimits = getTimeLimits();
  const roundTimeLimit = timeLimits[difficulty] || DEFAULT_TIME_LIMITS[difficulty] || 35;

  const initialQuestion = MentalMathEngine.generateQuestion(difficulty);

  const initialRoom: BattleRoomData = {
    id: roomId,
    roomCode,
    difficulty,
    status: 'waiting',
    currentRound: 1,
    totalRounds,
    roundTimeLimit,
    roundStartTime: 0,
    host: {
      uid: playerId,
      displayName: playerName,
      photoURL,
      score: 0,
      roundScore: 0,
      solvedInRound: false,
      cardsUsedCount: 0,
      equationPreview: '',
    },
    guest: null,
    currentQuestion: initialQuestion,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    const docRef = doc(db, COLLECTION_PATH, roomId);
    await setDoc(docRef, initialRoom);
    return roomId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${COLLECTION_PATH}/${roomId}`);
    throw error;
  }
}

/**
 * 依 4 位數代碼尋找並加入對戰房間 (對手)
 */
export async function joinBattleRoomByCode(
  code: string,
  customName?: string
): Promise<string> {
  const cleanCode = code.trim();
  const q = query(
    collection(db, COLLECTION_PATH),
    where('roomCode', '==', cleanCode),
    where('status', '==', 'waiting'),
    limit(1)
  );

  try {
    const snap = await getDocs(q);
    if (snap.empty) {
      throw new Error(`找不到邀請碼為 ${cleanCode} 的等待中對戰房間，請確認代碼是否正確。`);
    }

    const roomDoc = snap.docs[0];
    const roomData = roomDoc.data() as BattleRoomData;
    const playerId = getLocalPlayerId();

    if (roomData.host.uid === playerId) {
      // 房主自己點擊進入
      return roomDoc.id;
    }

    const playerName = customName || getLocalPlayerName();
    const photoURL = auth.currentUser?.photoURL || null;

    const guestState: PlayerState = {
      uid: playerId,
      displayName: playerName,
      photoURL,
      score: 0,
      roundScore: 0,
      solvedInRound: false,
      cardsUsedCount: 0,
      equationPreview: '',
    };

    // 加入成功後，立即切換房間狀態為 playing 並記錄開局時間戳
    await updateDoc(roomDoc.ref, {
      guest: guestState,
      status: 'playing',
      roundStartTime: Date.now(),
      updatedAt: serverTimestamp(),
    });

    return roomDoc.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_PATH}?roomCode=${cleanCode}`);
    throw error;
  }
}

/**
 * 即時串流監聽特定對戰房間的狀態 (所有裝置雙向同步)
 */
export function subscribeToBattleRoom(
  roomId: string,
  onUpdate: (room: BattleRoomData | null) => void,
  onError?: (err: Error) => void
): () => void {
  const docRef = doc(db, COLLECTION_PATH, roomId);

  const unsub = onSnapshot(
    docRef,
    (snap) => {
      if (!snap.exists()) {
        onUpdate(null);
        return;
      }
      const data = snap.data() as BattleRoomData;
      onUpdate({
        ...data,
        id: snap.id,
      });
    },
    (err) => {
      console.error('Error listening to battle room:', err);
      if (onError) onError(err);
      handleFirestoreError(err, OperationType.GET, `${COLLECTION_PATH}/${roomId}`);
    }
  );

  return unsub;
}

/**
 * 監聽大廳中等待對手加入的開放房間列表
 */
export function subscribeOpenRooms(
  onUpdate: (rooms: BattleRoomData[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(
    collection(db, COLLECTION_PATH),
    where('status', '==', 'waiting'),
    limit(10)
  );

  const unsub = onSnapshot(
    q,
    (snap) => {
      const rooms: BattleRoomData[] = [];
      snap.forEach((d) => {
        rooms.push({ ...(d.data() as BattleRoomData), id: d.id });
      });
      onUpdate(rooms);
    },
    (err) => {
      console.error('Error listening to open rooms:', err);
      if (onError) onError(err);
      handleFirestoreError(err, OperationType.LIST, COLLECTION_PATH);
    }
  );

  return unsub;
}

/**
 * 玩家即時同步目前作答進度（給對手雷達顯示已選卡牌數量與算式預覽）
 */
export async function syncPlayerProgress(
  roomId: string,
  isHost: boolean,
  cardsUsedCount: number,
  equationPreview: string
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_PATH, roomId);
    const fieldPrefix = isHost ? 'host' : 'guest';
    await updateDoc(docRef, {
      [`${fieldPrefix}.cardsUsedCount`]: cardsUsedCount,
      [`${fieldPrefix}.equationPreview`]: equationPreview,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    // 忽略進度短暫同步非阻塞錯誤
    console.warn('Progress sync warning:', err);
  }
}

/**
 * 玩家提交正確答案
 */
export async function submitBattleAnswer(
  roomId: string,
  isHost: boolean,
  equation: string,
  remainingSeconds: number
): Promise<void> {
  const docRef = doc(db, COLLECTION_PATH, roomId);
  try {
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const data = snap.data() as BattleRoomData;
    const opponent = isHost ? data.guest : data.host;
    const currentMe = isHost ? data.host : data.guest;
    if (!currentMe || currentMe.solvedInRound) return; // 避免重複結算

    // 計分標準：基礎分 100 + 剩餘時間加成 (剩餘秒 * 10) + 首位搶先解出獎勵 (+60)
    const isFirstToSolve = !opponent?.solvedInRound;
    const firstBonus = isFirstToSolve ? 60 : 0;
    const timeBonus = Math.max(0, remainingSeconds * 10);
    const roundScore = 100 + timeBonus + firstBonus;
    const newTotalScore = currentMe.score + roundScore;

    const myField = isHost ? 'host' : 'guest';
    const updates: Record<string, any> = {
      [`${myField}.score`]: newTotalScore,
      [`${myField}.roundScore`]: roundScore,
      [`${myField}.solvedInRound`]: true,
      [`${myField}.solveTimeRemaining`]: remainingSeconds,
      [`${myField}.equationPreview`]: equation,
      updatedAt: serverTimestamp(),
    };

    // 如果對手也已解出，或是首位答對後觸發回合結果
    if (opponent?.solvedInRound || isFirstToSolve) {
      // 若對方已解出，雙方皆已完成本回合，直接切換到回合結算狀態
      if (opponent?.solvedInRound) {
        updates.status = 'round_result';
      }
    }

    await updateDoc(docRef, updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_PATH}/${roomId}`);
  }
}

/**
 * 本回合時間到（若仍有玩家未解出，直接進入回合結算）
 */
export async function timeoutCurrentRound(roomId: string): Promise<void> {
  const docRef = doc(db, COLLECTION_PATH, roomId);
  try {
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;
    const data = snap.data() as BattleRoomData;
    if (data.status === 'playing') {
      await updateDoc(docRef, {
        status: 'round_result',
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_PATH}/${roomId}`);
  }
}

/**
 * 推進至下一回合（或結算最終比賽）
 */
export async function advanceRound(roomId: string): Promise<void> {
  const docRef = doc(db, COLLECTION_PATH, roomId);
  try {
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;
    const data = snap.data() as BattleRoomData;

    if (data.currentRound >= data.totalRounds) {
      // 比賽結束！計算總分分出勝負
      const hostScore = data.host.score;
      const guestScore = data.guest?.score || 0;
      let winnerUid = 'draw';
      if (hostScore > guestScore) {
        winnerUid = data.host.uid;
      } else if (guestScore > hostScore && data.guest) {
        winnerUid = data.guest.uid;
      }

      await updateDoc(docRef, {
        status: 'finished',
        winner: winnerUid,
        updatedAt: serverTimestamp(),
      });
      return;
    }

    // 產生下一回合全新題目
    const nextQuestion = MentalMathEngine.generateQuestion(data.difficulty);
    const nextRound = data.currentRound + 1;

    await updateDoc(docRef, {
      status: 'playing',
      currentRound: nextRound,
      currentQuestion: nextQuestion,
      roundStartTime: Date.now(),
      'host.roundScore': 0,
      'host.solvedInRound': false,
      'host.cardsUsedCount': 0,
      'host.equationPreview': '',
      'host.solveTimeRemaining': 0,
      'guest.roundScore': 0,
      'guest.solvedInRound': false,
      'guest.cardsUsedCount': 0,
      'guest.equationPreview': '',
      'guest.solveTimeRemaining': 0,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_PATH}/${roomId}`);
  }
}

/**
 * 離開或解散對戰房間
 */
export async function leaveBattleRoom(roomId: string, isHost: boolean): Promise<void> {
  const docRef = doc(db, COLLECTION_PATH, roomId);
  try {
    if (isHost) {
      // 房主離開直接解散刪除房間
      await deleteDoc(docRef);
    } else {
      // 客人離開則重置房間為等待中
      await updateDoc(docRef, {
        guest: null,
        status: 'waiting',
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_PATH}/${roomId}`);
  }
}
