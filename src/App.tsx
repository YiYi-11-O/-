/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Volume2, VolumeX, BookOpen, Settings, Lock, Trophy } from 'lucide-react';
import { TitleScreen } from './components/TitleScreen';
import { RuleTutorial } from './components/RuleTutorial';
import { DifficultyScreen } from './components/DifficultyScreen';
import { PlayTab } from './components/PlayTab';
import { RuleModal } from './components/RuleModal';
import { BackendLoginModal } from './components/BackendLoginModal';
import { AdminBackend } from './components/AdminBackend';
import { LeaderboardModal } from './components/LeaderboardModal';
import { sound } from './utils/audio';

type GameView = 'title' | 'tutorial' | 'difficulty' | 'play' | 'backend';

export default function App() {
  const [currentView, setCurrentView] = useState<GameView>('title');
  const [selectedDifficulty, setSelectedDifficulty] = useState<number>(3);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState<boolean>(false);
  const [isBackendLoginOpen, setIsBackendLoginOpen] = useState<boolean>(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState<boolean>(false);
  const [leaderboardDifficulty, setLeaderboardDifficulty] = useState<number>(3);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // 切換靜音
  const handleToggleMute = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  // 打開全服排行榜
  const handleOpenLeaderboard = (difficulty?: number) => {
    if (difficulty) {
      setLeaderboardDifficulty(difficulty);
    } else {
      setLeaderboardDifficulty(selectedDifficulty);
    }
    setIsLeaderboardOpen(true);
  };

  // 從標題點擊開始遊戲 -> 進入開場動畫講解
  const handleStartFromTitle = () => {
    setCurrentView('tutorial');
  };

  // 開場動畫完成或跳過 -> 先進入難度選項！
  const handleTutorialFinish = () => {
    setCurrentView('difficulty');
  };

  // 選擇難度後 -> 正式進入遊戲！
  const handleDifficultySelected = (difficulty: number) => {
    setSelectedDifficulty(difficulty);
    setCurrentView('play');
  };

  // 登入後台成功
  const handleBackendLoginSuccess = () => {
    setIsBackendLoginOpen(false);
    setCurrentView('backend');
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col selection:bg-amber-500/30 selection:text-amber-200">
      {/* 頂部導覽列 */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* 左側：品牌名稱 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentView('title')}
              className="text-base font-black tracking-tight text-white hover:text-amber-300 transition-colors cursor-pointer flex items-center gap-2"
            >
              <span>心算大師</span>
            </button>
            {currentView === 'backend' && (
              <span className="text-[10px] font-mono px-2 py-0.5 bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded">
                管理後台
              </span>
            )}
          </div>

          {/* 右側：排行榜、規則說明與音效切換 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sound.playTap();
                handleOpenLeaderboard();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-colors cursor-pointer"
              title="查看全服即時排行榜"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>全服排行</span>
            </button>

            {currentView === 'play' && (
              <button
                onClick={() => {
                  sound.playTap();
                  setIsRuleModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-750 rounded-lg transition-colors cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">規則說明</span>
              </button>
            )}

            <button
              onClick={handleToggleMute}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-lg transition-colors cursor-pointer"
              title={isMuted ? '開啟音效' : '靜音'}
              aria-label={isMuted ? '開啟音效' : '靜音'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* 視圖呈現切換區 */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full flex flex-col justify-center">
        {/* 1. 遊戲標題畫面 */}
        {currentView === 'title' && (
          <TitleScreen
            onStartGame={handleStartFromTitle}
            onOpenBackendLogin={() => setIsBackendLoginOpen(true)}
            onOpenLeaderboard={() => handleOpenLeaderboard()}
          />
        )}

        {/* 2. 開場遊戲規則講解動畫 (帶視覺進度條與倒數，自動播放，跑完後進入難度選項) */}
        {currentView === 'tutorial' && (
          <RuleTutorial
            onComplete={handleTutorialFinish}
            onSkip={handleTutorialFinish}
          />
        )}

        {/* 3. 難度選項畫面 (選擇難度後進入遊戲) */}
        {currentView === 'difficulty' && (
          <DifficultyScreen
            initialDifficulty={selectedDifficulty}
            onSelectAndStart={handleDifficultySelected}
            onBackToTitle={() => setCurrentView('title')}
            onOpenLeaderboard={handleOpenLeaderboard}
          />
        )}

        {/* 4. 遊戲進行主畫面 (每題計時，答不出來超時跳出分數) */}
        {currentView === 'play' && (
          <PlayTab
            initialDifficulty={selectedDifficulty}
            onOpenRules={() => setIsRuleModalOpen(true)}
            onBackToTitle={() => setCurrentView('title')}
            onChangeDifficulty={() => setCurrentView('difficulty')}
            onOpenLeaderboard={handleOpenLeaderboard}
          />
        )}

        {/* 5. 密碼保護之工程管理後台 */}
        {currentView === 'backend' && (
          <AdminBackend
            onReturnToGame={() => setCurrentView('play')}
            onLogout={() => setCurrentView('title')}
          />
        )}
      </main>

      {/* 全球即時排行榜彈窗 (每種難度獨立，跨裝置即時同步更新) */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        defaultDifficulty={leaderboardDifficulty}
      />

      {/* 圖文版規則說明彈窗 */}
      <RuleModal
        isOpen={isRuleModalOpen}
        onClose={() => setIsRuleModalOpen(false)}
      />

      {/* 後台密碼登入驗證彈窗 */}
      <BackendLoginModal
        isOpen={isBackendLoginOpen}
        onClose={() => setIsBackendLoginOpen(false)}
        onSuccess={handleBackendLoginSuccess}
      />

      {/* 頁尾 */}
      <footer className="border-t border-slate-900 bg-slate-950/60 py-3 text-center text-xs text-slate-600">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
          <span>《心算大師》手機遊戲</span>
          <span className="text-[11px] text-slate-500">
            四則運算心算挑戰 · 每題限時計時 · 超時自動結算成績
          </span>
        </div>
      </footer>
    </div>
  );
}
