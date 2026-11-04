/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Clock, RotateCcw, Save, Check, Zap, Coffee, ShieldAlert, Sparkles, Sliders } from 'lucide-react';
import {
  getTimeLimits,
  saveTimeLimits,
  resetTimeLimits,
  DEFAULT_TIME_LIMITS,
  DifficultyConfig,
  getDifficultyConfigs,
} from '../services/gameSettingsService';
import { sound } from '../utils/audio';

export const AdminTimerSettingsTab: React.FC = () => {
  const [limits, setLimits] = useState<Record<number, number>>(() => getTimeLimits());
  const [configs, setConfigs] = useState<DifficultyConfig[]>(() => getDifficultyConfigs());
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    setConfigs(getDifficultyConfigs());
  }, [limits]);

  const handleChange = (lvl: number, val: number) => {
    const clamped = Math.max(5, Math.min(300, val));
    setLimits((prev) => ({
      ...prev,
      [lvl]: clamped,
    }));
    setSavedSuccess(false);
  };

  const handleStep = (lvl: number, delta: number) => {
    sound.playTap();
    handleChange(lvl, (limits[lvl] || 30) + delta);
  };

  const handleSave = () => {
    sound.playSuccess();
    saveTimeLimits(limits);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleReset = () => {
    sound.playTap();
    const defaults = resetTimeLimits();
    setLimits(defaults);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const applyPreset = (presetName: string, presetLimits: Record<number, number>) => {
    sound.playTap();
    setLimits(presetLimits);
    saveTimeLimits(presetLimits);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* 標題與說明卡片 */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">各難度每題答題時間調整</h3>
              <p className="text-xs text-slate-400">
                可單獨設定 Lv.1 ~ Lv.5 每一題的倒數計時秒數（範圍 5 秒 ~ 300 秒），修改後立即於前台遊戲生效。
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="還原為系統初始預設時間"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>恢復預設</span>
            </button>

            <button
              onClick={handleSave}
              className="px-4 py-1.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 stroke-[3] text-slate-950" />
                  <span>已保存並生效！</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>保存時間設定</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 快捷預設配置按鈕 */}
        <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-slate-400 font-medium">快捷預設模式：</span>

          <button
            onClick={() =>
              applyPreset('預設模式', { 1: 45, 2: 40, 3: 35, 4: 30, 5: 25 })
            }
            className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>官方平衡標準 (45s ~ 25s)</span>
          </button>

          <button
            onClick={() =>
              applyPreset('極速考驗', { 1: 20, 2: 18, 3: 15, 4: 12, 5: 10 })
            }
            className="px-2.5 py-1 text-xs bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 rounded-lg border border-rose-800/40 flex items-center gap-1 cursor-pointer"
          >
            <Zap className="w-3 h-3 text-rose-400" />
            <span>極速電競模式 (20s ~ 10s)</span>
          </button>

          <button
            onClick={() =>
              applyPreset('休閒寬鬆', { 1: 90, 2: 80, 3: 70, 4: 60, 5: 50 })
            }
            className="px-2.5 py-1 text-xs bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 rounded-lg border border-emerald-800/40 flex items-center gap-1 cursor-pointer"
          >
            <Coffee className="w-3 h-3 text-emerald-400" />
            <span>休閒輕鬆練習 (90s ~ 50s)</span>
          </button>

          <button
            onClick={() =>
              applyPreset('無壓力暢玩', { 1: 180, 2: 180, 3: 180, 4: 180, 5: 180 })
            }
            className="px-2.5 py-1 text-xs bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 rounded-lg border border-cyan-800/40 flex items-center gap-1 cursor-pointer"
          >
            <Clock className="w-3 h-3 text-cyan-400" />
            <span>教學超長思考 (180s)</span>
          </button>
        </div>
      </div>

      {/* 5 種難度調節清單 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {configs.map((item) => {
          const currentLimit = limits[item.level] || DEFAULT_TIME_LIMITS[item.level];
          return (
            <div
              key={item.level}
              className={`p-4 bg-slate-900/80 rounded-2xl border ${item.borderColor} space-y-3 shadow-lg`}
            >
              {/* 卡片標題 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-400">Lv.{item.level}</span>
                  <h4 className={`text-sm font-bold ${item.color}`}>{item.name}</h4>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${item.badgeBg}`}>
                    {item.tag}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-xl font-black font-mono text-amber-400 tabular-nums">
                    {currentLimit}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">秒/題</span>
                </div>
              </div>

              {/* 滑桿與微調控制 */}
              <div className="space-y-2">
                <input
                  type="range"
                  min="5"
                  max="180"
                  step="1"
                  value={currentLimit}
                  onChange={(e) => handleChange(item.level, parseInt(e.target.value, 10))}
                  className="w-full accent-amber-400 cursor-pointer"
                />

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleStep(item.level, -5)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold rounded-lg border border-slate-700 cursor-pointer"
                      title="減少 5 秒"
                    >
                      -5s
                    </button>
                    <button
                      onClick={() => handleStep(item.level, -1)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold rounded-lg border border-slate-700 cursor-pointer"
                      title="減少 1 秒"
                    >
                      -1s
                    </button>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <span>預設: </span>
                    <strong className="font-mono text-slate-300">{DEFAULT_TIME_LIMITS[item.level]}s</strong>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleStep(item.level, 1)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold rounded-lg border border-slate-700 cursor-pointer"
                      title="增加 1 秒"
                    >
                      +1s
                    </button>
                    <button
                      onClick={() => handleStep(item.level, 5)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold rounded-lg border border-slate-700 cursor-pointer"
                      title="增加 5 秒"
                    >
                      +5s
                    </button>
                  </div>
                </div>
              </div>

              {/* 難度規格備忘 */}
              <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-800/80 flex items-center justify-between">
                <span>運算子: <strong className="text-slate-400 font-mono">{item.allowedOps}</strong></span>
                <span>數字範圍: <strong className="text-slate-400 font-mono">{item.numRange}</strong></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
