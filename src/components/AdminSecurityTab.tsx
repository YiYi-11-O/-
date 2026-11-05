/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Lock, KeyRound, Check, AlertTriangle, ShieldCheck, RotateCcw, Save } from 'lucide-react';
import {
  getBackendPassword,
  setBackendPassword,
  resetBackendPassword,
  isDefaultBackendPassword,
  verifyBackendPassword,
  DEFAULT_BACKEND_PASSWORD,
} from '../services/gameSettingsService';
import { sound } from '../utils/audio';

export const AdminSecurityTab: React.FC = () => {
  const [currentPwd, setCurrentPwd] = useState<string>('');
  const [newPwd, setNewPwd] = useState<string>('');
  const [confirmPwd, setConfirmPwd] = useState<string>('');

  const [message, setMessage] = useState<{ text: string; isError?: boolean } | null>(null);
  const [isDefault, setIsDefault] = useState<boolean>(() => isDefaultBackendPassword());

  const showMsg = (text: string, isError = false) => {
    setMessage({ text, isError });
    setTimeout(() => setMessage(null), 3500);
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playTap();

    if (!verifyBackendPassword(currentPwd)) {
      sound.playError();
      showMsg('目前密碼輸入錯誤，無法變更！', true);
      return;
    }

    if (newPwd.length < 4) {
      sound.playError();
      showMsg('新密碼長度至少需 4 位字元！', true);
      return;
    }

    if (newPwd !== confirmPwd) {
      sound.playError();
      showMsg('兩次輸入的新密碼不一致！', true);
      return;
    }

    const success = setBackendPassword(newPwd);
    if (success) {
      sound.playSuccess();
      showMsg('後台管理密碼已成功變更！請妥善保管新密碼。');
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
      setIsDefault(isDefaultBackendPassword());
    } else {
      sound.playError();
      showMsg('儲存新密碼失敗，請稍後再試。', true);
    }
  };

  const handleResetToDefault = () => {
    sound.playTap();
    resetBackendPassword();
    sound.playSuccess();
    setCurrentPwd('');
    setNewPwd('');
    setConfirmPwd('');
    setIsDefault(true);
    showMsg(`已成功將管理密碼重置為系統初始預設 (${DEFAULT_BACKEND_PASSWORD})！`);
  };

  return (
    <div className="space-y-6 max-w-lg select-none">
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-xl space-y-4">
        {/* 標題與目前狀態 */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">後台安全通行密碼設定</h3>
              <p className="text-xs text-slate-400">
                修改進入此開發者與管理後台所需的專屬密碼。
              </p>
            </div>
          </div>

          <div className="text-right">
            <span
              className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                isDefault
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              }`}
            >
              {isDefault ? '使用預設密碼 (8888)' : '已啟用自訂專屬密碼'}
            </span>
          </div>
        </div>

        {/* 提示訊息 */}
        {message && (
          <div
            className={`p-3 rounded-2xl border text-xs font-semibold flex items-center gap-2 animate-fade-in ${
              message.isError
                ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
            }`}
          >
            {message.isError ? (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <Check className="w-4 h-4 text-emerald-400 stroke-[3] shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* 密碼變更表單 */}
        <form onSubmit={handleUpdatePassword} className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 block">
              目前的管理密碼
            </label>
            <input
              type="password"
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
              placeholder={isDefault ? '請輸入目前密碼 (預設: 8888)' : '請輸入目前密碼'}
              required
              className="w-full py-2.5 px-3.5 bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl text-xs font-mono text-white outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 block">
              設定新管理密碼 (至少 4 位)
            </label>
            <input
              type="password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              placeholder="輸入新密碼 (英數字元均可)"
              required
              minLength={4}
              maxLength={20}
              className="w-full py-2.5 px-3.5 bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl text-xs font-mono text-white outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 block">
              再次輸入確認新密碼
            </label>
            <input
              type="password"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              placeholder="再次輸入新密碼確認"
              required
              minLength={4}
              maxLength={20}
              className="w-full py-2.5 px-3.5 bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl text-xs font-mono text-white outline-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-between gap-3">
            {!isDefault && (
              <button
                type="button"
                onClick={handleResetToDefault}
                className="px-3 py-2 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>還原為 8888</span>
              </button>
            )}

            <button
              type="submit"
              className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>確認修改管理密碼</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
