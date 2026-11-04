/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Play, Clock, ArrowLeft, Sparkles, Check, Trophy } from 'lucide-react';
import { sound } from '../utils/audio';
import {
  DifficultyConfig,
  getDifficultyConfigs,
  subscribeTimeLimits,
} from '../services/gameSettingsService';

export type { DifficultyConfig };
export { getDifficultyConfigs };
export const DIFFICULTY_CONFIGS: DifficultyConfig[] = getDifficultyConfigs();

interface DifficultyScreenProps {
  initialDifficulty?: number;
  onSelectAndStart: (difficulty: number) => void;
  onBackToTitle: () => void;
  onOpenLeaderboard?: (difficulty: number) => void;
}

export const DifficultyScreen: React.FC<DifficultyScreenProps> = ({
  initialDifficulty = 3,
  onSelectAndStart,
  onBackToTitle,
  onOpenLeaderboard,
}) => {
  const [selectedLvl, setSelectedLvl] = useState<number>(initialDifficulty);
  const [configs, setConfigs] = useState<DifficultyConfig[]>(() => getDifficultyConfigs());

  useEffect(() => {
    return subscribeTimeLimits(() => {
      setConfigs(getDifficultyConfigs());
    });
  }, []);

  const selectedConfig = configs.find((c) => c.level === selectedLvl) || configs[2] || getDifficultyConfigs()[2];

  const handleStart = () => {
    sound.playTap();
    onSelectAndStart(selectedLvl);
  };

  const handleSelect = (lvl: number) => {
    sound.playTap();
    setSelectedLvl(lvl);
  };

  return (
    <div className="w-full max-w-md mx-auto min-h-[580px] flex flex-col justify-between bg-gradient-to-b from-slate-900 via-slate-950 to-[#070a12] border border-slate-800 rounded-3xl p-5 shadow-2xl relative overflow-hidden animate-fade-in select-none">
      {/* 裝飾背景 */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* 頂部導航與標題 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              sound.playTap();
              onBackToTitle();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-850 hover:bg-slate-800 rounded-xl transition-colors border border-slate-700/60 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>主頁</span>
          </button>

          <div className="flex items-center gap-1 text-[11px] text-amber-400 font-medium bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
            <Sparkles className="w-3 h-3" />
            <span>選擇挑戰難度</span>
          </div>
        </div>

        <div className="text-center space-y-1">
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            選擇難度階梯
          </h2>
          <p className="text-[11px] text-slate-400">
            每題計時倒數，回答不出來將立即結算分數！
          </p>
        </div>

        {/* 手遊風格列表：5 種難度選項卡片 */}
        <div className="space-y-2 max-h-[360px] overflow-y-auto pr-0.5">
          {configs.map((item) => {
            const isSelected = selectedLvl === item.level;
            return (
              <button
                key={item.level}
                onClick={() => handleSelect(item.level)}
                className={`w-full p-3 rounded-2xl border text-left transition-all cursor-pointer relative flex items-center justify-between ${
                  isSelected
                    ? `bg-slate-900/90 ${item.borderColor} ring-2 ring-amber-400/50 shadow-lg shadow-amber-500/10 scale-[1.01]`
                    : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-900/60 hover:border-slate-700 opacity-75 hover:opacity-100'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-400">Lv.{item.level}</span>
                    <h3 className={`text-sm font-black ${item.color} tracking-tight`}>
                      {item.name}
                    </h3>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${item.badgeBg}`}>
                      {item.tag}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 text-amber-300 font-mono font-bold">
                      <Clock className="w-3 h-3" />
                      {item.timeLimit} 秒 / 題
                    </span>
                    <span>數字: <strong className="text-slate-300 font-mono">{item.numRange}</strong></span>
                  </div>

                  <p className="text-[10px] text-slate-500 leading-snug">
                    {item.desc}
                  </p>
                </div>

                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-md ml-2">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 底部確認與開始遊戲按鈕 */}
      <div className="pt-3 border-t border-slate-800/80 space-y-2 mt-2">
        <div className="text-[11px] text-slate-400 text-center">
          已選定：<strong className="text-white font-bold">{selectedConfig.name}</strong>（限時 <strong className="text-amber-300 font-mono">{selectedConfig.timeLimit}s</strong>）
        </div>

        <button
          onClick={handleStart}
          className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-base rounded-2xl transition-all duration-200 hover:scale-[1.02] active:scale-95 shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>進入遊戲挑戰</span>
        </button>

        {onOpenLeaderboard && (
          <button
            onClick={() => {
              sound.playTap();
              onOpenLeaderboard(selectedLvl);
            }}
            className="w-full py-2 bg-slate-900/80 hover:bg-slate-850 text-slate-300 hover:text-amber-300 border border-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>查看 Lv.{selectedLvl} 全球即時排行</span>
          </button>
        )}
      </div>
    </div>
  );
};
