/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, CheckCircle2, XCircle, Sparkles, AlertCircle, Calculator } from 'lucide-react';

interface RuleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RuleModal: React.FC<RuleModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal 標題列 */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/15 border border-amber-500/30 rounded-lg text-amber-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">《心算大師》遊戲規則圖解</h3>
              <p className="text-xs text-slate-400">簡單四步驟，輕鬆成為心算神童！</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            aria-label="關閉規則說明"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal 內容區 */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-slate-300 text-xs sm:text-sm">
          {/* 規則 1: 4 個數字都要用 */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">1</span>
              <span>4 張數字卡，每張恰好使用一次</span>
            </div>
            <p className="text-slate-400 text-xs">
              題目會給出 4 個基礎數字與 1 個目標數字。玩家必須運用四則運算符號（+、−、×、÷），將這 4 個數字全部用上，組合出目標答案！
            </p>
            {/* 圖解 1 */}
            <div className="flex items-center justify-center gap-2 p-3 bg-slate-900/80 rounded-lg border border-slate-800 text-xs font-mono">
              <span className="px-3 py-1.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg font-bold">3</span>
              <span className="text-amber-400 font-bold">×</span>
              <span className="px-3 py-1.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg font-bold">8</span>
              <span className="text-amber-400 font-bold">+</span>
              <span className="px-3 py-1.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg font-bold">4</span>
              <span className="text-amber-400 font-bold">÷</span>
              <span className="px-3 py-1.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg font-bold">2</span>
              <span className="text-slate-500 font-bold">=</span>
              <span className="px-3 py-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg font-bold">26</span>
            </div>
          </div>

          {/* 規則 2: 先乘除後加減 */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
              <span className="w-5 h-5 rounded-full bg-indigo-500 text-white font-black text-xs flex items-center justify-center">2</span>
              <span>先乘除，後加減（無括號）</span>
            </div>
            <p className="text-slate-400 text-xs">
              計算時系統會嚴格遵照數學四則運算規則，優先計算乘法（×）與除法（÷），最後才由左至右算加法（+）與減法（−）。
            </p>
            {/* 圖解 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                <div className="font-semibold text-slate-300">例題算式：2 + 3 × 4</div>
                <div className="text-[11px] text-emerald-400">
                  ✓ 先算 3 × 4 = 12<br />
                  ✓ 再算 2 + 12 = <strong>14</strong>
                </div>
              </div>
              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                <div className="font-semibold text-slate-300">常見誤區（由左至右算）</div>
                <div className="text-[11px] text-rose-400">
                  ❌ 若算成 (2+3) × 4 = 20 是錯誤的！必須遵從先乘除。
                </div>
              </div>
            </div>
          </div>

          {/* 規則 3: 除法不得產生小數 */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <span className="w-5 h-5 rounded-full bg-rose-500 text-white font-black text-xs flex items-center justify-center">3</span>
              <span>除法必須整除，不得產生小數點</span>
            </div>
            <p className="text-slate-400 text-xs">
              除法運算在每一步都必須能整除！只要有任何一步出現小數點（有餘數）或是除以 0，該算式就會判定為不合格。
            </p>
            {/* 圖解 3 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-lg flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-emerald-300 text-xs block">8 ÷ 2 = 4 (合格)</strong>
                  <span className="text-[11px] text-slate-400">沒有餘數，完美整除！</span>
                </div>
              </div>

              <div className="p-3 bg-rose-950/20 border border-rose-500/30 rounded-lg flex items-start gap-2.5">
                <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-rose-300 text-xs block">7 ÷ 2 = 3.5 (違規)</strong>
                  <span className="text-[11px] text-slate-400">產生小數點，心算大師不允許！</span>
                </div>
              </div>
            </div>
          </div>

          {/* 規則 4: 題目保證必有解 */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center">4</span>
              <span>100% 保證有解</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              每一道題目在生成時都已經由系統預先建構驗證，保證絕對有解！如果一時想不出解法，可以點擊畫面下方的「💡 解答提示」查看其中一種解答。
            </p>
          </div>
        </div>

        {/* Modal 頁尾按鈕 */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            我瞭解了，開始挑戰
          </button>
        </div>
      </div>
    </div>
  );
};
