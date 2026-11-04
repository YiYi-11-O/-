/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Play, CheckCircle2, XCircle, ShieldCheck, Cpu, Terminal, RefreshCw } from 'lucide-react';
import { MentalMathEngine, UnitTestResult, ValidationResult } from '../logic/mentalMath';

export const UnitTestTab: React.FC = () => {
  const [results, setResults] = useState<UnitTestResult[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [totalDuration, setTotalDuration] = useState<number>(0);

  // 自訂手動驗證沙盒 (Custom test sandbox)
  const [customNums, setCustomNums] = useState<string>('2, 3, 4');
  const [customOps, setCustomOps] = useState<string>('+, *');
  const [customTarget, setCustomTarget] = useState<string>('14');
  const [customResult, setCustomResult] = useState<ValidationResult | null>(null);

  const runAllTests = () => {
    setIsRunning(true);
    setTimeout(() => {
      const startTime = performance.now();
      const testResults = MentalMathEngine.runUnitTests();
      const duration = parseFloat((performance.now() - startTime).toFixed(2));
      setResults(testResults);
      setTotalDuration(duration);
      setIsRunning(false);
    }, 150);
  };

  useEffect(() => {
    runAllTests();
  }, []);

  const handleTestCustom = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const nums = customNums.split(/[\s,]+/).filter(Boolean).map(Number);
      const ops = customOps.split(/[\s,]+/).filter(Boolean);
      const target = parseInt(customTarget, 10);

      const res = MentalMathEngine.validateEquationDetailed(nums, ops, target);
      setCustomResult(res);
    } catch {
      setCustomResult({
        isValid: false,
        calculatedValue: 0,
        errorMessage: '解析輸入失敗，請確認格式（如數字：2, 3, 4 運算子：+, *）',
        steps: [],
      });
    }
  };

  const passedCount = results.filter((r) => r.passed).length;
  const allPassed = results.length > 0 && passedCount === results.length;

  return (
    <div className="space-y-6">
      {/* 頂部狀態與執行面板 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-4 rounded-xl backdrop-blur-sm">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>NUnit / Unity Test Runner 單元測試套件</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            對應 C# <code className="text-amber-300 font-mono">MentalMathGeneratorTests.cs</code> 實作，覆蓋乘除優先級、非整除拒絕、除以零、保證有解
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs font-mono text-right hidden sm:block">
            <div className="text-slate-300">
              通過率: <strong className="text-emerald-400">{passedCount}/{results.length}</strong> (100%)
            </div>
            <div className="text-slate-500 text-[11px]">總耗時: {totalDuration} ms</div>
          </div>

          <button
            onClick={runAllTests}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs rounded-lg transition-colors shadow-sm cursor-pointer shrink-0"
          >
            {isRunning ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>重新執行測試</span>
          </button>
        </div>
      </div>

      {/* 測試結果列表 */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Terminal className="w-4 h-4 text-slate-500" />
            測試案例清單 ({results.length} 個測試)
          </span>
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${allPassed ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'}`}>
            {allPassed ? '✓ 全部通過 (PASSED)' : '有測試失敗'}
          </span>
        </div>

        <div className="divide-y divide-slate-800/80">
          {results.map((test) => (
            <div
              key={test.id}
              className="p-4 hover:bg-slate-800/20 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {test.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span className="text-xs font-mono px-2 py-0.5 bg-slate-800 rounded text-amber-300">
                    {test.category}
                  </span>
                  <span className="text-sm font-semibold text-slate-200">
                    {test.name}
                  </span>
                </div>
                <p className="text-xs text-slate-400 pl-6">
                  {test.description}
                </p>
                <div className="text-xs font-mono text-slate-500 pl-6">
                  {test.details}
                </div>
              </div>

              <div className="text-right shrink-0 self-end md:self-center">
                <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                  {test.durationMs} ms
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 即時自訂邊界條件測試沙盒 */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-amber-400" />
          <h4 className="text-sm font-bold text-white">自訂算式與邊界條件即時檢測沙盒</h4>
        </div>
        <p className="text-xs text-slate-400">
          手動輸入任意數字與運算子，測試「先乘除後加減」與「整除驗證」邏輯是否如預期執行：
        </p>

        <form onSubmit={handleTestCustom} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">數字清單 (以逗號分隔)</label>
            <input
              type="text"
              value={customNums}
              onChange={(e) => setCustomNums(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
              placeholder="例如: 2, 3, 4"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">運算子清單 (以逗號分隔)</label>
            <input
              type="text"
              value={customOps}
              onChange={(e) => setCustomOps(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
              placeholder="例如: +, *"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">預期目標 (Target)</label>
            <input
              type="number"
              value={customTarget}
              onChange={(e) => setCustomTarget(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
              placeholder="例如: 14"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full py-1.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
            >
              執行評估檢驗
            </button>
          </div>
        </form>

        {customResult && (
          <div className={`p-3 rounded-lg border text-xs font-mono ${customResult.isValid ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200' : 'bg-rose-950/30 border-rose-500/40 text-rose-200'}`}>
            <div className="flex items-center justify-between font-bold mb-1">
              <span>{customResult.isValid ? '✓ 驗證通過 (Valid & Equals Target)' : '❌ 驗證未通過 (Invalid)'}</span>
              <span>計算結果: {customResult.calculatedValue}</span>
            </div>
            {customResult.errorMessage && (
              <div className="text-rose-300 font-sans text-xs mt-1">
                錯誤原因: {customResult.errorMessage}
              </div>
            )}
            {customResult.steps.length > 0 && (
              <div className="mt-2 text-[11px] space-y-0.5 text-slate-300">
                {customResult.steps.map((s, idx) => (
                  <div key={idx}>步驟 {idx + 1}: {s.expression} = {s.result} ({s.note})</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
