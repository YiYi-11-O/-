/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Trophy, X, Medal, Crown, Flame, Clock, LogIn, LogOut, CheckCircle2, RefreshCw, User, Sparkles } from 'lucide-react';
import { onAuthStateChanged, signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { subscribeToLeaderboard, LeaderboardEntry } from '../services/leaderboardService';
import { sound } from '../utils/audio';
import { DIFFICULTY_CONFIGS } from './DifficultyScreen';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDifficulty?: number;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  defaultDifficulty = 3,
}) => {
  const [selectedDiff, setSelectedDiff] = useState<number>(defaultDifficulty);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);

  // 監聽 Auth 狀態
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubAuth();
  }, []);

  // 即時監聽該難度的排行榜 (所有裝置即時同步更新)
  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    const unsubLeaderboard = subscribeToLeaderboard(
      selectedDiff,
      (newEntries) => {
        setEntries(newEntries);
        setIsLoading(false);
      },
      () => {
        setIsLoading(false);
      }
    );

    return () => unsubLeaderboard();
  }, [isOpen, selectedDiff]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    try {
      sound.playTap();
      setIsSigningIn(true);
      await signInWithPopup(auth, googleProvider);
      sound.playSuccess();
    } catch (err) {
      console.error('Google Sign In Error:', err);
      sound.playError();
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    sound.playTap();
    await signOut(auth);
  };

  const activeConfig = DIFFICULTY_CONFIGS.find((c) => c.level === selectedDiff) || DIFFICULTY_CONFIGS[2];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="bg-slate-900 border border-slate-700/80 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* 頂部標題與關閉 */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">全球即時排行榜</h3>
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded-full font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  即時同步
                </span>
              </div>
              <p className="text-[11px] text-slate-400">所有裝置雲端同步更新 · 各難度獨立排名</p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playTap();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 難度切換選項卡 */}
        <div className="p-3 bg-slate-950/40 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto">
          {DIFFICULTY_CONFIGS.map((c) => (
            <button
              key={c.level}
              onClick={() => {
                sound.playTap();
                setSelectedDiff(c.level);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                selectedDiff === c.level
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20 scale-102'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Lv.{c.level} {c.name}
            </button>
          ))}
        </div>

        {/* 排名列表區 */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2">
          {isLoading ? (
            <div className="py-16 text-center space-y-2 text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-400" />
              <p className="text-xs">連線至雲端同步排名中...</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="py-14 text-center space-y-2 text-slate-500">
              <Trophy className="w-10 h-10 mx-auto text-slate-700" />
              <p className="text-xs text-slate-400 font-medium">
                Lv.{selectedDiff} {activeConfig.name} 目前尚無排名紀錄！
              </p>
              <p className="text-[11px] text-slate-600">
                成為全服第一個挑戰並登上榜首的玩家吧！
              </p>
            </div>
          ) : (
            entries.map((entry, idx) => {
              const rank = idx + 1;
              const isTop1 = rank === 1;
              const isTop2 = rank === 2;
              const isTop3 = rank === 3;
              const isMe = currentUser && entry.userId === currentUser.uid;

              return (
                <div
                  key={entry.id || idx}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    isTop1
                      ? 'bg-gradient-to-r from-amber-500/20 via-slate-900 to-amber-500/10 border-amber-500/50 shadow-md'
                      : isTop2
                      ? 'bg-gradient-to-r from-slate-300/15 via-slate-900 to-slate-300/5 border-slate-400/40'
                      : isTop3
                      ? 'bg-gradient-to-r from-amber-700/20 via-slate-900 to-amber-700/5 border-amber-700/40'
                      : isMe
                      ? 'bg-indigo-950/40 border-indigo-500/40'
                      : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-900/60'
                  }`}
                >
                  {/* 名次與名稱 */}
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center font-black font-mono text-xs shrink-0">
                      {isTop1 ? (
                        <Crown className="w-5 h-5 text-amber-400 fill-amber-400/30" />
                      ) : isTop2 ? (
                        <Medal className="w-5 h-5 text-slate-300 fill-slate-300/30" />
                      ) : isTop3 ? (
                        <Medal className="w-5 h-5 text-amber-600 fill-amber-600/30" />
                      ) : (
                        <span className="text-slate-500">#{rank}</span>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white text-xs truncate max-w-[130px]">
                          {entry.playerName}
                        </span>
                        {isMe && (
                          <span className="text-[9px] bg-indigo-500/30 text-indigo-300 border border-indigo-500/50 px-1 rounded">
                            我
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                        <span>答對 {entry.solvedCount} 題</span>
                        <span>·</span>
                        <span className="flex items-center gap-0.5 text-orange-400">
                          <Flame className="w-2.5 h-2.5" />
                          {entry.bestStreak} 連擊
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 總得分 */}
                  <div className="text-right">
                    <span className="text-base font-black text-amber-400 font-mono tabular-nums">
                      {entry.score}
                    </span>
                    <span className="block text-[9px] text-slate-500 font-bold">PTS</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 底部帳號登入與排行榜連動列 */}
        <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          {currentUser ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || ''}
                    className="w-7 h-7 rounded-full border border-emerald-500/40"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                )}
                <div className="text-left leading-tight">
                  <div className="text-xs font-bold text-white truncate max-w-[150px]">
                    {currentUser.displayName || '已登入玩家'}
                  </div>
                  <span className="text-[10px] text-emerald-400 font-medium">已連線全球雲端</span>
                </div>
              </div>

              <button
                onClick={handleSignOut}
                className="text-[11px] text-slate-400 hover:text-rose-400 transition-colors p-1"
                title="登出帳號"
              >
                登出
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full gap-2">
              <span className="text-[11px] text-slate-400">
                登入 Google 即可將成績同步上榜！
              </span>

              <button
                onClick={handleGoogleSignIn}
                disabled={isSigningIn}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs rounded-xl transition-all cursor-pointer shadow-md shrink-0"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{isSigningIn ? '連線中...' : 'Google 登入'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
