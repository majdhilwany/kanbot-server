import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Accessibility } from 'lucide-react';
import { usePrefs, type Lang } from '../lib/prefs';

function Switch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="switch">
      <span>{label}</span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <i aria-hidden="true" />
    </label>
  );
}

export function SettingsMenu() {
  const { t, lang, setLang, a11y, setA11y, reset } = usePrefs();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const click = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', click); document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', click); document.removeEventListener('keydown', key); };
  }, [open]);
  const langs: [Lang, string][] = [['en', 'English'], ['ar', 'العربية']];
  return createPortal((
    <div className="menu-wrap" ref={box}>
      <button type="button" className="a11y-fab" aria-haspopup="dialog" aria-expanded={open} aria-label={t('Accessibility')} title={t('Accessibility')} onClick={() => setOpen((o) => !o)}>
        <Accessibility size={22} />
      </button>
      {open && (
        <div className="popover a11y-popover" role="dialog" aria-label={t('Settings')}>
          <p className="label">{t('Language')}</p>
          <div className="seg">{langs.map(([k, l]) => <button key={k} aria-pressed={lang === k} onClick={() => setLang(k)}>{l}</button>)}</div>
          <p className="label">{t('Accessibility')}</p>
          <div className="seg" role="group" aria-label={t('Text size')}>
            {[0, 1, 2].map((n) => <button key={n} aria-pressed={a11y.size === n} aria-label={`${t('Text size')} ${n + 1}`} style={{ fontSize: `${0.9 + n * 0.2}rem` }} onClick={() => setA11y({ size: n as 0 | 1 | 2 })}>A</button>)}
          </div>
          <Switch label={t('High contrast')} checked={a11y.contrast} onChange={(v) => setA11y({ contrast: v })} />
          <Switch label={t('Animations')} checked={a11y.motion} onChange={(v) => setA11y({ motion: v })} />
          <Switch label={t('Readable spacing')} checked={a11y.spacing} onChange={(v) => setA11y({ spacing: v })} />
          <Switch label={t('Highlight focus & links')} checked={a11y.focus} onChange={(v) => setA11y({ focus: v })} />
          <button className="btn" onClick={reset}>{t('Reset')}</button>
        </div>
      )}
    </div>
  ), document.body);
}
