/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Users,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Search,
  LogIn,
  ShieldAlert,
  User,
  Copy,
  Check,
  Trophy,
  Swords,
  Flame,
  Clock,
  Sparkles,
} from 'lucide-react';
import { onAuthStateChanged, signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import {
  subscribeAllProfiles,
  deleteUserProfile,
  deleteAllUserProfiles,
  UserProfile,
} from '../services/playerProfileService';
import { sound } from '../utils/audio';

export const AdminPlayersTab: React.FC = () => {
  const [players, setPlayers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);

  // 刪除確認彈窗狀態
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [clearAllConfirm, setClearAllConfirm] = useState<boolean>(false);

  // 複製好友代碼提示
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

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
    const unsub = subscribeAllProfiles(
      (data) => {
        setPlayers(data);
        setIsLoading(false);
      },
      (err) => {
        console.error('Failed to load admin player profiles:', err);
        setIsLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const showToast = (text: string, isError = false) => {
    setStatusMessage({ text, isError });
    setTimeout(() => setStatusMessage(null), 3500);
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

  const handleCopyCode = (code: string) => {
    sound.playTap();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // 刪除單一玩家資訊
  const confirmDeletePlayer = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      await deleteUserProfile(deleteTarget.uid);
      sound.playSuccess();
      showToast(`已成功刪除玩家「${deleteTarget.displayName}」(${deleteTarget.friendCode}) 之所有個人戰績與檔案！`);
      setDeleteTarget(null);
    } catch (err: any) {
      sound.playError();
      showToast(err.message || '刪除失敗，請確認已登入管理員帳號', true);
    } finally {
      setIsDeleting(false);
    }
  };

  // 一鍵刪除所有玩家資訊
  const confirmDeleteAllPlayers = async () => {
    try {
      setIsDeleting(true);
      const count = await deleteAllUserProfiles();
      sound.playSuccess();
      showToast(`已成功徹底刪除全服所有 ${count} 位玩家之個人檔案、戰績與好友資訊！`);
      setClearAllConfirm(false);
    } catch (err: any) {
      sound.playError();
      showToast(err.message || '刪除失敗，請確認已登入管理員帳號', true);
    } finally {
      setIsDeleting(false);
    }
  };

  // 篩選搜尋
  const filteredPlayers = players.filter((p) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    return (
      p.displayName?.toLowerCase().includes(term) ||
      p.friendCode?.includes(term) ||
      p.uid?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* 頂部管理控制列 */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-500/15 border border-cyan-500/30 rounded-xl text-cyan-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">玩家資訊資料庫管理與刪除</h3>
                <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                  即時雲端連線
                </span>
              </div>
              <p className="text-xs text-slate-400">
                可單筆管理或一鍵刪除雲端資料庫中所有註冊玩家檔案、稱號取名、單人成就與多人勝率戰績。
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
                className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>登入管理員帳號</span>
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

        {/* 搜尋與危險清空操作列 */}
        <div className="pt-2 border-t border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* 搜尋框 */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜尋玩家暱稱、6 位好友碼或 UID..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl text-xs text-white placeholder-slate-500 outline-none transition-all"
            />
          </div>

          {/* 一鍵刪除所有玩家資訊 (重要核心功能) */}
          <button
            onClick={() => {
              sound.playTap();
              setClearAllConfirm(true);
            }}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black shadow-lg shadow-rose-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shrink-0"
          >
            <ShieldAlert className="w-4 h-4 stroke-[2.5]" />
            <span>一鍵刪除所有玩家資訊</span>
          </button>
        </div>
      </div>

      {/* 玩家數據清單 */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="text-xs font-bold text-white flex items-center gap-2">
            <span>已註冊玩家名單：</span>
            <span className="text-cyan-400 font-mono font-black">{filteredPlayers.length} 位</span>
            {searchTerm && (
              <span className="text-[11px] text-slate-400 font-normal">
                (已套用「{searchTerm}」篩選)
              </span>
            )}
          </div>

          <div className="text-[11px] text-slate-400">
            點擊右側垃圾桶圖示可單獨刪除特定玩家
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            正在連線讀取全服玩家個人資料庫...
          </div>
        ) : filteredPlayers.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Users className="w-10 h-10 text-slate-700 mx-auto" />
            <p className="text-slate-400 text-xs font-medium">
              {searchTerm ? '找不到符合條件的玩家' : '目前尚無玩家建立個人檔案'}
            </p>
            <p className="text-slate-600 text-[11px]">
              玩家在主畫面或對戰取名後，將會在此即時同步顯示
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">玩家暱稱 / 頭像</th>
                  <th className="py-3 px-4">好友代碼</th>
                  <th className="py-3 px-4">多人對決 (勝/負/勝率)</th>
                  <th className="py-3 px-4">單人累計得分</th>
                  <th className="py-3 px-4">單人最高連擊</th>
                  <th className="py-3 px-4">好友數</th>
                  <th className="py-3 px-4">玩家 UID</th>
                  <th className="py-3 px-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredPlayers.map((player) => {
                  const mp = player.multiplayerStats || { matches: 0, wins: 0, losses: 0, draws: 0, totalScore: 0 };
                  const sp = player.singlePlayerStats || { totalScore: 0, totalSolved: 0, bestStreak: 0 };
                  const winRate = mp.matches > 0 ? Math.round((mp.wins / mp.matches) * 100) : 0;
                  const isCopied = copiedCode === player.friendCode;

                  return (
                    <tr
                      key={player.uid}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      {/* 頭像與暱稱 */}
                      <td className="py-3 px-4 font-bold text-white">
                        <div className="flex items-center gap-2">
                          <span className="text-lg p-1 bg-slate-950 rounded-xl border border-slate-800">
                            {player.avatar || '🦊'}
                          </span>
                          <div>
                            <span className="block truncate max-w-[120px]">{player.displayName}</span>
                            <span className="text-[10px] text-slate-500 font-mono block">
                              對戰積分: {mp.totalScore || 0}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 6 位數好友代碼 */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleCopyCode(player.friendCode)}
                          className="flex items-center gap-1.5 px-2 py-1 bg-slate-950 hover:bg-slate-850 rounded-lg border border-slate-800 text-[11px] font-mono font-bold text-cyan-300 transition-colors cursor-pointer"
                          title="點擊複製好友代碼"
                        >
                          <span>{player.friendCode}</span>
                          {isCopied ? (
                            <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />
                          ) : (
                            <Copy className="w-3 h-3 text-slate-500" />
                          )}
                        </button>
                      </td>

                      {/* 多人對戰戰績 */}
                      <td className="py-3 px-4 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className="text-emerald-400 font-bold">{mp.wins}勝</span>
                          <span className="text-slate-500">/</span>
                          <span className="text-rose-400">{mp.losses}負</span>
                          <span className="text-slate-500">·</span>
                          <span className="text-amber-400 font-bold">勝率 {winRate}%</span>
                          <span className="text-[10px] text-slate-500">({mp.matches}場)</span>
                        </div>
                      </td>

                      {/* 單人累計總分 */}
                      <td className="py-3 px-4 font-mono font-bold text-amber-300">
                        {sp.totalScore || 0} 分
                      </td>

                      {/* 單人最高連擊 */}
                      <td className="py-3 px-4 font-mono text-orange-400 font-bold">
                        {sp.bestStreak || 0} 連擊
                      </td>

                      {/* 好友數 */}
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {player.friendUids?.length || 0} 人
                      </td>

                      {/* UID */}
                      <td className="py-3 px-4 text-[10px] text-slate-500 font-mono">
                        <span title={player.uid}>{player.uid.slice(0, 10)}...</span>
                      </td>

                      {/* 刪除操作 */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            sound.playTap();
                            setDeleteTarget(player);
                          }}
                          className="p-1.5 text-rose-400 hover:text-white bg-rose-950/30 hover:bg-rose-900/60 rounded-lg border border-rose-800/30 transition-colors cursor-pointer"
                          title="刪除此玩家資訊"
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

      {/* 單筆玩家刪除確認彈窗 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-3xl p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-400">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-white">確認刪除此玩家資訊？</h3>
              <p className="text-xs text-slate-400">
                即將從雲端資料庫永久刪除該玩家之暱稱、好友關係與個人戰績檔案：
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-left text-xs space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xl">{deleteTarget.avatar || '🦊'}</span>
                <div>
                  <strong className="text-white text-sm block">{deleteTarget.displayName}</strong>
                  <span className="text-slate-500 text-[10px] font-mono">好友碼: {deleteTarget.friendCode}</span>
                </div>
              </div>
              <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-850">
                對戰紀錄：<strong className="text-amber-400">{deleteTarget.multiplayerStats?.wins || 0}勝 {deleteTarget.multiplayerStats?.losses || 0}負</strong> · 累計積分：<strong className="text-amber-400">{deleteTarget.multiplayerStats?.totalScore || 0}分</strong>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={confirmDeletePlayer}
                disabled={isDeleting}
                className="py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md disabled:opacity-50"
              >
                {isDeleting ? '刪除中...' : '確認刪除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 一鍵刪除所有玩家資訊確認彈窗 (危險操作警告) */}
      {clearAllConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-rose-600 w-full max-w-sm rounded-3xl p-6 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-rose-600/25 border-2 border-rose-500 flex items-center justify-center mx-auto text-rose-400 animate-pulse">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-rose-400">危險操作警告</h3>
              <h4 className="text-base font-bold text-white">徹底刪除全服「所有玩家資訊」？</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                此操作將永久清除全服共 <strong className="text-rose-300 font-mono font-bold">{players.length}</strong> 位玩家之自訂暱稱、頭像、6 位好友碼、好友清單、單人成就紀錄與多人 1v1 對決勝率戰績！
              </p>
            </div>

            <div className="p-3 bg-rose-950/30 border border-rose-800/40 rounded-xl text-left text-xs text-rose-300/90 space-y-1">
              <div>⚠️ 此操作為不可逆之資料庫清理程序</div>
              <div>⚠️ 所有玩家開啟遊戲後將重設為預設初始稱號</div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setClearAllConfirm(false)}
                className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
              >
                取消返回
              </button>
              <button
                onClick={confirmDeleteAllPlayers}
                disabled={isDeleting}
                className="py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black rounded-xl cursor-pointer shadow-lg shadow-rose-600/30 disabled:opacity-50"
              >
                {isDeleting ? '正在徹底清除中...' : '確認刪除所有玩家'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
