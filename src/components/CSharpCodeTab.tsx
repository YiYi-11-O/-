/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Copy, Check, Download, FileCode, Code2, Layers } from 'lucide-react';
import {
  MENTAL_MATH_GENERATOR_CS,
  MENTAL_MATH_GENERATOR_TESTS_CS,
  MENTAL_MATH_GAME_MANAGER_CS,
} from '../csharp_sources';

const CODE_FILES = [
  {
    id: 'generator',
    filename: 'MentalMathGenerator.cs',
    title: '核心生成與驗證類別',
    badge: 'Core Engine',
    code: MENTAL_MATH_GENERATOR_CS,
    description: '包含 GenerateQuestion 與 ValidateEquation，實現嚴格整除驗證與雙 Pass 先乘除後加減運算。',
  },
  {
    id: 'tests',
    filename: 'MentalMathGeneratorTests.cs',
    title: '單元測試套件',
    badge: 'NUnit / Unity Test',
    code: MENTAL_MATH_GENERATOR_TESTS_CS,
    description: '包含 PEMDAS 優先級、小數拒絕、除以零防禦、作弊檢測與 100 題保證有解自動化測試。',
  },
  {
    id: 'manager',
    filename: 'MentalMathGameManager.cs',
    title: 'Unity UI 整合範例',
    badge: 'MonoBehaviour',
    code: MENTAL_MATH_GAME_MANAGER_CS,
    description: '展示如何將題目生成器與 Unity TextMeshPro、Button 點擊事件、音效與連擊計數器完整串接。',
  },
];

export const CSharpCodeTab: React.FC = () => {
  const [activeFileId, setActiveFileId] = useState<string>('generator');
  const [copied, setCopied] = useState<boolean>(false);

  const activeFile = CODE_FILES.find((f) => f.id === activeFileId) || CODE_FILES[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(activeFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([activeFile.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = activeFile.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* 頂部檔案切換列 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-3 rounded-xl backdrop-blur-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {CODE_FILES.map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFileId(f.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-all whitespace-nowrap shrink-0 ${
                activeFileId === f.id
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>{f.filename}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            title="複製原始碼至剪貼簿"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">已複製</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>複製代碼</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors cursor-pointer"
            title="下載 C# 源檔案 (.cs)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>下載 {activeFile.filename}</span>
          </button>
        </div>
      </div>

      {/* 檔案摘要卡片 */}
      <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 shrink-0">
            <Code2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white">{activeFile.filename}</h4>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-800 text-amber-300 rounded border border-slate-700">
                {activeFile.badge}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{activeFile.description}</p>
          </div>
        </div>

        <div className="text-right text-xs font-mono text-slate-500 shrink-0 hidden md:block">
          <div>C# 9.0+ / .NET Standard 2.1</div>
          <div className="text-[11px] text-slate-600">Unity 2021.3+ LTS 相容</div>
        </div>
      </div>

      {/* 程式碼檢視區 (高對比暗色終端風) */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2 font-mono">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/70 inline-block"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70 inline-block"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70 inline-block"></span>
            <span className="ml-2 text-slate-300 font-semibold">{activeFile.filename}</span>
          </div>
          <span className="font-mono text-slate-500 text-[11px]">
            {activeFile.code.split('\n').length} 行
          </span>
        </div>

        <div className="p-4 overflow-x-auto max-h-[640px] text-xs font-mono leading-relaxed text-slate-300 select-all">
          <pre>
            <code>{activeFile.code}</code>
          </pre>
        </div>
      </div>

      {/* Unity 導入簡介 */}
      <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl text-xs text-slate-400 flex items-start gap-3">
        <Layers className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-200">Unity 專案整合說明：</strong>
          將下載的 <code className="text-amber-300 font-mono">MentalMathGenerator.cs</code> 直接拖曳至 Unity 專案的 <code className="text-slate-300 font-mono">Assets/Scripts/Core/</code> 目錄即可使用。測試檔案 <code className="text-amber-300 font-mono">MentalMathGeneratorTests.cs</code> 放置於 <code className="text-slate-300 font-mono">Assets/Tests/EditMode/</code> 目錄，並在 Unity 編輯器選單 <code className="text-slate-300">Window &gt; General &gt; Test Runner</code> 中直接一鍵執行！
        </div>
      </div>
    </div>
  );
};
