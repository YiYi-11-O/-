/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BookOpen, Cpu, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';

export const DocTab: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* 頂部引言 */}
      <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl space-y-2">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-amber-400" />
          <span>《心算大師》Unity/C# 系統架構與設計筆記</span>
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          針對手遊環境的高幀率（60~120 FPS）與低延遲需求，本系統恪守<strong>「簡潔高效、高魯棒性、避免過度工程化」</strong>三大原則，摒棄笨重的編譯器抽象語法樹（AST）與反射，以最純粹的雙 Pass 線性掃描實作四則運算優先級與整除防護。
        </p>
      </div>

      {/* 核心架構 1: 雙 Pass 掃描器 */}
      <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-xl space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-amber-300">
          <Cpu className="w-4 h-4" />
          <span>1. 算式評估架構：雙 Pass 線性掃描 (Two-Pass Token Folding)</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          一般手遊的算式長度固定（如 4 個數字搭配 3 個運算子）。若引入 Shunting-Yard 或語法樹解析器，會產生額外的節點記憶體配置與遞迴開銷。
        </p>
        <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800/80 font-mono text-xs text-slate-300 space-y-1">
          <div className="text-amber-400 font-semibold">// 核心運算步驟</div>
          <div>輸入: numbers = [2, 3, 4], ops = ['+', '*'], target = 14</div>
          <div className="text-slate-400">Pass 1 (乘除摺疊): 由左至右掃描，遇到 '*' 或 '/' 即時結算棧頂數字</div>
          <div className="text-emerald-400">  → 發現 3 * 4，將其摺疊為 12，剩餘 numbers = [2, 12], ops = ['+']</div>
          <div className="text-slate-400">Pass 2 (加減結算): 依序計算剩餘的加減法</div>
          <div className="text-emerald-400">  → 2 + 12 = 14 == target ✓ 通過！</div>
        </div>
      </div>

      {/* 核心架構 2: 嚴格整除約束 */}
      <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-xl space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-indigo-300">
          <ShieldAlert className="w-4 h-4" />
          <span>2. 嚴格整除驗證 (Integer Division Discipline)</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          手遊心算強調純整數心算體驗。若除法產生小數（例如 7 ÷ 2 = 3.5），在程式設計中若誤用整數除法（C# <code className="text-amber-300 font-mono">7 / 2 = 3</code>），會發生數值截斷而導致錯誤的「偽解答」。
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
            <span className="font-bold text-rose-400">❌ 傳統陷阱（截斷取整）</span>
            <p className="text-slate-400 text-[11px]">
              若未檢查餘數，算式 <code className="text-slate-300 font-mono">7 / 2 + 1</code> 在 C# 中會被截斷為 <code className="text-slate-300 font-mono">3 + 1 = 4</code>，玩家誤以為正確，實則違反無小數規範。
            </p>
          </div>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
            <span className="font-bold text-emerald-400">✓ 本系統實作（即時餘數檢查）</span>
            <p className="text-slate-400 text-[11px]">
              在 Pass 1 執行除法時，強制執行 <code className="text-amber-300 font-mono">if (prevNum % nextNum != 0) return false;</code>，杜絕任何隱性小數產生！
            </p>
          </div>
        </div>
      </div>

      {/* 核心架構 3: 保證有解演算法 */}
      <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-xl space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-emerald-300">
          <Sparkles className="w-4 h-4" />
          <span>3. 逆向語法建構（Guaranteed Solvable by Construction）</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          傳統做法常為「隨機生成 4 個數字與 1 個目標，再窮舉求解」，但當目標較大或四則運算受限時，窮舉可能耗時數十毫秒甚至無解，破壞手遊體驗。
        </p>
        <div className="space-y-2 text-xs text-slate-300">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span><strong>前向正解構建</strong>：先隨機挑選 3 個符合難度階梯的運算子與數字種子。</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span><strong>除法倍數修正</strong>：若運算子為除法，自動將被除數修正為除數的整數倍，保證 100% 整除。</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span><strong>前向求值與洗牌</strong>：計算出目標整數後，將 4 個數字透過 Fisher-Yates 洗牌傳給客戶端，玩家手中必有解！</span>
          </div>
        </div>
      </div>

      {/* 核心架構 4: 手機 GC 考量 */}
      <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-xl space-y-2">
        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
          4. 手機遊戲 GC 記憶體優化 (Zero GC Allocation)
        </h4>
        <ul className="list-disc list-inside text-xs text-slate-400 space-y-1">
          <li>以 <code className="text-amber-300 font-mono">struct QuestionData</code> 與 <code className="text-amber-300 font-mono">readonly struct ValidationResult</code> 取代 class，避免短生命週期物件在 GC Managed Heap 造成卡頓。</li>
          <li>杜絕 LINQ 呼叫（如 <code className="text-slate-500 font-mono">.Where().Select().First()</code>），以原生迴圈和固定容量 List 達成極限運算效能。</li>
          <li>內建靜態隨機數發生器（Random），避免重複 new Random 產生的開銷。</li>
        </ul>
      </div>
    </div>
  );
};
