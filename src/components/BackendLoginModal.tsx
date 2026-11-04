/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Lock, X, KeyRound, AlertCircle, Shield } from 'lucide-react';
import { sound } from '../utils/audio';

interface BackendLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const DEFAULT_PASSWORD = '8888';

export const BackendLoginModal: React.FC<BackendLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [password, setPassword] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === DEFAULT_PASSWORD) {
      sound.playSuccess();
      setPassword('');
      setErrorMsg('');
      onSuccess();
    } else {
      sound.playError();
      setErrorMsg('密碼錯誤！請輸入預設管理密碼');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
        {/* 標題 */}
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">管理後台驗證</h3>
          </div>
          <button
            onClick={() => {
              setPassword('');
              setErrorMsg('');
              onClose();
            }}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 表單 */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="text-center space-y-1">
            <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-amber-400 mb-2">
              <KeyRound className="w-6 h-6" />
            </div>
            <p className="text-xs text-slate-300 font-medium">請輸入後台通行密碼</p>
            <p className="text-[11px] text-slate-500">
              包含單元測試、千題壓力驗證、C# 原始碼下載與架構文件
            </p>
          </div>

          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrorMsg('');
              }}
              placeholder="輸入密碼 (預設: 8888)"
              autoFocus
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-center text-sm text-white tracking-widest font-mono focus:outline-none focus:border-amber-500"
            />
            {errorMsg && (
              <p className="text-rose-400 text-[11px] mt-1.5 flex items-center justify-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span>{errorMsg}</span>
              </p>
            )}
          </div>

          <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/80 text-[11px] text-slate-400 text-center">
            提示：預設管理密碼為 <strong className="text-amber-400 font-mono">8888</strong>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              進入後台
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
