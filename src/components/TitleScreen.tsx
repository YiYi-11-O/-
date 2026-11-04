/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Play, Sparkles, Settings, Trophy } from 'lucide-react';
import { sound } from '../utils/audio';

interface TitleScreenProps {
  onStartGame: () => void;
  onOpenBackendLogin: () => void;
  onOpenLeaderboard?: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartGame,
  onOpenBackendLogin,
  onOpenLeaderboard,
}) => {
  const handleStart = () => {
    sound.playTap();
    onStartGame();
  };

  return (
    <div className="relative w-full max-w-md mx-auto min-h-[580px] flex flex-col items-center justify-between bg-gradient-to-b from-slate-900 via-slate-950 to-[#070a12] border border-slate-800/80 rounded-3xl p-6 sm:p-10 shadow-2xl overflow-hidden select-none">
      {/* 裝飾光暈 */}
      <div className="absolute top-1/4 -left-20 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* 頂部標語 */}
      <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 bg-amber-500/10 px-3.5 py-1.5 rounded-full border border-amber-500/20">
        <Sparkles className="w-3.5 h-3.5" />
        <span>益智腦力激盪 · 手遊版</span>
      </div>

      {/* 核心主標題 */}
      <div className="text-center space-y-4 my-auto py-8">
        <h1 className="text-5xl sm:text-7xl font-black text-white tracking-tight drop-shadow-md">
          心算大師
        </h1>
        <p className="text-sm sm:text-base font-semibold text-slate-400 tracking-widest">
          MENTAL MATH MASTER
        </p>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed pt-2">
          先乘除後加減，嚴格整除不留小數！<br />
          運用 4 張卡牌，解開目標數字的唯一密碼。
        </p>

        {/* 主操作按鈕 */}
        <div className="pt-6 w-full max-w-xs mx-auto space-y-3">
          <button
            onClick={handleStart}
            className="w-full py-4.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xl rounded-2xl transition-all duration-200 hover:scale-105 active:scale-95 shadow-xl shadow-amber-500/25 flex items-center justify-center gap-3 cursor-pointer"
          >
            <Play className="w-6 h-6 fill-current" />
            <span>開始遊戲</span>
          </button>

          {onOpenLeaderboard && (
            <button
              onClick={() => {
                sound.playTap();
                onOpenLeaderboard();
              }}
              className="w-full py-2.5 bg-slate-900/80 hover:bg-slate-800 text-amber-300 border border-slate-800 hover:border-amber-500/40 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>全服即時排行榜 (跨裝置同步)</span>
            </button>
          )}
        </div>
      </div>

      {/* 標題右下角：不起眼的進入後台按鈕 */}
      <div className="w-full flex items-center justify-between pt-6 text-[11px] text-slate-600">
        <span>版本 1.0.0</span>

        {/* 不起眼的後台入口 (低透明度、低調文字與小齒輪) */}
        <button
          onClick={() => {
            sound.playTap();
            onOpenBackendLogin();
          }}
          className="opacity-30 hover:opacity-100 transition-opacity flex items-center gap-1.5 text-slate-500 hover:text-slate-300 p-1.5 rounded-lg hover:bg-slate-900/60 cursor-pointer"
          title="系統開發與管理後台"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>後台管理</span>
        </button>
      </div>
    </div>
  );
};
