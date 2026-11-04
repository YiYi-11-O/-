/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Flame,
  Clock,
  User,
  LogIn,
  LogOut,
  ShieldAlert,
} from 'lucide-react';
import { onAuthStateChanged, signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import {
  subscribeAllLeaderboard,
  deleteLeaderboardEntry,
  clearLeaderboardByDifficulty,
  clearAllLeaderboards,
  LeaderboardEntry,
} from '../services/leaderboardService';
import { DIFFICULTY_CONFIGS } from './DifficultyScreen';
import { sound } from '../utils/audio';

export const AdminLeaderboardTab: React.FC = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterDiff, setFilterDiff] = useState<number | 'all'>('all');
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);

  // 刪除確認彈窗狀態
  const [deleteTarget, setDeleteTarget] = useState<LeaderboardEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [clearDiffConfirm, setClearDiffConfirm] = useState<number | null>(null);
  const [clearAllConfirm, setClearAllConfirm] = useState<boolean>(false);

  // 提示訊息
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    setIsLoading(true);
    const unsub = subscribeAllLeaderboard(
      (data) => {
        setEntries(data);
        setIsLoading(false);
      },
      (err) => {
        console.error('Failed to load admin leaderboard entries:', err);
        setIsLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const showToast = (text: string, isError = false) => {
    setStatusMessage({ text, isError });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleSignIn = async () => {
    try {
      sound.playTap();
      await signInWithPopup(auth, googleProvider);
      sound.playSuccess();
      showToast('管理員 Google 帳號認證成功');
    } catch (err: any) {
      sound.playError();
      showToast(err.message || '登入失敗', true);
    }
  };

  // 刪除單筆記錄
  const confirmDeleteEntry = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      await deleteLeaderboardEntry(deleteTarget.id);
      sound.playSuccess();
      showToast(`已成功刪除「${deleteTarget.playerName}」之分數記錄 (${deleteTarget.score}分)`);
      setDeleteTarget(null);
    } catch (err: any) {
      sound.playError();
      showToast(err.message || '刪除失敗，請確認已登入管理員帳號', true);
    } finally {
      setIsDeleting(false);
    }
  };

  // 清空指定難度
  const confirmClearDifficulty = async () => {
    if (clearDiffConfirm === null) return;
    try {
      setIsDeleting(true);
      const count = await clearLeaderboardByDifficulty(clearDiffConfirm);
      sound.playSuccess();
      showToast(`已成功清空 Lv.${clearDiffConfirm} 共 ${count} 筆分數記錄！`);
      setClearDiffConfirm(null);
    } catch (err: any) {
      sound.playError();
      showToast(err.message || '清空失敗，請確認已登入管理員帳號', true);
    } finally {
      setIsDeleting(false);
    }
  };

  // 一鍵清空全服所有難度
  const confirmClearAll = async () => {
    try {
      setIsDeleting(true);
      const count = await clearAllLeaderboards();
      sound.playSuccess();
      showToast(`已徹底清空全服所有難度共 ${count} 筆排行榜記錄！`);
      setClearAllConfirm(false);
    } catch (err: any) {
      sound.playError();
      showToast(err.message || '清空失敗，請確認已登入管理員帳號', true);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredEntries = filterDiff === 'all'
    ? entries
    : entries.filter((e) => e.difficulty === filterDiff);

  return (
    <div className="space-y-6">
      {/* 頂部管理控制列 */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">排行榜資料庫管理與刪除</h3>
                <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                  即時雲端連線
                </span>
              </div>
              <p className="text-xs text-slate-400">
                可單筆刪除異常或測試成績，或依難度批次清空／一鍵重置全服排行榜。
              </p>
            </div>
          </div>

          {/* 認證身份標記 */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {currentUser ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-slate-300 truncate max-w-[140px]">
                  {currentUser.displayName || currentUser.email}
                </span>
                <button
                  onClick={() => signOut(auth)}
                  className="text-slate-500 hover:text-slate-300 text-[11px] underline cursor-pointer"
                  title="登出管理員身分"
                >
                  登出
                </button>
              </div>
            ) : (
              <button
                onClick={handleSignIn}
                className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>登入啟用刪除授權</span>
              </button>
            )}
          </div>
        </div>

        {/* 狀態訊息橫條 */}
        {statusMessage && (
          <div
            className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 animate-fade-in ${
              statusMessage.isError
                ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
            }`}
          >
            {statusMessage.isError ? (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* 難度篩選切換與危險操作列 */}
        <div className="pt-2 border-t border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* 難度標籤切換 */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-[11px] text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              <span>篩選難度:</span>
            </span>

            <button
              onClick={() => setFilterDiff('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                filterDiff === 'all'
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              全部 ({entries.length})
            </button>

            {[1, 2, 3, 4, 5].map((lvl) => {
              const count = entries.filter((e) => e.difficulty === lvl).length;
              return (
                <button
                  key={lvl}
                  onClick={() => setFilterDiff(lvl)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    filterDiff === lvl
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Lv.{lvl} ({count})
                </button>
              );
            })}
          </div>

          {/* 批次刪除與清空按鈕 */}
          <div className="flex items-center gap-2">
            {filterDiff !== 'all' && (
              <button
                onClick={() => setClearDiffConfirm(filterDiff)}
                className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>清空 Lv.{filterDiff} 排行榜</span>
              </button>
            )}

            <button
              onClick={() => setClearAllConfirm(true)}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>一鍵清空全服排行榜</span>
            </button>
          </div>
        </div>
      </div>

      {/* 排行榜數據清單 */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="text-xs font-bold text-white flex items-center gap-2">
            <span>目前顯示記錄：</span>
            <span className="text-amber-400 font-mono font-black">{filteredEntries.length} 筆</span>
          </div>

          <div className="text-[11px] text-slate-400">
            點擊右側紅色垃圾桶圖示可單筆刪除
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            正在連線讀取全服排行榜資料...
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Trophy className="w-10 h-10 text-slate-700 mx-auto" />
            <p className="text-slate-400 text-xs font-medium">目前無任何排行榜成績記錄</p>
            <p className="text-slate-600 text-[11px]">進入遊戲答對題目後將會在此即時顯示</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">難度</th>
                  <th className="py-3 px-4">玩家暱稱</th>
                  <th className="py-3 px-4">總得分</th>
                  <th className="py-3 px-4">答對題數</th>
                  <th className="py-3 px-4">最高連擊</th>
                  <th className="py-3 px-4">玩家 ID</th>
                  <th className="py-3 px-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredEntries.map((item, index) => {
                  const cfg = DIFFICULTY_CONFIGS.find((c) => c.level === item.difficulty);
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-800/40 transition-colors font-sans"
                    >
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${cfg?.badgeBg || 'bg-slate-800 text-slate-300'}`}>
                          Lv.{item.difficulty} {cfg?.name}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-bold text-white">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-500" />
                          <span>{item.playerName}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-mono font-black text-amber-400 text-sm">
                          {item.score}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-emerald-400 font-mono font-bold">
                        {item.solvedCount} 題
                      </td>

                      <td className="py-3 px-4 text-orange-400 font-mono font-bold">
                        {item.bestStreak} 連擊
                      </td>

                      <td className="py-3 px-4 text-[11px] text-slate-500 font-mono">
                        {item.userId ? `${item.userId.slice(0, 10)}...` : '無'}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            sound.playTap();
                            setDeleteTarget(item);
                          }}
                          className="p-1.5 text-rose-400 hover:text-white bg-rose-950/30 hover:bg-rose-900/60 rounded-lg border border-rose-800/30 transition-colors cursor-pointer"
                          title="刪除此筆記錄"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 單筆刪除確認彈窗 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-3xl p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-400">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-white">確認刪除此成績？</h3>
              <p className="text-xs text-slate-400">
                即將從雲端資料庫永久刪除以下分數記錄：
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-left text-xs space-y-1">
              <div>玩家：<strong className="text-white">{deleteTarget.playerName}</strong></div>
              <div>難度：<strong className="text-amber-400">Lv.{deleteTarget.difficulty}</strong></div>
              <div>得分：<strong className="text-amber-400 font-mono font-bold">{deleteTarget.score} 分</strong></div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={confirmDeleteEntry}
                disabled={isDeleting}
                className="py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md disabled:opacity-50"
              >
                {isDeleting ? '刪除中...' : '確認刪除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 清空指定難度確認彈窗 */}
      {clearDiffConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-rose-800/60 w-full max-w-sm rounded-3xl p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-white">清空 Lv.{clearDiffConfirm} 排行榜</h3>
              <p className="text-xs text-slate-400">
                此難度的所有玩家成績記錄都將被清除且無法還原！
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setClearDiffConfirm(null)}
                className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={confirmClearDifficulty}
                disabled={isDeleting}
                className="py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md disabled:opacity-50"
              >
                {isDeleting ? '清空中...' : '確定清空此難度'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 一鍵清空全服排行榜確認彈窗 */}
      {clearAllConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-rose-600 w-full max-w-sm rounded-3xl p-6 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-rose-600/25 border-2 border-rose-500 flex items-center justify-center mx-auto text-rose-400 animate-pulse">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-rose-400">危險操作警告</h3>
              <h4 className="text-base font-bold text-white">徹底清空全服所有排行榜？</h4>
              <p className="text-xs text-slate-400">
                此操作將永久清空所有難度（Lv.1 ~ Lv.5）的所有玩家成績，所有裝置將同步重置為初始空榜！
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setClearAllConfirm(false)}
                className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
              >
                取消返回
              </button>
              <button
                onClick={confirmClearAll}
                disabled={isDeleting}
                className="py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black rounded-xl cursor-pointer shadow-lg shadow-rose-600/30 disabled:opacity-50"
              >
                {isDeleting ? '重置中...' : '確認徹底清空'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
