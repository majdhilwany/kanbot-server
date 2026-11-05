import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { usePrefs } from '../lib/prefs';

type Theme = 'system' | 'light' | 'dark';
const KEY = 'kanbot_theme';
export function applyTheme(t: Theme) {
  if (t === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
}
export function savedTheme(): Theme {
  try { const v = localStorage.getItem(KEY); if (v === 'light' || v === 'dark' || v === 'system') return v; } catch { /* ignore */ }
  return 'system';
}
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(savedTheme);
  const { lang } = usePrefs();
  useEffect(() => { applyTheme(theme); try { localStorage.setItem(KEY, theme); } catch { /* ignore */ } }, [theme]);
  const label = theme === 'system' ? (lang === 'ar' ? 'تلقائي' : 'Auto') : theme === 'dark' ? (lang === 'ar' ? 'داكن' : 'Dark') : (lang === 'ar' ? 'فاتح' : 'Light');
  const Icon = theme === 'system' ? Monitor : theme === 'dark' ? Moon : Sun;
  const next = () => setTheme((v) => v === 'system' ? 'light' : v === 'light' ? 'dark' : 'system');
  const aria = lang === 'ar' ? `المظهر الحالي ${label}، اضغط للتغيير` : `Current theme ${label}, click to change`;
  return <button className="theme-switch" onClick={next} aria-label={aria} title={aria}>
    <span className="theme-switch-icon"><Icon size={17} /></span><span className="theme-switch-label">{label}</span>
  </button>;
}
