/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sparkles, RotateCcw, Lightbulb, CheckCircle2, XCircle, ArrowRight, Trophy, HelpCircle, BookOpen, Home, Clock, Flame, RefreshCw, Delete, UploadCloud, LogIn } from 'lucide-react';
import { MentalMathEngine, QuestionData, ValidationResult } from '../logic/mentalMath';
import { sound } from '../utils/audio';
import { DIFFICULTY_CONFIGS } from './DifficultyScreen';
import { getDifficultyConfigs, subscribeTimeLimits, DifficultyConfig } from '../services/gameSettingsService';
import { submitScoreToLeaderboard } from '../services/leaderboardService';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup } from 'firebase/auth';

interface PlayTabProps {
  initialDifficulty?: number;
  onOpenRules?: () => void;
  onBackToTitle?: () => void;
  onChangeDifficulty?: () => void;
  onOpenLeaderboard?: (diff?: number) => void;
}

export const PlayTab: React.FC<PlayTabProps> = ({
  initialDifficulty = 3,
  onOpenRules,
  onBackToTitle,
  onChangeDifficulty,
  onOpenLeaderboard,
}) => {
  const [difficulty, setDifficulty] = useState<number>(initialDifficulty);
  const [diffConfigs, setDiffConfigs] = useState<DifficultyConfig[]>(() => getDifficultyConfigs());

  useEffect(() => {
    return subscribeTimeLimits(() => {
      setDiffConfigs(getDifficultyConfigs());
    });
  }, []);

  const diffConfig = diffConfigs.find((c) => c.level === difficulty) || diffConfigs[2] || getDifficultyConfigs()[2];

  const [question, setQuestion] = useState<QuestionData>(() => MentalMathEngine.generateQuestion(initialDifficulty));
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [selectedOperators, setSelectedOperators] = useState<string[]>([]);
  const [usedTileIndices, setUsedTileIndices] = useState<number[]>([]);

  // 計分與統計
  const [score, setScore] = useState<number>(0);
  const [solvedCount, setSolvedCount] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [bestStreak, setBestStreak] = useState<number>(0);

  // 排行榜上傳狀態
  const [isUploadingScore, setIsUploadingScore] = useState<boolean>(false);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // 計時器 (每題倒數)
  const [timeLeft, setTimeLeft] = useState<number>(diffConfig.timeLimit);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);

  // 狀態防禦標記 (徹底防禦 React 重複渲染無限循環)
  const [hasWonCurrentQuestion, setHasWonCurrentQuestion] = useState<boolean>(false);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [showGameOverModal, setShowGameOverModal] = useState<boolean>(false);
  const [earnedPointsThisRound, setEarnedPointsThisRound] = useState<number>(0);

  const timerRef = useRef<number | null>(null);

  // 換新題目並重置計時器 (切換題目時徹底重置狀態)
  const handleNewQuestion = useCallback((diffLevel?: number) => {
    const targetDiff = diffLevel ?? difficulty;
    const currentConfigs = getDifficultyConfigs();
    const targetConfig = currentConfigs.find((c) => c.level === targetDiff) || currentConfigs[2];

    const q = MentalMathEngine.generateQuestion(targetDiff);
    setQuestion(q);
    setSelectedNumbers([]);
    setSelectedOperators([]);
    setUsedTileIndices([]);
    setValidation(null);
    setShowHint(false);
    setHasWonCurrentQuestion(false);
    setTimeLeft(targetConfig.timeLimit);
    setIsTimerRunning(true);
  }, [difficulty]);

  // 切換難度
  const handleDifficultyChange = (lvl: number) => {
    setDifficulty(lvl);
    handleNewQuestion(lvl);
  };

  // 每題計時器倒數邏輯 (當已獲勝或結算時停止)
  useEffect(() => {
    if (!isTimerRunning || showGameOverModal || hasWonCurrentQuestion) {
      if (timerRef.current) window.clearInterval(timerRef.current);
      return;
    }

    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) window.clearInterval(timerRef.current);
          setIsTimerRunning(false);
          sound.playError();
          setShowGameOverModal(true);
          return 0;
        }

        // 最後 5 秒警示音
        if (prev <= 6) {
          sound.playOperator();
        }

        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [isTimerRunning, showGameOverModal, hasWonCurrentQuestion]);

  // 執行答對驗證判定 (僅在使用者操作時觸發，不在 useEffect 監聽 streak/timeLeft 以防死循環)
  const checkAnswerSubmission = (nums: number[], ops: number[] | string[]) => {
    if (nums.length !== 4 || ops.length !== 3 || hasWonCurrentQuestion) return;

    const strOps = ops as string[];
    const result = MentalMathEngine.validateEquationDetailed(
      nums,
      strOps,
      question.target,
      question.numbers
    );
    setValidation(result);

    // 答對邏輯：只在非勝利狀態下觸發一次！
    if (result.isValid) {
      sound.playSuccess();
      setIsTimerRunning(false);
      setHasWonCurrentQuestion(true);

      // 分數計算
      const timeBonus = timeLeft * 10;
      const currentStreakBonus = streak * 25;
      const roundScore = 100 + timeBonus + currentStreakBonus;

      setEarnedPointsThisRound(roundScore);
      setScore((s) => s + roundScore);
      setSolvedCount((c) => c + 1);
      setStreak((s) => {
        const next = s + 1;
        setBestStreak((b) => Math.max(b, next));
        return next;
      });
    }
  };

  // 選數字
  const handleSelectNumber = (index: number) => {
    if (usedTileIndices.includes(index) || !isTimerRunning || hasWonCurrentQuestion) return;
    if (selectedNumbers.length > selectedOperators.length) {
      sound.playError();
      return;
    }

    sound.playTap();
    const nextNum = question.numbers[index];
    const nextNumbers = [...selectedNumbers, nextNum];
    const nextIndices = [...usedTileIndices, index];

    setSelectedNumbers(nextNumbers);
    setUsedTileIndices(nextIndices);

    // 當剛好選滿 4 個數字時，立即進行單次驗證判定
    if (nextNumbers.length === 4 && selectedOperators.length === 3) {
      checkAnswerSubmission(nextNumbers, selectedOperators);
    } else if (nextNumbers.length >= 2) {
      // 局部計算目前步進以利 UI 顯示
      const partialRes = MentalMathEngine.validateEquationDetailed(nextNumbers, selectedOperators, question.target);
      setValidation(partialRes);
    }
  };

  // 選運算子
  const handleSelectOperator = (op: string) => {
    if (!isTimerRunning || hasWonCurrentQuestion) return;
    if (selectedNumbers.length === 0 || selectedNumbers.length <= selectedOperators.length) {
      sound.playError();
      return;
    }
    if (selectedOperators.length >= 3) {
      return;
    }

    sound.playOperator();
    const nextOps = [...selectedOperators, op];
    setSelectedOperators(nextOps);
  };

  // 退格
  const handleBackspace = () => {
    if (hasWonCurrentQuestion) return;
    sound.playTap();

    if (selectedOperators.length >= selectedNumbers.length && selectedOperators.length > 0) {
      setSelectedOperators((prev) => prev.slice(0, -1));
    } else if (selectedNumbers.length > 0) {
      setSelectedNumbers((prev) => prev.slice(0, -1));
      setUsedTileIndices((prev) => prev.slice(0, -1));
    }
    setValidation(null);
  };

  // 清空
  const handleClear = () => {
    if (hasWonCurrentQuestion) return;
    sound.playTap();
    setSelectedNumbers([]);
    setSelectedOperators([]);
    setUsedTileIndices([]);
    setValidation(null);
  };

  // 重新再來一局 (重置分數)
  const handleRestartGame = () => {
    sound.playTap();
    setScore(0);
    setSolvedCount(0);
    setStreak(0);
    setUploadSuccess(false);
    setUploadError(null);
    setShowGameOverModal(false);
    handleNewQuestion(difficulty);
  };

  // 成績上傳至全球即時排行榜 (每種難度獨立，跨裝置即時同步)
  const handleUploadScore = async () => {
    if (score <= 0 || uploadSuccess || isUploadingScore) return;
    try {
      sound.playTap();
      setIsUploadingScore(true);
      setUploadError(null);

      let user = auth.currentUser;
      if (!user) {
        const result = await signInWithPopup(auth, googleProvider);
        user = result.user;
      }

      await submitScoreToLeaderboard({
        difficulty,
        playerName: user.displayName || '無名心算大師',
        score,
        solvedCount,
        bestStreak,
      });

      setUploadSuccess(true);
      sound.playSuccess();
    } catch (err: any) {
      console.error('Score upload failed:', err);
      setUploadError(err.message || '上傳失敗，請確認網路連線');
      sound.playError();
    } finally {
      setIsUploadingScore(false);
    }
  };

  // 放棄當前題，直接結算分數
  const handleGiveUp = () => {
    sound.playTap();
    setIsTimerRunning(false);
    sound.playError();
    setShowGameOverModal(true);
  };

  // 計算計時條百分比
  const timeLimit = diffConfig.timeLimit;
  const timePct = Math.max(0, Math.min(100, (timeLeft / timeLimit) * 100));
  const isTimeUrgent = timeLeft <= 8;

  // 鍵盤支援
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['+', '-', '*', '/'].includes(e.key)) {
        e.preventDefault();
        handleSelectOperator(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        handleClear();
      } else if (e.key === 'Enter') {
        if (hasWonCurrentQuestion) {
          handleNewQuestion();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNumbers, selectedOperators, hasWonCurrentQuestion, handleNewQuestion]);

  return (
    <div className="w-full max-w-md mx-auto space-y-4 select-none pb-6">
      {/* 手遊風格頂部導航 HUD */}
      <div className="bg-slate-900/90 border border-slate-800/90 p-3 rounded-2xl backdrop-blur-md shadow-xl">
        <div className="flex items-center justify-between gap-2 mb-2">
          {/* 左側操作：回主頁與換難度 */}
          <div className="flex items-center gap-1.5">
            {onBackToTitle && (
              <button
                onClick={() => {
                  sound.playTap();
                  onBackToTitle();
                }}
                className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                title="返回標題主頁"
              >
                <Home className="w-4 h-4" />
              </button>
            )}

            {onChangeDifficulty && (
              <button
                onClick={() => {
                  sound.playTap();
                  onChangeDifficulty();
                }}
                className="px-2.5 py-1.5 bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition-all hover:bg-amber-500/25 cursor-pointer flex items-center gap-1"
              >
                <span>Lv.{difficulty} {diffConfig.name}</span>
              </button>
            )}
          </div>

          {/* 右側操作：排行榜、計分、連擊與規則說明 */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {onOpenLeaderboard && (
              <button
                onClick={() => {
                  sound.playTap();
                  onOpenLeaderboard(difficulty);
                }}
                className="p-1.5 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl transition-colors cursor-pointer"
                title="查看全服即時排行榜"
              >
                <Trophy className="w-4 h-4" />
              </button>
            )}

            <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
              <span className="text-[10px] text-amber-400/80 font-bold">分</span>
              <strong className="text-amber-300 font-mono tabular-nums">{score}</strong>
            </div>

            <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <strong className="text-orange-300 font-mono tabular-nums">{streak}</strong>
            </div>

            {onOpenRules && (
              <button
                onClick={() => {
                  sound.playTap();
                  onOpenRules();
                }}
                className="p-2 text-slate-300 hover:text-amber-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                title="遊戲規則"
              >
                <BookOpen className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 手遊即時倒數計時條 */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className={`flex items-center gap-1 font-bold ${isTimeUrgent ? 'text-rose-400 animate-pulse' : 'text-slate-400'}`}>
              <Clock className="w-3 h-3" />
              <span>剩餘: {timeLeft} 秒</span>
            </span>
            <span className="text-slate-500 text-[10px]">
              已答對: <strong className="text-emerald-400">{solvedCount}</strong> 題
            </span>
          </div>

          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800/80">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isTimeUrgent
                  ? 'bg-rose-500 shadow-sm shadow-rose-500'
                  : 'bg-gradient-to-r from-amber-500 to-emerald-400'
              }`}
              style={{ width: `${timePct}%` }}
            />
          </div>
        </div>
      </div>

      {/* 目標數字卡牌展示 (手遊高對比核心視覺) */}
      <div className="relative bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800/90 rounded-3xl p-5 text-center shadow-xl flex flex-col items-center justify-center space-y-2">
        <div className="text-[11px] font-bold text-amber-400/90 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          <span>目標數字 (TARGET)</span>
        </div>

        <div className="w-28 h-28 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-amber-400/10 to-transparent border-2 border-amber-500/50 flex items-center justify-center shadow-lg shadow-amber-500/10 relative">
          <span className="text-5xl font-black text-amber-300 font-mono tracking-tight tabular-nums">
            {question.target}
          </span>
          <div className="absolute -top-2 -right-2 bg-amber-500 text-slate-950 font-bold text-[9px] px-1.5 py-0.5 rounded-full">
            GOAL
          </div>
        </div>

        <p className="text-[11px] text-slate-400 leading-tight">
          使用下方 4 個數字，先乘除後加減組合出 {question.target}
        </p>
      </div>

      {/* 算式輸入框 (清晰呈現玩家目前輸入的算式) */}
      <div className="min-h-[64px] bg-slate-950 border border-slate-800 rounded-2xl p-3 flex items-center justify-between gap-2 shadow-inner">
        <div className="flex items-center gap-1.5 flex-wrap font-mono text-xl font-bold pl-1">
          {selectedNumbers.length === 0 ? (
            <span className="text-xs text-slate-500 font-sans flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-slate-600" />
              點選數字與符號開始計算
            </span>
          ) : (
            selectedNumbers.map((num, i) => (
              <React.Fragment key={i}>
                <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 rounded-lg text-lg tabular-nums">
                  {num}
                </span>
                {i < selectedOperators.length && (
                  <span className="text-amber-400 font-bold px-0.5 text-lg">
                    {selectedOperators[i] === '*' ? '×' : selectedOperators[i] === '/' ? '÷' : selectedOperators[i] === '-' ? '−' : '+'}
                  </span>
                )}
              </React.Fragment>
            ))
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleBackspace}
            disabled={selectedNumbers.length === 0 || hasWonCurrentQuestion}
            className="p-2 text-slate-400 hover:text-white bg-slate-850 hover:bg-slate-800 disabled:opacity-30 rounded-xl transition-colors cursor-pointer"
            title="退格"
          >
            <Delete className="w-4 h-4" />
          </button>
          <button
            onClick={handleClear}
            disabled={selectedNumbers.length === 0 || hasWonCurrentQuestion}
            className="px-2.5 py-2 text-xs text-slate-400 hover:text-white bg-slate-850 hover:bg-slate-800 disabled:opacity-30 rounded-xl transition-colors cursor-pointer"
            title="清空"
          >
            清空
          </button>
        </div>
      </div>

      {/* 4 個基礎數字卡牌 (大按鈕，超適合手機拇指點擊) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
          <span>題目卡牌（每張使用一次）：</span>
          <span className="font-mono text-slate-500">{selectedNumbers.length} / 4</span>
        </div>

        <div className="grid grid-cols-4 gap-2.5">
          {question.numbers.map((num, idx) => {
            const isUsed = usedTileIndices.includes(idx);
            const isDisabled = isUsed || selectedNumbers.length > selectedOperators.length || hasWonCurrentQuestion;

            return (
              <button
                key={idx}
                onClick={() => handleSelectNumber(idx)}
                disabled={isDisabled}
                className={`h-20 rounded-2xl flex flex-col items-center justify-center font-black text-2xl sm:text-3xl transition-all cursor-pointer ${
                  isUsed
                    ? 'bg-slate-900/40 text-slate-600 border border-slate-800/40 opacity-30 cursor-not-allowed scale-95'
                    : selectedNumbers.length > selectedOperators.length
                    ? 'bg-slate-850 text-slate-400 border border-slate-700/60 opacity-60 cursor-not-allowed'
                    : 'bg-gradient-to-b from-slate-800 to-slate-900 text-white border border-slate-700 hover:border-indigo-500 shadow-md active:scale-95'
                }`}
              >
                <span className="tabular-nums font-mono">{num}</span>
                <span className="text-[9px] font-normal text-slate-500">#{idx + 1}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4 個大號四則運算子按鈕 */}
      <div className="space-y-1.5">
        <span className="text-[11px] text-slate-400 px-1 block">運算符號：</span>
        <div className="grid grid-cols-4 gap-2.5">
          {[
            { op: '+', symbol: '+', label: '加' },
            { op: '-', symbol: '−', label: '減' },
            { op: '*', symbol: '×', label: '乘' },
            { op: '/', symbol: '÷', label: '除' },
          ].map((item) => {
            const canAdd = selectedNumbers.length > selectedOperators.length && selectedOperators.length < 3 && !hasWonCurrentQuestion;
            return (
              <button
                key={item.op}
                onClick={() => handleSelectOperator(item.op)}
                disabled={!canAdd}
                className={`h-14 rounded-2xl flex flex-col items-center justify-center font-black text-xl transition-all cursor-pointer ${
                  canAdd
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 active:scale-95 shadow-md'
                    : 'bg-slate-900/40 text-slate-600 border border-slate-800/60 opacity-40 cursor-not-allowed'
                }`}
              >
                <span>{item.symbol}</span>
                <span className="text-[9px] font-normal opacity-80">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 算式運算過程即時拆解 (自然語言，無程式專有名詞) */}
      {validation && (
        <div className={`p-3 rounded-2xl border text-xs transition-all ${
          validation.isValid && selectedNumbers.length === 4
            ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
            : validation.errorMessage
            ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
            : 'bg-slate-900/80 border-slate-800 text-slate-300'
        }`}>
          <div className="flex items-center justify-between font-bold mb-1">
            <span className="flex items-center gap-1.5">
              {validation.isValid && selectedNumbers.length === 4 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{validation.isValid && selectedNumbers.length === 4 ? '完全正確！' : '目前運算狀態'}</span>
            </span>

            <span className="font-mono tabular-nums">
              目前結果: <strong>{validation.calculatedValue}</strong>
            </span>
          </div>

          {validation.errorMessage && (
            <p className="text-[11px] text-rose-300 mt-1">
              {validation.errorMessage}
            </p>
          )}

          {validation.steps.length > 0 && (
            <div className="mt-2 text-[10px] space-y-0.5 text-slate-400 font-mono">
              {validation.steps.map((st, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span>{st.expression} = {st.result}</span>
                  <span className={st.divisionClean === false ? 'text-rose-400' : 'text-slate-500'}>{st.note}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 底部輔助按鈕：提示與結算 */}
      <div className="flex items-center justify-between pt-1 text-xs">
        <button
          onClick={() => setShowHint(!showHint)}
          className="flex items-center gap-1.5 text-slate-400 hover:text-amber-300 transition-colors cursor-pointer py-1"
        >
          <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
          <span>{showHint ? '隱藏提示' : '卡關提示'}</span>
        </button>

        {showHint && (
          <span className="font-mono text-[11px] px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-lg">
            參考: {question.exampleSolution}
          </span>
        )}

        <button
          onClick={handleGiveUp}
          className="text-slate-500 hover:text-rose-400 transition-colors py-1 cursor-pointer"
        >
          放棄這局，看分數
        </button>
      </div>

      {/* 答對成功彈窗 (手遊即時獎勵，修復無效重複觸發 bug) */}
      {hasWonCurrentQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-emerald-500/60 w-full max-w-sm rounded-3xl p-6 text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center mx-auto text-emerald-400 animate-bounce">
              <Sparkles className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-black text-white">答對了！</h3>
              <p className="text-xs text-emerald-300">
                完美算中目標數字 <strong className="font-bold font-mono text-white text-sm">{question.target}</strong>
              </p>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
              <div className="text-[11px] text-slate-400">本題獲得分數</div>
              <div className="text-3xl font-black text-amber-400 font-mono">
                +{earnedPointsThisRound} <span className="text-xs font-normal">分</span>
              </div>
              <div className="text-[10px] text-slate-500">
                基礎 100 + 時間加成 {timeLeft * 10} + 連擊獎勵 {streak * 25}
              </div>
            </div>

            <button
              onClick={() => handleNewQuestion()}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-slate-950 font-black text-base rounded-2xl transition-all duration-200 hover:scale-105 active:scale-95 shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>下一道題目</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 回答不出來 / 時間到結算分數彈窗 (Game Over & Score Popup) */}
      {showGameOverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-3xl p-6 text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border-2 border-rose-500/50 flex items-center justify-center mx-auto text-rose-400 animate-bounce">
              <Clock className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-black text-white">時間到！</h3>
              <p className="text-xs text-slate-400">
                本題未能及時解出，挑戰結束！
              </p>
            </div>

            {/* 本次結算分數 */}
            <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 space-y-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  最終得分 (TOTAL SCORE)
                </span>
                <span className="text-4xl font-black text-amber-400 font-mono tracking-tight tabular-nums">
                  {score}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
                <div className="p-2 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">答對題數</span>
                  <span className="text-base font-bold text-emerald-400 font-mono">{solvedCount} 題</span>
                </div>
                <div className="p-2 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">最高連擊</span>
                  <span className="text-base font-bold text-orange-400 font-mono">{bestStreak} 連擊</span>
                </div>
              </div>
            </div>

            {/* 全球即時排行榜同步 */}
            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2.5 text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                  <Trophy className="w-4 h-4" />
                  <span>全服排行榜 (Lv.{difficulty})</span>
                </div>
                {onOpenLeaderboard && (
                  <button
                    onClick={() => {
                      sound.playTap();
                      onOpenLeaderboard(difficulty);
                    }}
                    className="text-[11px] text-amber-300 hover:text-amber-200 underline cursor-pointer"
                  >
                    查看即時排行
                  </button>
                )}
              </div>

              {uploadSuccess ? (
                <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-center text-xs text-emerald-300 font-bold flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>成績已即時同步至全服排行榜！</span>
                </div>
              ) : score > 0 ? (
                <button
                  onClick={handleUploadScore}
                  disabled={isUploadingScore}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-60"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>{isUploadingScore ? '上傳同步中...' : '同步成績至全服排行榜'}</span>
                </button>
              ) : (
                <p className="text-[11px] text-slate-500 text-center py-1">
                  答對題目獲得分數後即可登錄全服排行榜
                </p>
              )}

              {uploadError && (
                <p className="text-[10px] text-rose-400 text-center">{uploadError}</p>
              )}
            </div>

            {/* 本題解答揭曉 */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-left text-xs space-y-1">
              <div className="text-amber-400 font-bold text-[10px] flex items-center gap-1">
                <Lightbulb className="w-3 h-3" />
                <span>本題參考解答大公開：</span>
              </div>
              <div className="font-mono text-center py-1 bg-slate-900 rounded font-bold text-white text-xs">
                {question.exampleSolution}
              </div>
            </div>

            {/* 操作按鈕 */}
            <div className="space-y-2">
              <button
                onClick={handleRestartGame}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-sm rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>再戰一局 (同難度)</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                {onChangeDifficulty && (
                  <button
                    onClick={() => {
                      sound.playTap();
                      setShowGameOverModal(false);
                      onChangeDifficulty();
                    }}
                    className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 cursor-pointer"
                  >
                    更換難度
                  </button>
                )}

                {onBackToTitle && (
                  <button
                    onClick={() => {
                      sound.playTap();
                      setShowGameOverModal(false);
                      onBackToTitle();
                    }}
                    className="py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold rounded-xl border border-slate-800 cursor-pointer"
                  >
                    返回主頁
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
