/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Trophy,
  Swords,
  UserPlus,
  Check,
  Flame,
  Clock,
  Sparkles,
  Shield,
  Crown,
} from 'lucide-react';
import {
  fetchUserProfile,
  addFriend,
  getLocalProfile,
  UserProfile,
} from '../services/playerProfileService';
import { sound } from '../utils/audio';

interface OpponentStatsModalProps {
  isOpen: boolean;
  opponentUid?: string | null;
  opponentName?: string;
  onClose: () => void;
}

export const OpponentStatsModal: React.FC<OpponentStatsModalProps> = ({
  isOpen,
  opponentUid,
  opponentName = '對手玩家',
  onClose,
}) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFriend, setIsFriend] = useState<boolean>(false);
  const [justAdded, setJustAdded] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || !opponentUid) return;

    setIsLoading(true);
    setJustAdded(false);

    // 檢查是否已在我的好友名單
    const myProfile = getLocalProfile();
    setIsFriend(myProfile.friendUids.includes(opponentUid));

    fetchUserProfile(opponentUid).then((data) => {
      setProfile(data);
      setIsLoading(false);
    });
  }, [isOpen, opponentUid]);

  if (!isOpen) return null;

  const handleAddFriend = async () => {
    if (!opponentUid) return;
    sound.playSuccess();
    await addFriend(opponentUid);
    setIsFriend(true);
    setJustAdded(true);
  };

  const matches = profile?.multiplayerStats.matches || 0;
  const wins = profile?.multiplayerStats.wins || 0;
  const winRate = matches > 0 ? Math.round((wins / matches) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="bg-slate-900 border border-slate-700/80 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden space-y-4 p-5">
        {/* 頂部關閉列 */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Swords className="w-4 h-4 text-rose-400" />
            <h3 className="text-sm font-bold text-white">對手公開戰績檔案</h3>
          </div>
          <button
            onClick={() => {
              sound.playTap();
              onClose();
            }}
            className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-500">
            正在調取對手戰績紀錄...
          </div>
        ) : (
          <div className="space-y-4">
            {/* 頭像與暱稱 */}
            <div className="text-center space-y-1.5">
              <div className="w-16 h-16 rounded-3xl bg-rose-500/15 border-2 border-rose-500/30 flex items-center justify-center text-3xl mx-auto shadow-lg shadow-rose-500/10">
                {profile?.avatar || '🦁'}
              </div>

              <div>
                <h4 className="text-base font-black text-white">
                  {profile?.displayName || opponentName}
                </h4>
                <span className="text-[10px] text-slate-400 font-mono">
                  好友代碼: <strong className="text-cyan-300 font-bold">{profile?.friendCode || '------'}</strong>
                </span>
              </div>
            </div>

            {/* 核心戰績數據看板 */}
            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">多人對戰勝率</span>
                <span className="text-amber-400 font-black font-mono text-base">
                  {winRate}%
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                <div className="p-2 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">總場次</span>
                  <span className="font-bold font-mono text-white text-sm">{matches}</span>
                </div>
                <div className="p-2 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">勝場</span>
                  <span className="font-bold font-mono text-emerald-400 text-sm">{wins}</span>
                </div>
                <div className="p-2 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">對戰總分</span>
                  <span className="font-bold font-mono text-amber-400 text-sm">
                    {profile?.multiplayerStats.totalScore || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* 加好友操作 */}
            <div className="pt-1">
              {isFriend ? (
                <div className="w-full py-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-center text-xs text-emerald-300 font-bold flex items-center justify-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                  <span>{justAdded ? '已成功加為好友！' : '你們已經是好友了'}</span>
                </div>
              ) : (
                <button
                  onClick={handleAddFriend}
                  className="w-full py-2.5 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-rose-500/20 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>加對方為好友</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
