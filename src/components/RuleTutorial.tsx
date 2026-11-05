/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { FastForward, CheckCircle2, XCircle, Sparkles, Play, Pause, RotateCcw, Clock, ArrowRight } from 'lucide-react';
import { sound } from '../utils/audio';
import { getCalculatedTutorialDurations, getTutorialSettings } from '../services/gameSettingsService';

interface RuleTutorialProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const RuleTutorial: React.FC<RuleTutorialProps> = ({ onComplete, onSkip }) => {
  const [stepDurations] = useState<number[]>(() => getCalculatedTutorialDurations());
  const totalDuration = stepDurations.reduce((a, b) => a + b, 0);

  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);
  const [animPhase, setAnimPhase] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [stepProgressPct, setStepProgressPct] = useState<number>(0);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(Math.ceil(stepDurations[0] / 1000));

  const timerRef = useRef<number | null>(null);
  const progressIntervalRef = useRef<number | null>(null);

  // 計算全體整體播放進度 (Overall Progress %)
  const previousStepsDuration = stepDurations.slice(0, currentStepIdx).reduce((a, b) => a + b, 0);
  const currentStepElapsed = (stepProgressPct / 100) * stepDurations[currentStepIdx];
  const overallProgressPct = Math.min(100, ((previousStepsDuration + currentStepElapsed) / totalDuration) * 100);

  // 每個步驟的內部微動畫定時器 (依動畫播放速度等比微調)
  useEffect(() => {
    setAnimPhase(0);
    const duration = stepDurations[currentStepIdx] || 3000;

    const t1 = window.setTimeout(() => setAnimPhase(1), Math.round(duration * 0.15));
    const t2 = window.setTimeout(() => setAnimPhase(2), Math.round(duration * 0.45));
    const t3 = window.setTimeout(() => setAnimPhase(3), Math.round(duration * 0.75));

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [currentStepIdx, stepDurations]);

  // 自動推進時間軸 (Auto-playing slide timeline)
  useEffect(() => {
    if (isPaused) {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (progressIntervalRef.current) window.clearInterval(progressIntervalRef.current);
      return;
    }

    const duration = stepDurations[currentStepIdx] || 3000;
    const startTime = performance.now();
    setSecondsRemaining(Math.ceil(duration / 1000));

    // 更新進度條與倒數秒數
    progressIntervalRef.current = window.setInterval(() => {
      const elapsed = performance.now() - startTime;
      const pct = Math.min(100, (elapsed / duration) * 100);
      setStepProgressPct(pct);
      const remaining = Math.max(0, Math.ceil((duration - elapsed) / 1000));
      setSecondsRemaining(remaining);
    }, 40);

    // 時間到自動跳下一步
    timerRef.current = window.setTimeout(() => {
      setStepProgressPct(0);
      if (currentStepIdx < 3) {
        sound.playTap();
        setCurrentStepIdx((prev) => prev + 1);
      } else {
        sound.playSuccess();
        onComplete();
      }
    }, duration);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (progressIntervalRef.current) window.clearInterval(progressIntervalRef.current);
    };
  }, [currentStepIdx, isPaused, onComplete]);

  const handleSkip = () => {
    sound.playTap();
    onSkip();
  };

  const handleTogglePause = () => {
    sound.playTap();
    setIsPaused((p) => !p);
  };

  const handleReplay = () => {
    sound.playTap();
    setCurrentStepIdx(0);
    setStepProgressPct(0);
    setIsPaused(false);
  };

  return (
    <div className="w-full max-w-md mx-auto min-h-[580px] flex flex-col justify-between bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden animate-fade-in select-none">
      {/* 裝飾背景 */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* 右上角跳過按鈕 */}
      <button
        onClick={handleSkip}
        className="absolute top-6 right-6 flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl transition-all cursor-pointer shadow-md"
      >
        <span>跳過說明</span>
        <FastForward className="w-3.5 h-3.5" />
      </button>

      {/* 頂部自動進度時間條與指示 */}
      <div>
        {/* 整體動畫進度條 */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-400 mb-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              <span className="text-slate-300 font-bold">自動播放中 · 解說總進度</span>
              <span className="text-amber-400 font-mono text-[11px] font-bold">
                {Math.round(overallProgressPct)}%
              </span>
            </div>

            <div className="flex items-center gap-2 text-slate-500 text-[11px] mr-24 sm:mr-32">
              <Clock className="w-3 h-3 text-amber-400" />
              <span>本步驟倒數: <strong className="text-amber-300 font-mono">{secondsRemaining}s</strong></span>
            </div>
          </div>

          {/* 全域流光時間條 */}
          <div className="relative w-full bg-slate-800/80 h-2 rounded-full overflow-hidden shadow-inner border border-slate-700/50">
            <div
              className="bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 h-full rounded-full transition-all duration-75 shadow-lg shadow-amber-500/40"
              style={{ width: `${overallProgressPct}%` }}
            />
          </div>
        </div>

        {/* 步驟分段指示燈與控制按鈕 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentStepIdx
                    ? 'w-10 bg-amber-400 shadow-sm shadow-amber-400/50'
                    : idx < currentStepIdx
                    ? 'w-5 bg-amber-500/50'
                    : 'w-4 bg-slate-800'
                }`}
              />
            ))}
            <span className="text-[11px] font-mono text-slate-400 ml-2">
              步驟 {currentStepIdx + 1} / 4
            </span>
          </div>

          <div className="flex items-center gap-1.5 mr-24 sm:mr-32">
            <button
              onClick={handleTogglePause}
              className="p-1.5 text-slate-400 hover:text-white bg-slate-850 hover:bg-slate-800 rounded-lg text-xs transition-colors cursor-pointer border border-slate-700/60"
              title={isPaused ? '繼續播放' : '暫停'}
            >
              {isPaused ? <Play className="w-3.5 h-3.5 text-amber-400" /> : <Pause className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={handleReplay}
              className="p-1.5 text-slate-400 hover:text-white bg-slate-850 hover:bg-slate-800 rounded-lg text-xs transition-colors cursor-pointer border border-slate-700/60"
              title="從頭重播"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 步驟 1: 目標與卡牌動畫 */}
        {currentStepIdx === 0 && (
          <div className="space-y-4 animate-fade-in">
            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                01. 目標數字與 4 張卡牌
              </h2>
              <p className="text-xs sm:text-sm font-medium text-amber-400/90">
                每局生成 1 個目標與 4 張基礎卡，每張卡牌必須恰好使用一次！
              </p>
            </div>

            <div className="p-6 bg-slate-950/80 border border-slate-800 rounded-2xl flex flex-col items-center justify-center min-h-[220px] space-y-5">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-400">本局目標：</span>
                <div className={`px-5 py-2 rounded-2xl font-black text-3xl tabular-nums transition-all duration-500 ${animPhase >= 1 ? 'bg-amber-500/25 border-2 border-amber-500 text-amber-300 scale-110 shadow-lg shadow-amber-500/20' : 'bg-slate-900 border border-slate-700 text-slate-400'}`}>
                  26
                </div>
              </div>

              <div className="text-xs text-slate-400 font-medium">
                {animPhase === 0 && '↓↓ 正在抽取題目卡牌... ↓↓'}
                {animPhase >= 1 && '↓↓ 運用 4 張卡牌，每張各用一次組合出 26 ↓↓'}
              </div>

              <div className="flex gap-3">
                {[
                  { n: 3, delay: 'transition-all duration-300' },
                  { n: 8, delay: 'transition-all duration-500' },
                  { n: 4, delay: 'transition-all duration-700' },
                  { n: 2, delay: 'transition-all duration-1000' },
                ].map((item, i) => (
                  <div
                    key={i}
                    className={`w-14 h-18 rounded-xl flex flex-col items-center justify-center font-black text-2xl border ${item.delay} ${
                      animPhase >= 1
                        ? 'bg-gradient-to-b from-indigo-600/30 to-indigo-900/40 border-indigo-500/60 text-white translate-y-0 opacity-100 shadow-md scale-105'
                        : 'bg-slate-900 border-slate-800 text-slate-600 translate-y-2 opacity-30'
                    }`}
                  >
                    <span>{item.n}</span>
                    <span className="text-[10px] font-normal text-indigo-300/70">#{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              點選卡牌放入算式中，搭配 +、−、×、÷ 符號，不可漏掉或重複使用任何卡牌。
            </p>
          </div>
        )}

        {/* 步驟 2: 先乘除後加減 運算動畫 */}
        {currentStepIdx === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                02. 先乘除，後加減（無括號）
              </h2>
              <p className="text-xs sm:text-sm font-medium text-amber-400/90">
                系統嚴格遵守四則運算規則，優先計算乘法（×）與除法（÷）！
              </p>
            </div>

            <div className="p-6 bg-slate-950/80 border border-slate-800 rounded-2xl flex flex-col items-center justify-center min-h-[220px] space-y-4 font-mono">
              <div className="text-xs text-slate-400 font-sans font-medium">
                {animPhase === 0 && '初始算式：3 × 8 + 4 ÷ 2'}
                {animPhase === 1 && '第 1 階段：自動優先結算乘法與除法'}
                {animPhase >= 2 && '第 2 階段：再計算加法得出最終目標值'}
              </div>

              {/* 動態變化算式 */}
              <div className="flex items-center gap-3 text-xl sm:text-2xl font-bold flex-wrap justify-center min-h-[48px]">
                {animPhase < 1 ? (
                  <>
                    <span className="px-3 py-1.5 bg-slate-800 rounded-xl text-amber-300">3 × 8</span>
                    <span className="text-slate-500">+</span>
                    <span className="px-3 py-1.5 bg-slate-800 rounded-xl text-amber-300">4 ÷ 2</span>
                  </>
                ) : animPhase === 1 ? (
                  <>
                    <span className="px-4 py-2 bg-amber-500/25 border-2 border-amber-500 rounded-xl text-amber-300 scale-105 shadow-md">
                      24
                    </span>
                    <span className="text-amber-400 font-bold">+</span>
                    <span className="px-4 py-2 bg-amber-500/25 border-2 border-amber-500 rounded-xl text-amber-300 scale-105 shadow-md">
                      2
                    </span>
                  </>
                ) : (
                  <>
                    <span className="px-6 py-2.5 bg-emerald-500/25 border-2 border-emerald-500 rounded-2xl text-emerald-300 scale-110 shadow-lg shadow-emerald-500/20 font-black text-3xl">
                      = 26 (達成目標!)
                    </span>
                  </>
                )}
              </div>

              <div className="text-xs text-slate-400 font-sans text-center max-w-sm">
                {animPhase === 0 && '算式中自動先算 3×8 與 4÷2，無需括號！'}
                {animPhase === 1 && '乘除結算為 24 與 2，接著計算加法 24 + 2'}
                {animPhase >= 2 && '24 + 2 = 26，完美命中目標！'}
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              請注意：因為沒有括號，像 <code className="text-amber-300 font-mono">2 + 3 * 4</code> 一定是先算 3*4=12，再加 2 等於 14。
            </p>
          </div>
        )}

        {/* 步驟 3: 嚴格整除約束 動畫 */}
        {currentStepIdx === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                03. 除法嚴格整除（不得有小數）
              </h2>
              <p className="text-xs sm:text-sm font-medium text-amber-400/90">
                心算手遊講求純整數！運算過程只要出現任何小數點，立刻判定不合格。
              </p>
            </div>

            <div className="p-6 bg-slate-950/80 border border-slate-800 rounded-2xl flex flex-col items-center justify-center min-h-[220px] space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
                {/* 合格範例 */}
                <div className={`p-4 rounded-xl border text-center space-y-2 transition-all duration-500 ${animPhase >= 1 ? 'bg-emerald-950/30 border-emerald-500/60 shadow-lg shadow-emerald-500/10 scale-102' : 'bg-slate-900 border-slate-800 opacity-60'}`}>
                  <div className="font-mono text-xl font-black text-emerald-300">
                    8 ÷ 2 = 4
                  </div>
                  <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>完美整除 · 合格通過</span>
                  </div>
                  <p className="text-[11px] text-slate-400">餘數為 0，無小數點</p>
                </div>

                {/* 違規範例 */}
                <div className={`p-4 rounded-xl border text-center space-y-2 transition-all duration-500 ${animPhase >= 2 ? 'bg-rose-950/40 border-rose-500/60 shadow-lg shadow-rose-500/10 scale-102' : 'bg-slate-900 border-slate-800 opacity-60'}`}>
                  <div className="font-mono text-xl font-black text-rose-300">
                    7 ÷ 2 = 3.5
                  </div>
                  <div className="flex items-center justify-center gap-1.5 text-xs text-rose-400 font-bold">
                    <XCircle className="w-4 h-4" />
                    <span>產生小數 · 判定無效</span>
                  </div>
                  <p className="text-[11px] text-slate-400">不可截斷取整，除法需整除</p>
                </div>
              </div>

              <div className="text-xs text-slate-400 text-center max-w-sm">
                除數不能為 0！除法運算在每一步都必須能整除。
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              若算式中出現小數點除法，即時運算會顯示「非整除」警示，請改選其他組合。
            </p>
          </div>
        )}

        {/* 步驟 4: 準備進入難度選擇 */}
        {currentStepIdx === 3 && (
          <div className="space-y-4 animate-fade-in">
            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                04. 解說即將完成！
              </h2>
              <p className="text-xs sm:text-sm font-medium text-amber-400/90">
                動畫倒數完畢後，將自動帶您進入「難度選擇」設定關卡與時間限制...
              </p>
            </div>

            <div className="p-8 bg-slate-950/80 border border-slate-800 rounded-2xl flex flex-col items-center justify-center min-h-[220px] text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500/30 to-amber-400/10 border-2 border-amber-500/50 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/10 animate-bounce">
                <Sparkles className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black text-white">即將進入難度選擇...</h3>
                <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                  每題設有倒數計時器，回答不出來將即刻結算分數，請準備迎戰！
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 底部狀態列 */}
      <div className="flex items-center justify-between pt-6 border-t border-slate-800/80 mt-6 text-xs text-slate-400">
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
          <span>動畫跑完後，將自動進入難度選項</span>
        </span>

        <button
          onClick={handleSkip}
          className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md"
        >
          <span>直接進入難度選擇</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
