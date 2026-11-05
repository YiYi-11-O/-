/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ArrowLeft, ShieldCheck, Activity, FileCode, BookOpen, LogOut, Clock, Trophy, Lock, Users } from 'lucide-react';
import { UnitTestTab } from './UnitTestTab';
import { BenchmarkTab } from './BenchmarkTab';
import { CSharpCodeTab } from './CSharpCodeTab';
import { DocTab } from './DocTab';
import { AdminTimerSettingsTab } from './AdminTimerSettingsTab';
import { AdminLeaderboardTab } from './AdminLeaderboardTab';
import { AdminPlayersTab } from './AdminPlayersTab';
import { AdminSecurityTab } from './AdminSecurityTab';
import { sound } from '../utils/audio';

interface AdminBackendProps {
  onReturnToGame: () => void;
  onLogout: () => void;
}

type BackendTab = 'timer' | 'leaderboard' | 'players' | 'security' | 'tests' | 'benchmark' | 'csharp' | 'docs';

export const AdminBackend: React.FC<AdminBackendProps> = ({ onReturnToGame, onLogout }) => {
  const [activeTab, setActiveTab] = useState<BackendTab>('timer');

  const handleReturn = () => {
    sound.playTap();
    onReturnToGame();
  };

  const handleExit = () => {
    sound.playTap();
    onLogout();
  };

  return (
    <div className="space-y-6">
      {/* 後台專用頂部控制列 */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={handleReturn}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>返回遊戲</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-white">
                系統工程與管理後台
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded">
                Developer Console
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              包含 Unity C# 類別程式碼、NUnit 單元測試套件與演算法千題壓力驗證
            </p>
          </div>
        </div>

        <button
          onClick={handleExit}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/40 rounded-lg transition-colors cursor-pointer self-end sm:self-auto"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>登出後台</span>
        </button>
      </div>

      {/* 後台分頁切換列 */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('timer')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${
            activeTab === 'timer'
              ? 'border-amber-400 text-amber-300 bg-slate-900/80'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>時間設定</span>
        </button>

        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${
            activeTab === 'leaderboard'
              ? 'border-amber-400 text-amber-300 bg-slate-900/80'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>排行榜管理與刪除</span>
        </button>

        <button
          onClick={() => setActiveTab('players')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${
            activeTab === 'players'
              ? 'border-cyan-400 text-cyan-300 bg-slate-900/80'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>玩家資訊管理與刪除</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${
            activeTab === 'security'
              ? 'border-amber-400 text-amber-300 bg-slate-900/80'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>修改後台密碼</span>
        </button>

        <button
          onClick={() => setActiveTab('tests')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${
            activeTab === 'tests'
              ? 'border-amber-400 text-amber-300 bg-slate-900/80'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>單元測試套件</span>
        </button>

        <button
          onClick={() => setActiveTab('benchmark')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${
            activeTab === 'benchmark'
              ? 'border-amber-400 text-amber-300 bg-slate-900/80'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>千題壓力驗證</span>
        </button>

        <button
          onClick={() => setActiveTab('csharp')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${
            activeTab === 'csharp'
              ? 'border-amber-400 text-amber-300 bg-slate-900/80'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>C# 原始碼與下載</span>
        </button>

        <button
          onClick={() => setActiveTab('docs')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${
            activeTab === 'docs'
              ? 'border-amber-400 text-amber-300 bg-slate-900/80'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>系統架構設計筆記</span>
        </button>
      </div>

      {/* 分頁內容 */}
      <div>
        {activeTab === 'timer' && <AdminTimerSettingsTab />}
        {activeTab === 'leaderboard' && <AdminLeaderboardTab />}
        {activeTab === 'players' && <AdminPlayersTab />}
        {activeTab === 'security' && <AdminSecurityTab />}
        {activeTab === 'tests' && <UnitTestTab />}
        {activeTab === 'benchmark' && <BenchmarkTab />}
        {activeTab === 'csharp' && <CSharpCodeTab />}
        {activeTab === 'docs' && <DocTab />}
      </div>
    </div>
  );
};
