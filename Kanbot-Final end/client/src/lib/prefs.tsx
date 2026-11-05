import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AR } from './ar';

export type Lang = 'en' | 'ar';
export interface A11y { size: 0 | 1 | 2; contrast: boolean; motion: boolean; spacing: boolean; focus: boolean }
const DEF: A11y = { size: 0, contrast: false, motion: true, spacing: false, focus: false };
const LANG_KEY = 'kanbot_lang';
const A11Y_KEY = 'kanbot_a11y';

function loadLang(): Lang {
  try { const v = localStorage.getItem(LANG_KEY); if (v === 'ar' || v === 'en') return v; } catch { /* ignore */ }
  return navigator.language.toLowerCase().startsWith('ar') ? 'ar' : 'en';
}
function loadA11y(): A11y {
  try { const v = localStorage.getItem(A11Y_KEY); return v ? { ...DEF, ...(JSON.parse(v) as Partial<A11y>) } : DEF; } catch { return DEF; }
}

interface Prefs {
  lang: Lang; setLang: (l: Lang) => void; t: (k: string, vars?: Record<string, string | number>) => string;
  a11y: A11y; setA11y: (p: Partial<A11y>) => void; reset: () => void;
}
const Ctx = createContext<Prefs | null>(null);
export function usePrefs(): Prefs {
  const c = useContext(Ctx);
  if (!c) throw new Error('usePrefs must be used inside PrefsProvider');
  return c;
}

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(loadLang);
  const [a11y, setA11yState] = useState<A11y>(loadA11y);

  useEffect(() => {
    const h = document.documentElement;
    h.lang = lang; h.dir = lang === 'ar' ? 'rtl' : 'ltr';
    h.dataset.fs = String(a11y.size); h.dataset.contrast = a11y.contrast ? 'high' : 'normal';
    h.dataset.motion = a11y.motion ? 'on' : 'off'; h.dataset.spacing = a11y.spacing ? 'wide' : 'normal'; h.dataset.focus = a11y.focus ? 'strong' : 'normal';
    try { localStorage.setItem(LANG_KEY, lang); localStorage.setItem(A11Y_KEY, JSON.stringify(a11y)); } catch { /* ignore */ }
  }, [lang, a11y]);

  const t = useCallback((k: string, vars?: Record<string, string | number>) => {
    let s = lang === 'ar' ? AR[k] ?? k : k;
    if (vars) for (const [n, v] of Object.entries(vars)) s = s.replace(`{${n}}`, String(v));
    return s;
  }, [lang]);

  const value = useMemo<Prefs>(() => ({
    lang, setLang: setLangState, t, a11y,
    setA11y: (p) => setA11yState((a) => ({ ...a, ...p })), reset: () => setA11yState(DEF),
  }), [lang, t, a11y]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
