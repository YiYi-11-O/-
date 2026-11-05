/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Users,
  Copy,
  Check,
  Trophy,
  Swords,
  Edit2,
  Save,
  Search,
  UserPlus,
  Trash2,
  Sparkles,
  Flame,
  Shield,
  Crown,
} from 'lucide-react';
import {
  getLocalProfile,
  updatePlayerIdentity,
  searchPlayerByFriendCode,
  addFriend,
  removeFriend,
  fetchFriendsProfiles,
  AVATAR_OPTIONS,
  UserProfile,
} from '../services/playerProfileService';
import { sound } from '../utils/audio';

interface PlayerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated?: (updated: UserProfile) => void;
  onChallengeFriend?: (friend: UserProfile) => void;
}

export const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({
  isOpen,
  onClose,
  onProfileUpdated,
  onChallengeFriend,
}) => {
  const [profile, setProfile] = useState<UserProfile>(() => getLocalProfile());
  const [activeTab, setActiveTab] = useState<'profile' | 'friends'>('profile');

  // 取名字狀態
  const [editingName, setEditingName] = useState<string>(profile.displayName);
  const [selectedAvatar, setSelectedAvatar] = useState<string>(profile.avatar);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // 加好友狀態
  const [searchCode, setSearchCode] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResult, setSearchResult] = useState<UserProfile | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [friendsList, setFriendsList] = useState<UserProfile[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      const p = getLocalProfile();
      setProfile(p);
      setEditingName(p.displayName);
      setSelectedAvatar(p.avatar);
      loadFriends();
    }
  }, [isOpen]);

  const loadFriends = async () => {
    setIsLoadingFriends(true);
    const list = await fetchFriendsProfiles();
    setFriendsList(list);
    setIsLoadingFriends(false);
  };

  if (!isOpen) return null;

  // 複製好友代碼
  const handleCopyFriendCode = () => {
    sound.playTap();
    navigator.clipboard.writeText(profile.friendCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // 儲存取名字與頭像更換
  const handleSaveIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    sound.playSuccess();
    const updated = await updatePlayerIdentity(editingName, selectedAvatar);
    setProfile(updated);
    if (onProfileUpdated) {
      onProfileUpdated(updated);
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // 搜尋好友
  const handleSearchFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCode.trim()) return;

    sound.playTap();
    setIsSearching(true);
    setSearchError(null);
    setSearchResult(null);

    const found = await searchPlayerByFriendCode(searchCode);
    setIsSearching(false);

    if (found) {
      if (found.uid === profile.uid) {
        setSearchError('這是您自己的好友代碼喔！');
      } else {
        setSearchResult(found);
      }
    } else {
      setSearchError('找不到對應好友代碼的玩家，請確認 6 位數代碼。');
    }
  };

  // 新增搜尋到的好友
  const handleAddFoundFriend = async () => {
    if (!searchResult) return;
    sound.playSuccess();
    await addFriend(searchResult.uid);
    setSearchResult(null);
    setSearchCode('');
    loadFriends();
  };

  // 刪除好友
  const handleRemoveFriend = async (targetUid: string) => {
    sound.playTap();
    await removeFriend(targetUid);
    loadFriends();
  };

  const matches = profile.multiplayerStats.matches;
  const wins = profile.multiplayerStats.wins;
  const winRate = matches > 0 ? Math.round((wins / matches) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="bg-slate-900 border border-slate-700/80 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* 頂部 Header 與分頁切換 */}
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800">
            <button
              onClick={() => {
                sound.playTap();
                setActiveTab('profile');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>個人資訊與取名</span>
            </button>

            <button
              onClick={() => {
                sound.playTap();
                setActiveTab('friends');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'friends'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>好友名單 ({profile.friendUids.length})</span>
            </button>
          </div>

          <button
            onClick={() => {
              sound.playTap();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-900 border border-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 內容區塊 */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'profile' ? (
            <div className="space-y-4">
              {/* 取名字與頭像自選卡片 */}
              <form onSubmit={handleSaveIdentity} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>自訂玩家暱稱與頭像</span>
                  </span>

                  {savedSuccess && (
                    <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1 animate-fade-in">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>設定已保存！</span>
                    </span>
                  )}
                </div>

                {/* 暱稱輸入 */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    maxLength={16}
                    placeholder="請輸入你的心算大師暱稱"
                    required
                    className="flex-1 py-2 px-3 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl text-xs font-bold text-white outline-none"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow transition-all cursor-pointer"
                  >
                    保存暱稱
                  </button>
                </div>

                {/* 頭像選擇器 */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] text-slate-400 block">挑選專屬頭像：</span>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                    {AVATAR_OPTIONS.map((item) => {
                      const isChosen = selectedAvatar === item.emoji;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            sound.playTap();
                            setSelectedAvatar(item.emoji);
                          }}
                          className={`h-11 rounded-xl text-xl flex items-center justify-center transition-all cursor-pointer ${
                            isChosen
                              ? 'bg-amber-400/20 border-2 border-amber-400 scale-105 shadow-md'
                              : 'bg-slate-900 border border-slate-800 hover:bg-slate-850'
                          }`}
                          title={item.name}
                        >
                          {item.emoji}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </form>

              {/* 專屬好友代碼卡片 */}
              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
                    我的專屬好友代碼
                  </span>
                  <span className="text-2xl font-black font-mono tracking-widest text-cyan-300">
                    {profile.friendCode}
                  </span>
                </div>

                <button
                  onClick={handleCopyFriendCode}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-750 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                      <span className="text-emerald-400">已複製</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>複製代碼</span>
                    </>
                  )}
                </button>
              </div>

              {/* 多人對戰與個人生涯統計 */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <div className="flex items-center gap-1.5 text-rose-400">
                    <Swords className="w-4 h-4" />
                    <span>多人線上對戰生涯戰績</span>
                  </div>
                  <span className="text-amber-400 font-mono">勝率 {winRate}%</span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 bg-slate-900 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">總場次</span>
                    <span className="font-bold font-mono text-white text-sm">{matches}</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">勝場</span>
                    <span className="font-bold font-mono text-emerald-400 text-sm">{wins}</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">敗場</span>
                    <span className="font-bold font-mono text-rose-400 text-sm">{profile.multiplayerStats.losses}</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">累積得分</span>
                    <span className="font-bold font-mono text-amber-400 text-sm">{profile.multiplayerStats.totalScore}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* 好友名單分頁 */
            <div className="space-y-4">
              {/* 加好友輸入框 */}
              <form onSubmit={handleSearchFriend} className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2.5">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>輸入 6 位數好友代碼新增</span>
                </span>

                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={8}
                    value={searchCode}
                    onChange={(e) => {
                      setSearchCode(e.target.value);
                      setSearchError(null);
                    }}
                    placeholder="例如: 849201"
                    className="flex-1 py-2 px-3 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl text-xs font-mono font-bold text-white outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isSearching || !searchCode.trim()}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs rounded-xl shadow transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSearching ? '搜尋中...' : '搜尋好友'}
                  </button>
                </div>

                {searchError && (
                  <p className="text-[11px] text-rose-400 font-medium animate-fade-in">
                    {searchError}
                  </p>
                )}

                {/* 搜尋到的玩家卡片 */}
                {searchResult && (
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-700 flex items-center justify-between animate-fade-in">
                    <div className="flex items-center gap-2.5">
                      <div className="text-2xl">{searchResult.avatar}</div>
                      <div>
                        <h5 className="text-xs font-bold text-white">{searchResult.displayName}</h5>
                        <span className="text-[10px] text-slate-400 font-mono">
                          代碼: {searchResult.friendCode} · 勝率 {searchResult.multiplayerStats.matches > 0 ? Math.round((searchResult.multiplayerStats.wins / searchResult.multiplayerStats.matches) * 100) : 0}%
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddFoundFriend}
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-lg shadow cursor-pointer"
                    >
                      確認加為好友
                    </button>
                  </div>
                )}
              </form>

              {/* 好友列表 */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 block px-1">
                  現有好友清單 ({friendsList.length})
                </span>

                {isLoadingFriends ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    載入好友資料中...
                  </div>
                ) : friendsList.length === 0 ? (
                  <div className="py-10 text-center space-y-1.5 bg-slate-950 rounded-2xl border border-slate-800">
                    <Users className="w-8 h-8 text-slate-700 mx-auto" />
                    <p className="text-xs text-slate-400">目前尚無好友</p>
                    <p className="text-[11px] text-slate-600">
                      可分享上方專屬代碼或輸入對手代碼新增！
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                    {friendsList.map((friend) => {
                      const fMatches = friend.multiplayerStats.matches;
                      const fWins = friend.multiplayerStats.wins;
                      const fRate = fMatches > 0 ? Math.round((fWins / fMatches) * 100) : 0;
                      return (
                        <div
                          key={friend.uid}
                          className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="text-2xl">{friend.avatar}</div>
                            <div>
                              <h5 className="text-xs font-bold text-white">{friend.displayName}</h5>
                              <div className="text-[10px] text-slate-400 font-mono">
                                <span>代碼: {friend.friendCode}</span>
                                <span className="mx-1">·</span>
                                <span className="text-amber-400 font-bold">{fRate}% 勝率</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {onChallengeFriend && (
                              <button
                                onClick={() => {
                                  sound.playTap();
                                  onClose();
                                  onChallengeFriend(friend);
                                }}
                                className="px-2.5 py-1.5 bg-gradient-to-r from-rose-500 to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow cursor-pointer active:scale-95"
                              >
                                發起對戰
                              </button>
                            )}

                            <button
                              onClick={() => handleRemoveFriend(friend.uid)}
                              className="p-1.5 text-slate-600 hover:text-rose-400 rounded-lg hover:bg-slate-900 cursor-pointer transition-colors"
                              title="解除好友"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
