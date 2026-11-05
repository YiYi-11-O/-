/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface DifficultyConfig {
  level: number;
  name: string;
  tag: string;
  timeLimit: number; // 秒數
  numRange: string;
  allowedOps: string;
  desc: string;
  color: string;
  borderColor: string;
  badgeBg: string;
}

export const DEFAULT_TIME_LIMITS: Record<number, number> = {
  1: 45,
  2: 40,
  3: 35,
  4: 30,
  5: 25,
};

const BASE_DIFFICULTY_METADATA: Omit<DifficultyConfig, 'timeLimit'>[] = [
  {
    level: 1,
    name: '入門新手',
    tag: '純加減',
    numRange: '1 ~ 9',
    allowedOps: '+ , −',
    desc: '適合熱身！僅需使用加法與減法。',
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/40',
    badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  {
    level: 2,
    name: '基礎學徒',
    tag: '加減乘',
    numRange: '1 ~ 12',
    allowedOps: '+ , − , ×',
    desc: '加入乘法優先級！考驗先乘除後加減。',
    color: 'text-cyan-400',
    borderColor: 'border-cyan-500/40',
    badgeBg: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  },
  {
    level: 3,
    name: '進階高手',
    tag: '四則全開 · 需整除',
    numRange: '2 ~ 16',
    allowedOps: '+ , − , × , ÷',
    desc: '解鎖除法！除法運算必須整除（標準推薦難度）。',
    color: 'text-amber-400',
    borderColor: 'border-amber-500/40',
    badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  {
    level: 4,
    name: '挑戰精英',
    tag: '大數四則',
    numRange: '2 ~ 25',
    allowedOps: '+ , − , × , ÷',
    desc: '數字範圍擴大，思考時間縮減。',
    color: 'text-orange-400',
    borderColor: 'border-orange-500/40',
    badgeBg: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  },
  {
    level: 5,
    name: '心算大師',
    tag: '極限速度燒腦',
    numRange: '3 ~ 40',
    allowedOps: '+ , − , × , ÷',
    desc: '極限倒數計時，只有真正的心算大師能突破！',
    color: 'text-rose-400',
    borderColor: 'border-rose-500/40',
    badgeBg: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  },
];

const TIME_LIMITS_STORAGE_KEY = 'mental_math_time_limits_v1';
const TUTORIAL_STORAGE_KEY = 'mental_math_tutorial_speed_v1';

const timeLimitListeners: Array<(limits: Record<number, number>) => void> = [];
const tutorialListeners: Array<(settings: TutorialAnimationSettings) => void> = [];

export interface TutorialAnimationSettings {
  speedMultiplier: number; // 例如 0.5x, 1.0x, 1.5x, 2.0x, 3.0x
  stepDurations: number[]; // [3500, 4200, 3600, 2200] 預設基準毫秒
}

export const DEFAULT_TUTORIAL_SETTINGS: TutorialAnimationSettings = {
  speedMultiplier: 1.0,
  stepDurations: [3500, 4200, 3600, 2200],
};

export function getTimeLimits(): Record<number, number> {
  try {
    const raw = localStorage.getItem(TIME_LIMITS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        1: Number(parsed[1]) || DEFAULT_TIME_LIMITS[1],
        2: Number(parsed[2]) || DEFAULT_TIME_LIMITS[2],
        3: Number(parsed[3]) || DEFAULT_TIME_LIMITS[3],
        4: Number(parsed[4]) || DEFAULT_TIME_LIMITS[4],
        5: Number(parsed[5]) || DEFAULT_TIME_LIMITS[5],
      };
    }
  } catch (err) {
    console.warn('Failed to read time limits from storage:', err);
  }
  return { ...DEFAULT_TIME_LIMITS };
}

export function saveTimeLimits(limits: Record<number, number>): void {
  try {
    const sanitized: Record<number, number> = {
      1: Math.max(5, Math.min(600, Math.round(limits[1] || DEFAULT_TIME_LIMITS[1]))),
      2: Math.max(5, Math.min(600, Math.round(limits[2] || DEFAULT_TIME_LIMITS[2]))),
      3: Math.max(5, Math.min(600, Math.round(limits[3] || DEFAULT_TIME_LIMITS[3]))),
      4: Math.max(5, Math.min(600, Math.round(limits[4] || DEFAULT_TIME_LIMITS[4]))),
      5: Math.max(5, Math.min(600, Math.round(limits[5] || DEFAULT_TIME_LIMITS[5]))),
    };
    localStorage.setItem(TIME_LIMITS_STORAGE_KEY, JSON.stringify(sanitized));
    timeLimitListeners.forEach((l) => l(sanitized));
  } catch (err) {
    console.error('Failed to save time limits:', err);
  }
}

export function resetTimeLimits(): Record<number, number> {
  saveTimeLimits(DEFAULT_TIME_LIMITS);
  return { ...DEFAULT_TIME_LIMITS };
}

export function getDifficultyConfigs(): DifficultyConfig[] {
  const limits = getTimeLimits();
  return BASE_DIFFICULTY_METADATA.map((meta) => ({
    ...meta,
    timeLimit: limits[meta.level] || DEFAULT_TIME_LIMITS[meta.level],
  }));
}

export function subscribeTimeLimits(listener: (limits: Record<number, number>) => void): () => void {
  timeLimitListeners.push(listener);
  return () => {
    const idx = timeLimitListeners.indexOf(listener);
    if (idx !== -1) timeLimitListeners.splice(idx, 1);
  };
}

// ========================
// 開場動畫時間快慢設定 (Tutorial Animation Speed)
// ========================

export function getTutorialSettings(): TutorialAnimationSettings {
  try {
    const raw = localStorage.getItem(TUTORIAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        speedMultiplier: Math.max(0.2, Math.min(5.0, Number(parsed.speedMultiplier) || 1.0)),
        stepDurations: Array.isArray(parsed.stepDurations) && parsed.stepDurations.length === 4
          ? parsed.stepDurations.map((d: number, i: number) => Number(d) || DEFAULT_TUTORIAL_SETTINGS.stepDurations[i])
          : [...DEFAULT_TUTORIAL_SETTINGS.stepDurations],
      };
    }
  } catch (err) {
    console.warn('Failed to read tutorial settings:', err);
  }
  return { ...DEFAULT_TUTORIAL_SETTINGS };
}

export function saveTutorialSettings(settings: TutorialAnimationSettings): void {
  try {
    const sanitized: TutorialAnimationSettings = {
      speedMultiplier: Math.max(0.2, Math.min(5.0, Number(settings.speedMultiplier) || 1.0)),
      stepDurations: settings.stepDurations.map((d) => Math.max(800, Math.min(15000, Math.round(d)))),
    };
    localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(sanitized));
    tutorialListeners.forEach((l) => l(sanitized));
  } catch (err) {
    console.error('Failed to save tutorial settings:', err);
  }
}

export function resetTutorialSettings(): TutorialAnimationSettings {
  saveTutorialSettings(DEFAULT_TUTORIAL_SETTINGS);
  return { ...DEFAULT_TUTORIAL_SETTINGS };
}

export function getCalculatedTutorialDurations(): number[] {
  const { speedMultiplier, stepDurations } = getTutorialSettings();
  return stepDurations.map((dur) => Math.max(600, Math.round(dur / speedMultiplier)));
}

export function subscribeTutorialSettings(listener: (settings: TutorialAnimationSettings) => void): () => void {
  tutorialListeners.push(listener);
  return () => {
    const idx = tutorialListeners.indexOf(listener);
    if (idx !== -1) tutorialListeners.splice(idx, 1);
  };
}

// ========================
// 後台管理密碼設定 (Backend Password Management)
// ========================

const BACKEND_PASSWORD_STORAGE_KEY = 'mental_math_backend_pwd_v1';
export const DEFAULT_BACKEND_PASSWORD = '8888';

export function getBackendPassword(): string {
  try {
    const pwd = localStorage.getItem(BACKEND_PASSWORD_STORAGE_KEY);
    if (pwd && pwd.trim().length >= 4) {
      return pwd.trim();
    }
  } catch (err) {
    console.warn('Failed to read backend password:', err);
  }
  return DEFAULT_BACKEND_PASSWORD;
}

export function setBackendPassword(newPassword: string): boolean {
  if (!newPassword || newPassword.trim().length < 4) {
    return false;
  }
  try {
    localStorage.setItem(BACKEND_PASSWORD_STORAGE_KEY, newPassword.trim());
    return true;
  } catch (err) {
    console.error('Failed to save backend password:', err);
    return false;
  }
}

export function resetBackendPassword(): void {
  try {
    localStorage.removeItem(BACKEND_PASSWORD_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to reset backend password:', err);
  }
}

export function isDefaultBackendPassword(): boolean {
  return getBackendPassword() === DEFAULT_BACKEND_PASSWORD;
}

export function verifyBackendPassword(input: string): boolean {
  return input.trim() === getBackendPassword();
}
