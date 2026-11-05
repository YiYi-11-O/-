/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Swords,
  Trophy,
  Clock,
  Copy,
  Check,
  ArrowLeft,
  Flame,
  Lightbulb,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ShieldAlert,
  Crown,
  RotateCcw,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import {
  subscribeToBattleRoom,
  syncPlayerProgress,
  submitBattleAnswer,
  advanceRound,
  timeoutCurrentRound,
  leaveBattleRoom,
  getLocalPlayerId,
  BattleRoomData,
} from '../services/multiplayerService';
import { MentalMathEngine, ValidationResult } from '../logic/mentalMath';
import { DIFFICULTY_CONFIGS } from './DifficultyScreen';
import { sound } from '../utils/audio';
import { OpponentStatsModal } from './OpponentStatsModal';
import { recordBattleResult } from '../services/playerProfileService';

interface MultiplayerBattleProps {
  roomId: string;
  isHost: boolean;
  onExit: () => void;
}

export const MultiplayerBattle: React.FC<MultiplayerBattleProps> = ({
  roomId,
  isHost,
  onExit,
}) => {
  const [room, setRoom] = useState<BattleRoomData | null>(null);
  const [localPlayerId] = useState<string>(() => getLocalPlayerId());
  const [showOpponentStats, setShowOpponentStats] = useState<boolean>(false);
  const recordedResultRef = useRef<boolean>(false);

  // 答題算式構建狀態
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [selectedOperators, setSelectedOperators] = useState<string[]>([]);
  const [usedTileIndices, setUsedTileIndices] = useState<number[]>([]);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // 本地每回合倒數計時
  const [timeLeft, setTimeLeft] = useState<number>(35);
  const roundTimerRef = useRef<number | null>(null);

  // 監聽房間即時狀態
  useEffect(() => {
    const unsub = subscribeToBattleRoom(
      roomId,
      (updatedRoom) => {
        if (!updatedRoom) {
          // 房間已被解散或刪除
          onExit();
          return;
        }
        setRoom(updatedRoom);
      },
      (err) => {
        console.error('Room subscription error:', err);
      }
    );
    return () => unsub();
  }, [roomId, onExit]);

  // 當回合開始時重置輸入狀態與計時器
  useEffect(() => {
    if (!room) return;

    if (room.status === 'playing') {
      setSelectedNumbers([]);
      setSelectedOperators([]);
      setUsedTileIndices([]);
      setValidation(null);

      // 計算本回合剩餘秒數
      const elapsed = Math.floor((Date.now() - (room.roundStartTime || Date.now())) / 1000);
      const remaining = Math.max(0, room.roundTimeLimit - elapsed);
      setTimeLeft(remaining);

      if (roundTimerRef.current) window.clearInterval(roundTimerRef.current);

      roundTimerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (roundTimerRef.current) window.clearInterval(roundTimerRef.current);
            // 房主觸發回合超時結算
            if (isHost) {
              timeoutCurrentRound(roomId);
            }
            return 0;
          }
          if (prev <= 6) {
            sound.playOperator();
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (roundTimerRef.current) window.clearInterval(roundTimerRef.current);
    }

    return () => {
      if (roundTimerRef.current) window.clearInterval(roundTimerRef.current);
    };
  }, [room?.status, room?.currentRound, isHost, roomId]);

  const myState = isHost ? room?.host : room?.guest;
  const opponentState = isHost ? room?.guest : room?.host;

  // 對局結束時自動記錄我方戰績 (勝利、平手、落敗與得分)
  useEffect(() => {
    if (room?.status === 'finished' && !recordedResultRef.current) {
      recordedResultRef.current = true;
      const isWin = room.winner === localPlayerId;
      const isDraw = room.winner === 'draw';
      const myScore = myState?.score || 0;
      recordBattleResult(isWin, isDraw, myScore);
    }
  }, [room?.status, room?.winner, localPlayerId, myState?.score]);

  // 複製房間代碼
  const handleCopyCode = () => {
    if (!room) return;
    sound.playTap();
    navigator.clipboard.writeText(room.roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // 點選數字
  const handleSelectNumber = (index: number) => {
    if (!room || room.status !== 'playing' || myState?.solvedInRound) return;
    if (usedTileIndices.includes(index)) return;
    if (selectedNumbers.length > selectedOperators.length) {
      sound.playError();
      return;
    }

    sound.playTap();
    const nextNum = room.currentQuestion.numbers[index];
    const nextNumbers = [...selectedNumbers, nextNum];
    const nextIndices = [...usedTileIndices, index];

    setSelectedNumbers(nextNumbers);
    setUsedTileIndices(nextIndices);

    // 同步進度給對手
    syncPlayerProgress(
      roomId,
      isHost,
      nextNumbers.length,
      nextNumbers.join(' ')
    );

    // 檢查是否已完成 4 數 3 運算子
    if (nextNumbers.length === 4 && selectedOperators.length === 3) {
      checkBattleAnswer(nextNumbers, selectedOperators);
    } else if (nextNumbers.length >= 2) {
      const partial = MentalMathEngine.validateEquationDetailed(
        nextNumbers,
        selectedOperators,
        room.currentQuestion.target
      );
      setValidation(partial);
    }
  };

  // 點選運算子
  const handleSelectOperator = (op: string) => {
    if (!room || room.status !== 'playing' || myState?.solvedInRound) return;
    if (selectedNumbers.length === 0 || selectedNumbers.length <= selectedOperators.length) {
      sound.playError();
      return;
    }
    if (selectedOperators.length >= 3) return;

    sound.playOperator();
    const nextOps = [...selectedOperators, op];
    setSelectedOperators(nextOps);
  };

  // 退格與清空
  const handleBackspace = () => {
    if (myState?.solvedInRound) return;
    sound.playTap();
    if (selectedOperators.length >= selectedNumbers.length && selectedOperators.length > 0) {
      setSelectedOperators((prev) => prev.slice(0, -1));
    } else if (selectedNumbers.length > 0) {
      setSelectedNumbers((prev) => prev.slice(0, -1));
      setUsedTileIndices((prev) => prev.slice(0, -1));
    }
    setValidation(null);
  };

  const handleClear = () => {
    if (myState?.solvedInRound) return;
    sound.playTap();
    setSelectedNumbers([]);
    setSelectedOperators([]);
    setUsedTileIndices([]);
    setValidation(null);
  };

  // 驗證答案
  const checkBattleAnswer = (nums: number[], ops: string[]) => {
    if (!room) return;
    const result = MentalMathEngine.validateEquationDetailed(
      nums,
      ops,
      room.currentQuestion.target,
      room.currentQuestion.numbers
    );
    setValidation(result);

    if (result.isValid) {
      sound.playSuccess();
      const equationStr = nums.reduce((acc, num, idx) => {
        if (idx === 0) return `${num}`;
        return `${acc} ${ops[idx - 1]} ${num}`;
      }, '');
      submitBattleAnswer(roomId, isHost, equationStr, timeLeft);
    } else {
      sound.playError();
    }
  };

  // 離開房間
  const handleLeave = async () => {
    sound.playTap();
    await leaveBattleRoom(roomId, isHost);
    onExit();
  };

  if (!room) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-slate-400 text-xs font-medium">連線至對戰伺服器中...</p>
      </div>
    );
  }

  const diffConfig = DIFFICULTY_CONFIGS.find((c) => c.level === room.difficulty) || DIFFICULTY_CONFIGS[2];
  const timeLimit = room.roundTimeLimit;
  const timePct = Math.max(0, Math.min(100, (timeLeft / timeLimit) * 100));
  const isTimeUrgent = timeLeft <= 6;

  return (
    <div className="w-full max-w-md mx-auto space-y-4 select-none pb-6">
      {/* 頂部 HUD：雙人對決記分板與倒數狀態 */}
      <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-3xl shadow-xl">
        <div className="flex items-center justify-between gap-2">
          {/* 左側：我方玩家卡片 */}
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-bold text-xs shrink-0">
              {myState?.displayName.slice(0, 1)}
            </div>
            <div className="space-y-0.5 text-left">
              <div className="flex items-center gap-1">
                <span className="text-xs font-black text-white truncate max-w-[80px]">
                  {myState?.displayName}
                </span>
                <span className="text-[10px] text-cyan-400 font-bold">(你)</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-mono">
                <span className="text-amber-400 font-black">{myState?.score || 0}</span>
                <span className="text-slate-500">分</span>
              </div>
            </div>
          </div>

          {/* 中央：回合與對決標記 */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] font-black text-slate-400 uppercase tracking-widest font-mono">
              <span>第</span>
              <span className="text-amber-400 font-bold text-sm">{room.currentRound}</span>
              <span>/</span>
              <span>{room.totalRounds} 回合</span>
            </div>
            <span className="text-[10px] text-slate-500 font-bold">
              Lv.{room.difficulty} {diffConfig.name}
            </span>
          </div>

          {/* 右側：對手玩家卡片 (點擊查看戰績與加好友) */}
          <button
            onClick={() => {
              if (opponentState) {
                sound.playTap();
                setShowOpponentStats(true);
              }
            }}
            disabled={!opponentState}
            className={`flex items-center gap-2 flex-row-reverse text-right rounded-2xl p-1 transition-all ${
              opponentState
                ? 'hover:bg-slate-800/80 cursor-pointer active:scale-95'
                : 'opacity-70 cursor-default'
            }`}
            title={opponentState ? '點擊查看對手詳細戰績與加好友' : '等待對手加入'}
          >
            <div className="w-9 h-9 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-300 font-bold text-xs shrink-0 shadow-sm">
              {opponentState ? opponentState.displayName.slice(0, 1) : '?'}
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center justify-end gap-1">
                <span className="text-xs font-black text-white truncate max-w-[80px]">
                  {opponentState ? opponentState.displayName : '等待加入...'}
                </span>
                {opponentState && (
                  <span className="text-[9px] text-rose-400/80 bg-rose-500/10 px-1 rounded">戰績</span>
                )}
              </div>
              <div className="flex items-center justify-end gap-1 text-[11px] font-mono">
                <span className="text-rose-400 font-black">{opponentState?.score || 0}</span>
                <span className="text-slate-500">分</span>
              </div>
            </div>
          </button>
        </div>

        {/* 回合計時條 (進行中時顯示) */}
        {room.status === 'playing' && (
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className={`font-bold flex items-center gap-1 ${isTimeUrgent ? 'text-rose-400 animate-pulse' : 'text-slate-400'}`}>
                <Clock className="w-3.5 h-3.5" />
                <span>剩餘: {timeLeft} 秒</span>
              </span>

              {/* 對手實時動作雷達 */}
              <div className="text-[11px] text-slate-400 flex items-center gap-1 font-sans">
                {opponentState?.solvedInRound ? (
                  <span className="text-rose-400 font-bold flex items-center gap-1 animate-pulse">
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>對手已搶先解答！</span>
                  </span>
                ) : (
                  <span>對手已使用: <strong className="text-slate-200 font-mono">{opponentState?.cardsUsedCount || 0}/4</strong> 張牌</span>
                )}
              </div>
            </div>

            <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isTimeUrgent ? 'bg-rose-500' : 'bg-gradient-to-r from-amber-400 to-rose-400'
                }`}
                style={{ width: `${timePct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 狀態 1: 等待對手加入 (Waiting for Opponent) */}
      {/* ======================================================== */}
      {room.status === 'waiting' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl animate-fade-in">
          {/* 雷達光波 */}
          <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-cyan-500/20 animate-ping" />
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-cyan-500/30 text-slate-950">
              <Users className="w-10 h-10" />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-black text-white">等待對手加入中...</h3>
            <p className="text-xs text-slate-400">
              分享下方的 4 位數邀請代碼給好友，即可立刻連線對戰！
            </p>
          </div>

          {/* 邀請碼卡片與一鍵複製 */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
            <div className="text-left">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
                房間邀請代碼
              </span>
              <span className="text-3xl font-black font-mono tracking-widest text-cyan-300">
                {room.roomCode}
              </span>
            </div>

            <button
              onClick={handleCopyCode}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700"
            >
              {copiedCode ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                  <span className="text-emerald-400">已複製！</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>複製代碼</span>
                </>
              )}
            </button>
          </div>

          <button
            onClick={handleLeave}
            className="w-full py-3 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            解散並返回大廳
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 狀態 2: 正在對決中 (Live Battle Playing) */}
      {/* ======================================================== */}
      {room.status === 'playing' && (
        <div className="space-y-4">
          {/* 目標數字卡片 */}
          <div className="relative bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-5 rounded-3xl text-center space-y-1 shadow-2xl overflow-hidden">
            <span className="text-[10px] font-black text-amber-400/90 tracking-widest uppercase">
              TARGET NUMBER · 目標數字
            </span>
            <div className="text-5xl font-black font-mono text-white tracking-tight drop-shadow-md">
              {room.currentQuestion.target}
            </div>
            <div className="text-[11px] text-slate-400">
              運用下方 4 張卡牌，率先解出目標數值者獲勝！
            </div>
          </div>

          {/* 算式輸入槽 */}
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl min-h-[70px] flex items-center justify-between gap-2 shadow-inner">
            <div className="flex-1 flex items-center flex-wrap gap-2 text-lg font-mono font-black text-white">
              {selectedNumbers.length === 0 ? (
                <span className="text-xs font-normal text-slate-500 font-sans">
                  請依序點選數字與運算子構建算式...
                </span>
              ) : (
                selectedNumbers.map((num, i) => (
                  <React.Fragment key={i}>
                    <span className="px-3 py-1 bg-amber-400 text-slate-950 rounded-xl shadow-md">
                      {num}
                    </span>
                    {selectedOperators[i] && (
                      <span className="px-2 py-1 bg-slate-800 text-amber-300 rounded-lg">
                        {selectedOperators[i] === '*' ? '×' : selectedOperators[i] === '/' ? '÷' : selectedOperators[i]}
                      </span>
                    )}
                  </React.Fragment>
                ))
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleBackspace}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                title="退格"
              >
                退格
              </button>
              <button
                onClick={handleClear}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                title="清空"
              >
                清空
              </button>
            </div>
          </div>

          {/* 我方解題完成橫條 */}
          {myState?.solvedInRound && (
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-center text-xs font-bold text-emerald-300 flex items-center justify-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>你已成功解答！等待對手完成或回合結算中...</span>
            </div>
          )}

          {/* 4 張數字卡牌 */}
          <div className="grid grid-cols-4 gap-2.5">
            {room.currentQuestion.numbers.map((num, index) => {
              const isUsed = usedTileIndices.includes(index);
              return (
                <button
                  key={index}
                  onClick={() => handleSelectNumber(index)}
                  disabled={isUsed || myState?.solvedInRound}
                  className={`h-20 rounded-2xl text-2xl font-black font-mono transition-all flex items-center justify-center cursor-pointer shadow-lg active:scale-95 ${
                    isUsed
                      ? 'bg-slate-950 text-slate-700 border border-slate-900 opacity-40 cursor-not-allowed'
                      : 'bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-slate-750 hover:border-amber-400 text-white hover:scale-105'
                  }`}
                >
                  {num}
                </button>
              );
            })}
          </div>

          {/* 4 個運算子 */}
          <div className="grid grid-cols-4 gap-2.5">
            {[
              { op: '+', symbol: '+' },
              { op: '-', symbol: '−' },
              { op: '*', symbol: '×' },
              { op: '/', symbol: '÷' },
            ].map((btn) => (
              <button
                key={btn.op}
                onClick={() => handleSelectOperator(btn.op)}
                disabled={myState?.solvedInRound}
                className="h-14 rounded-2xl text-xl font-black font-mono bg-slate-850 hover:bg-slate-800 border border-slate-750 text-amber-300 hover:text-white transition-all flex items-center justify-center cursor-pointer active:scale-95"
              >
                {btn.symbol}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 狀態 3: 回合結算彈窗 (Round Result Modal) */}
      {/* ======================================================== */}
      {room.status === 'round_result' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-3xl p-6 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border-2 border-amber-500/40 flex items-center justify-center mx-auto text-amber-400">
              <Trophy className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-white">第 {room.currentRound} 回合結束</h3>
              <p className="text-xs text-slate-400">本回合雙方表現結算如下：</p>
            </div>

            {/* 本回合得分比拼卡片 */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-center space-y-1">
                <span className="text-[10px] font-bold text-cyan-400 truncate block">
                  {myState?.displayName} (你)
                </span>
                <span className="text-2xl font-black font-mono text-cyan-300">
                  +{myState?.roundScore || 0}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {myState?.solvedInRound ? '成功解答' : '未及時解出'}
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-center space-y-1">
                <span className="text-[10px] font-bold text-rose-400 truncate block">
                  {opponentState?.displayName || '對手'}
                </span>
                <span className="text-2xl font-black font-mono text-rose-300">
                  +{opponentState?.roundScore || 0}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {opponentState?.solvedInRound ? '成功解答' : '未及時解出'}
                </span>
              </div>
            </div>

            {/* 參考解答揭曉 */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-left text-xs space-y-1">
              <div className="text-amber-400 font-bold text-[10px] flex items-center gap-1">
                <Lightbulb className="w-3 h-3" />
                <span>本題參考解答：</span>
              </div>
              <div className="font-mono text-center py-1 bg-slate-900 rounded font-bold text-white text-xs">
                {room.currentQuestion.exampleSolution}
              </div>
            </div>

            {/* 下一回合推進按鈕 */}
            <div className="pt-2">
              {isHost ? (
                <button
                  onClick={() => advanceRound(roomId)}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-sm rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <span>進入下一回合 ({room.currentRound + 1}/{room.totalRounds})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <div className="text-xs text-slate-400 py-2">
                  等待房主推進至下一回合...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 狀態 4: 整場對決結束 (Match Finished Victory / Defeat) */}
      {/* ======================================================== */}
      {room.status === 'finished' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-3xl p-6 text-center space-y-5 shadow-2xl">
            {room.winner === localPlayerId ? (
              <div className="space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center mx-auto text-amber-400 shadow-xl shadow-amber-500/30 animate-bounce">
                  <Crown className="w-10 h-10 fill-current" />
                </div>
                <h3 className="text-3xl font-black text-amber-400 tracking-tight">
                  VICTORY 勝利！
                </h3>
                <p className="text-xs text-slate-300">
                  心算大師實至名歸，以高分碾壓奪得對決榮耀！
                </p>
              </div>
            ) : room.winner === 'draw' ? (
              <div className="space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center mx-auto text-cyan-400 shadow-xl">
                  <Trophy className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-cyan-300">
                  DRAW 勢均力敵！
                </h3>
                <p className="text-xs text-slate-300">雙方比分完全持平，平分秋色！</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center mx-auto text-rose-400 shadow-xl">
                  <XCircle className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-rose-400">
                  DEFEAT 惜敗！
                </h3>
                <p className="text-xs text-slate-400">差一點就能逆轉，下局再來挑戰！</p>
              </div>
            )}

            {/* 總比分看板 */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div className="text-center flex-1">
                <span className="text-[10px] font-bold text-cyan-400 block truncate">
                  {myState?.displayName} (你)
                </span>
                <span className="text-3xl font-black font-mono text-white">
                  {myState?.score}
                </span>
              </div>

              <div className="text-xs font-black text-slate-600 px-3">VS</div>

              <div className="text-center flex-1">
                <span className="text-[10px] font-bold text-rose-400 block truncate">
                  {opponentState?.displayName || '對手'}
                </span>
                <span className="text-3xl font-black font-mono text-white">
                  {opponentState?.score || 0}
                </span>
              </div>
            </div>

            {/* 查看對手戰績與加好友按鈕 */}
            {opponentState && (
              <button
                onClick={() => {
                  sound.playTap();
                  setShowOpponentStats(true);
                }}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-rose-300 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-md"
              >
                <Users className="w-4 h-4 text-rose-400" />
                <span>查看「{opponentState.displayName}」戰績與加好友</span>
              </button>
            )}

            <button
              onClick={handleLeave}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-sm rounded-xl transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>返回對戰大廳</span>
            </button>
          </div>
        </div>
      )}

      {/* 對手詳細戰績與加好友彈窗 */}
      <OpponentStatsModal
        isOpen={showOpponentStats}
        onClose={() => setShowOpponentStats(false)}
        opponentUid={opponentState?.uid}
        opponentName={opponentState?.displayName}
      />
    </div>
  );
};
