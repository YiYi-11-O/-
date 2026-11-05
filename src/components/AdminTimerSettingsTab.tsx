/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Clock,
  RotateCcw,
  Save,
  Check,
  Zap,
  Coffee,
  Sparkles,
  Play,
  Film,
  Gauge,
  Sliders,
} from 'lucide-react';
import {
  getTimeLimits,
  saveTimeLimits,
  resetTimeLimits,
  DEFAULT_TIME_LIMITS,
  DifficultyConfig,
  getDifficultyConfigs,
  getTutorialSettings,
  saveTutorialSettings,
  resetTutorialSettings,
  DEFAULT_TUTORIAL_SETTINGS,
  TutorialAnimationSettings,
  getCalculatedTutorialDurations,
} from '../services/gameSettingsService';
import { sound } from '../utils/audio';

const STEP_LABELS = [
  '第一步：4 張卡牌全數使用',
  '第二步：先乘除後加減優先級',
  '第三步：嚴格整除無小數',
  '第四步：成功達成目標數字',
];

export const AdminTimerSettingsTab: React.FC = () => {
  // 答題計時設定
  const [limits, setLimits] = useState<Record<number, number>>(() => getTimeLimits());
  const [configs, setConfigs] = useState<DifficultyConfig[]>(() => getDifficultyConfigs());
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // 開場動畫設定
  const [tutorialSettings, setTutorialSettings] = useState<TutorialAnimationSettings>(() => getTutorialSettings());
  const [tutorialSavedSuccess, setTutorialSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    setConfigs(getDifficultyConfigs());
  }, [limits]);

  // 答題時間控制
  const handleTimeChange = (lvl: number, val: number) => {
    const clamped = Math.max(5, Math.min(300, val));
    setLimits((prev) => ({
      ...prev,
      [lvl]: clamped,
    }));
    setSavedSuccess(false);
  };

  const handleTimeStep = (lvl: number, delta: number) => {
    sound.playTap();
    handleTimeChange(lvl, (limits[lvl] || 30) + delta);
  };

  const handleSaveTimes = () => {
    sound.playSuccess();
    saveTimeLimits(limits);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleResetTimes = () => {
    sound.playTap();
    const defaults = resetTimeLimits();
    setLimits(defaults);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const applyTimePreset = (presetLimits: Record<number, number>) => {
    sound.playTap();
    setLimits(presetLimits);
    saveTimeLimits(presetLimits);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // 開場動畫快慢控制
  const handleSpeedMultiplierChange = (speed: number) => {
    const clamped = Math.max(0.3, Math.min(4.0, Math.round(speed * 10) / 10));
    setTutorialSettings((prev) => ({
      ...prev,
      speedMultiplier: clamped,
    }));
    setTutorialSavedSuccess(false);
  };

  const handleStepDurationChange = (stepIdx: number, valMs: number) => {
    const clamped = Math.max(800, Math.min(15000, valMs));
    setTutorialSettings((prev) => {
      const nextDurations = [...prev.stepDurations];
      nextDurations[stepIdx] = clamped;
      return {
        ...prev,
        stepDurations: nextDurations,
      };
    });
    setTutorialSavedSuccess(false);
  };

  const handleSaveTutorial = () => {
    sound.playSuccess();
    saveTutorialSettings(tutorialSettings);
    setTutorialSavedSuccess(true);
    setTimeout(() => setTutorialSavedSuccess(false), 2500);
  };

  const handleResetTutorial = () => {
    sound.playTap();
    const defaults = resetTutorialSettings();
    setTutorialSettings(defaults);
    setTutorialSavedSuccess(true);
    setTimeout(() => setTutorialSavedSuccess(false), 2000);
  };

  const totalCalculatedSec = (
    tutorialSettings.stepDurations.reduce((a, b) => a + b, 0) /
    tutorialSettings.speedMultiplier /
    1000
  ).toFixed(1);

  return (
    <div className="space-y-8 select-none">
      {/* ======================================================== */}
      {/* 區塊 1: 開場動畫時間快慢與步驟時長設定 (新增功能) */}
      {/* ======================================================== */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-500/15 border border-indigo-500/30 rounded-xl text-indigo-400">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">開場教學動畫速度與播放時長</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 rounded-full font-bold">
                  {tutorialSettings.speedMultiplier}x 倍速
                </span>
              </div>
              <p className="text-xs text-slate-400">
                可調整點擊「開始遊戲」後開場解說動畫的自動播放快慢與每頁停留時長。
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetTutorial}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>恢復預設</span>
            </button>

            <button
              onClick={handleSaveTutorial}
              className="px-4 py-1.5 text-xs font-bold text-slate-950 bg-indigo-400 hover:bg-indigo-300 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              {tutorialSavedSuccess ? (
                <>
                  <Check className="w-4 h-4 stroke-[3] text-slate-950" />
                  <span>動畫速度已保存！</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>保存動畫設定</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 倍速快捷預設按鈕與滑桿 */}
        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
              <Gauge className="w-4 h-4 text-indigo-400" />
              <span>播放倍速快捷模式：</span>
            </div>

            <div className="text-xs font-mono text-indigo-300">
              預計全片播放耗時：<strong className="text-white font-bold">{totalCalculatedSec}</strong> 秒
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[
              { label: '0.5x 慢速詳解', speed: 0.5, icon: '🐢' },
              { label: '0.8x 稍慢閱讀', speed: 0.8, icon: '📖' },
              { label: '1.0x 標準預設', speed: 1.0, icon: '⚖️' },
              { label: '1.5x 流暢快顯', speed: 1.5, icon: '⚡' },
              { label: '2.0x 極速快轉', speed: 2.0, icon: '🚀' },
              { label: '3.0x 瞬間跳過', speed: 3.0, icon: '⏩' },
            ].map((p) => {
              const isActive = Math.abs(tutorialSettings.speedMultiplier - p.speed) < 0.05;
              return (
                <button
                  key={p.speed}
                  onClick={() => {
                    sound.playTap();
                    handleSpeedMultiplierChange(p.speed);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 scale-105'
                      : 'bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800'
                  }`}
                >
                  <span>{p.icon}</span>
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>

          {/* 連續倍速滑桿 */}
          <div className="pt-2 flex items-center gap-3">
            <span className="text-[11px] text-slate-500 font-mono">0.3x (慢)</span>
            <input
              type="range"
              min="0.3"
              max="3.0"
              step="0.1"
              value={tutorialSettings.speedMultiplier}
              onChange={(e) => handleSpeedMultiplierChange(parseFloat(e.target.value))}
              className="flex-1 accent-indigo-400 cursor-pointer"
            />
            <span className="text-[11px] text-slate-500 font-mono">3.0x (快)</span>
          </div>
        </div>

        {/* 4 個解說步驟基準停留時間調整 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
          {tutorialSettings.stepDurations.map((dur, idx) => {
            const actualSec = (dur / tutorialSettings.speedMultiplier / 1000).toFixed(1);
            return (
              <div
                key={idx}
                className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-400 truncate">{STEP_LABELS[idx]}</span>
                  <span className="text-indigo-400 font-mono font-bold">{actualSec}s</span>
                </div>

                <div className="flex items-center justify-between gap-1">
                  <button
                    onClick={() => {
                      sound.playTap();
                      handleStepDurationChange(idx, dur - 500);
                    }}
                    className="px-2 py-1 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded font-mono font-bold text-[10px] cursor-pointer"
                  >
                    -0.5s
                  </button>
                  <span className="text-slate-500 text-[10px] font-mono">基準: {(dur / 1000).toFixed(1)}s</span>
                  <button
                    onClick={() => {
                      sound.playTap();
                      handleStepDurationChange(idx, dur + 500);
                    }}
                    className="px-2 py-1 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded font-mono font-bold text-[10px] cursor-pointer"
                  >
                    +0.5s
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 區塊 2: 各難度每題答題時間調整 */}
      {/* ======================================================== */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">各難度每題答題倒數時間</h3>
              <p className="text-xs text-slate-400">
                可單獨設定 Lv.1 ~ Lv.5 每一題的思考秒數（範圍 5 秒 ~ 300 秒），修改後立即生效。
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetTimes}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>恢復預設</span>
            </button>

            <button
              onClick={handleSaveTimes}
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
                  <span>保存答題時間</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 快捷預設配置按鈕 */}
        <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-slate-400 font-medium">快捷預設模式：</span>

          <button
            onClick={() =>
              applyTimePreset({ 1: 45, 2: 40, 3: 35, 4: 30, 5: 25 })
            }
            className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>官方平衡標準 (45s ~ 25s)</span>
          </button>

          <button
            onClick={() =>
              applyTimePreset({ 1: 20, 2: 18, 3: 15, 4: 12, 5: 10 })
            }
            className="px-2.5 py-1 text-xs bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 rounded-lg border border-rose-800/40 flex items-center gap-1 cursor-pointer"
          >
            <Zap className="w-3 h-3 text-rose-400" />
            <span>極速電競模式 (20s ~ 10s)</span>
          </button>

          <button
            onClick={() =>
              applyTimePreset({ 1: 90, 2: 80, 3: 70, 4: 60, 5: 50 })
            }
            className="px-2.5 py-1 text-xs bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 rounded-lg border border-emerald-800/40 flex items-center gap-1 cursor-pointer"
          >
            <Coffee className="w-3 h-3 text-emerald-400" />
            <span>休閒輕鬆練習 (90s ~ 50s)</span>
          </button>
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
                    onChange={(e) => handleTimeChange(item.level, parseInt(e.target.value, 10))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleTimeStep(item.level, -5)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold rounded-lg border border-slate-700 cursor-pointer"
                        title="減少 5 秒"
                      >
                        -5s
                      </button>
                      <button
                        onClick={() => handleTimeStep(item.level, -1)}
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
                        onClick={() => handleTimeStep(item.level, 1)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold rounded-lg border border-slate-700 cursor-pointer"
                        title="增加 1 秒"
                      >
                        +1s
                      </button>
                      <button
                        onClick={() => handleTimeStep(item.level, 5)}
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
    </div>
  );
};
