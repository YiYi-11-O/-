/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Swords,
  Plus,
  LogIn,
  Users,
  Copy,
  ArrowLeft,
  Sparkles,
  Flame,
  Clock,
  User,
  Check,
  RefreshCw,
  Search,
} from 'lucide-react';
import {
  subscribeOpenRooms,
  createBattleRoom,
  joinBattleRoomByCode,
  getLocalPlayerName,
  setLocalPlayerName,
  BattleRoomData,
} from '../services/multiplayerService';
import { DIFFICULTY_CONFIGS } from './DifficultyScreen';
import { sound } from '../utils/audio';
import { PlayerProfileModal } from './PlayerProfileModal';
import { OpponentStatsModal } from './OpponentStatsModal';
import { getLocalProfile, PlayerProfile, UserProfile } from '../services/playerProfileService';

interface MultiplayerLobbyProps {
  onEnterRoom: (roomId: string, isHost: boolean) => void;
  onBackToTitle: () => void;
}

export const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({
  onEnterRoom,
  onBackToTitle,
}) => {
  const [profile, setProfile] = useState<PlayerProfile>(() => getLocalProfile());
  const [playerName, setPlayerName] = useState<string>(() => getLocalPlayerName());
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [inspectHost, setInspectHost] = useState<{ uid?: string; name: string } | null>(null);

  // 建立房間設定
  const [createDifficulty, setCreateDifficulty] = useState<number>(3);
  const [createRounds, setCreateRounds] = useState<number>(3);
  const [isCreating, setIsCreating] = useState<boolean>(false);

  // 輸入代碼加入
  const [inputCode, setInputCode] = useState<string>('');
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // 開放大廳房間
  const [openRooms, setOpenRooms] = useState<BattleRoomData[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState<boolean>(true);

  useEffect(() => {
    const unsub = subscribeOpenRooms(
      (rooms) => {
        setOpenRooms(rooms);
        setIsLoadingRooms(false);
      },
      () => {
        setIsLoadingRooms(false);
      }
    );
    return () => unsub();
  }, []);

  const handleProfileUpdated = (updated: PlayerProfile) => {
    setProfile(updated);
    setPlayerName(updated.displayName);
    setLocalPlayerName(updated.displayName);
  };

  const handleChallengeFriend = async (friend: UserProfile) => {
    try {
      sound.playTap();
      setIsCreating(true);
      const roomId = await createBattleRoom(createDifficulty, createRounds, playerName);
      sound.playSuccess();
      setIsProfileModalOpen(false);
      onEnterRoom(roomId, true);
    } catch (err: any) {
      console.error('Failed to create challenge room:', err);
      sound.playError();
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateRoom = async () => {
    try {
      sound.playTap();
      setIsCreating(true);
      const roomId = await createBattleRoom(createDifficulty, createRounds, playerName);
      sound.playSuccess();
      onEnterRoom(roomId, true);
    } catch (err: any) {
      console.error('Failed to create room:', err);
      sound.playError();
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinByCode = async () => {
    if (!inputCode.trim()) return;
    try {
      sound.playTap();
      setIsJoining(true);
      setJoinError(null);
      const roomId = await joinBattleRoomByCode(inputCode, playerName);
      sound.playSuccess();
      onEnterRoom(roomId, false);
    } catch (err: any) {
      sound.playError();
      setJoinError(err.message || '加入房間失敗，請確認代碼');
    } finally {
      setIsJoining(false);
    }
  };

  const handleQuickJoin = async (room: BattleRoomData) => {
    try {
      sound.playTap();
      setIsJoining(true);
      setJoinError(null);
      const roomId = await joinBattleRoomByCode(room.roomCode, playerName);
      sound.playSuccess();
      onEnterRoom(roomId, false);
    } catch (err: any) {
      sound.playError();
      setJoinError(err.message || '加入該房間失敗');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-5 select-none animate-fade-in pb-8">
      {/* 頂部導航與標題 */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-3xl shadow-xl flex items-center justify-between">
        <button
          onClick={() => {
            sound.playTap();
            onBackToTitle();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-850 hover:bg-slate-800 rounded-xl transition-colors border border-slate-750 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>返回大廳</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-br from-rose-500 to-amber-500 text-slate-950 rounded-xl font-bold">
            <Swords className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-sm font-black text-white">多人線上 1v1 即時對戰</h2>
            <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              雲端跨裝置連線
            </span>
          </div>
        </div>

        {/* 玩家個人資訊按鈕 (點擊可取名、改頭像、看戰績與好友) */}
        <button
          onClick={() => {
            sound.playTap();
            setIsProfileModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 rounded-2xl border border-slate-800 hover:border-amber-500/40 text-xs text-slate-200 transition-all cursor-pointer shadow-inner active:scale-95"
          title="點擊查看玩家資訊、取名字與管理好友"
        >
          <span className="text-sm">{profile.avatar}</span>
          <span className="font-bold truncate max-w-[70px] text-amber-300">{profile.displayName}</span>
          <span className="text-[10px] bg-slate-800 text-slate-400 px-1 rounded">資料</span>
        </button>
      </div>

      {/* 快捷加入與快速建立兩大主操作 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* 左側：快速輸入房間代碼加入 */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3.5 shadow-xl flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400">
              <Search className="w-4 h-4" />
              <span>輸入 4 位數邀請碼</span>
            </div>
            <p className="text-[11px] text-slate-400">
              朋友已開好房間？直接輸入 4 位邀請碼即可立即連線對決！
            </p>
          </div>

          <div className="space-y-2">
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={inputCode}
                onChange={(e) => {
                  setInputCode(e.target.value.replace(/\D/g, ''));
                  setJoinError(null);
                }}
                placeholder="例如: 8492"
                className="w-full py-3 px-4 bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-2xl text-center text-xl font-mono font-black text-white tracking-widest outline-none transition-all"
              />
            </div>

            {joinError && (
              <p className="text-[11px] text-rose-400 text-center font-medium animate-fade-in">
                {joinError}
              </p>
            )}

            <button
              onClick={handleJoinByCode}
              disabled={isJoining || inputCode.length < 4}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-slate-950 font-black text-sm rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20 active:scale-95"
            >
              <LogIn className="w-4 h-4 stroke-[2.5]" />
              <span>{isJoining ? '連線加入中...' : '加入房間對戰'}</span>
            </button>
          </div>
        </div>

        {/* 右側：自訂對決規則建立新房間 */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3.5 shadow-xl">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
              <Plus className="w-4 h-4" />
              <span>建立新對戰房間</span>
            </div>
            <p className="text-[11px] text-slate-400">
              挑選對決難度與總局數，建立房間後分享代碼給好友。
            </p>
          </div>

          <div className="space-y-3">
            {/* 選擇難度 */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
                <span>對戰難度：</span>
                <span className="text-amber-300 font-mono font-bold">
                  Lv.{createDifficulty} {DIFFICULTY_CONFIGS.find((c) => c.level === createDifficulty)?.name}
                </span>
              </label>
              <div className="grid grid-cols-5 gap-1">
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => {
                      sound.playTap();
                      setCreateDifficulty(lvl);
                    }}
                    className={`py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                      createDifficulty === lvl
                        ? 'bg-amber-400 text-slate-950 font-black scale-105 shadow-md'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    Lv.{lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* 選擇回合數 */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
                <span>勝負制：</span>
                <span className="text-cyan-300 font-bold">{createRounds === 3 ? '3局2勝' : '5局3勝'}</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[3, 5].map((rounds) => (
                  <button
                    key={rounds}
                    onClick={() => {
                      sound.playTap();
                      setCreateRounds(rounds);
                    }}
                    className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      createRounds === rounds
                        ? 'bg-cyan-400 text-slate-950 font-black'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {rounds} 回合競賽
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleCreateRoom}
              disabled={isCreating}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-sm rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20 active:scale-95"
            >
              <Sparkles className="w-4 h-4 fill-current" />
              <span>{isCreating ? '建立房間中...' : '建立對戰房間'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 開放大廳房間列表 (即時串流更新) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">大廳等待中房間</h3>
            <span className="text-[10px] bg-slate-950 text-slate-400 px-2 py-0.5 rounded-full border border-slate-800 font-mono">
              {openRooms.length} 間開放中
            </span>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>即時刷新</span>
          </div>
        </div>

        {isLoadingRooms ? (
          <div className="py-12 text-center text-xs text-slate-500">
            正在搜尋等待對手中的房間...
          </div>
        ) : openRooms.length === 0 ? (
          <div className="py-10 text-center space-y-2 bg-slate-950/60 rounded-2xl border border-slate-800/80 p-4">
            <Swords className="w-8 h-8 text-slate-700 mx-auto" />
            <p className="text-xs text-slate-400 font-medium">目前尚無等待中的對戰房間</p>
            <p className="text-[11px] text-slate-600">
              點擊上方「建立新對戰房間」邀請好友加入對決吧！
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
            {openRooms.map((room) => {
              const diffConfig = DIFFICULTY_CONFIGS.find((c) => c.level === room.difficulty);
              return (
                <div
                  key={room.id}
                  className="p-3 bg-slate-950 rounded-2xl border border-slate-800 hover:border-slate-700 flex items-center justify-between transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          sound.playTap();
                          setInspectHost({ uid: room.host.uid, name: room.host.displayName });
                        }}
                        className="font-bold text-xs text-white hover:text-amber-300 transition-colors flex items-center gap-1 cursor-pointer"
                        title="點擊查看房主戰績與加好友"
                      >
                        <span>{room.host.displayName}</span>
                        <span className="text-[9px] text-slate-400 bg-slate-850 px-1 py-0.5 rounded border border-slate-750">
                          戰績
                        </span>
                      </button>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${diffConfig?.badgeBg || 'bg-slate-800 text-slate-300'}`}>
                        Lv.{room.difficulty} {diffConfig?.name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {room.totalRounds}局制
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span>邀請碼: <strong className="font-mono text-cyan-300 font-black">{room.roomCode}</strong></span>
                      <span>·</span>
                      <span className="flex items-center gap-1 text-amber-300">
                        <Clock className="w-3 h-3" />
                        {room.roundTimeLimit}s / 局
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleQuickJoin(room)}
                    disabled={isJoining}
                    className="px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    進入對決
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 玩家個人資訊與好友彈窗 */}
      <PlayerProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onProfileUpdated={handleProfileUpdated}
        onChallengeFriend={handleChallengeFriend}
      />

      {/* 查看房主或對手詳細戰績與加好友彈窗 */}
      <OpponentStatsModal
        isOpen={!!inspectHost}
        onClose={() => setInspectHost(null)}
        opponentUid={inspectHost?.uid}
        opponentName={inspectHost?.name}
      />
    </div>
  );
};
