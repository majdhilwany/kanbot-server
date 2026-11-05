import { useEffect, useRef, type ReactNode } from 'react';

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return (
    <dialog ref={ref} className="dialog" aria-label={title} onCancel={(e) => { e.preventDefault(); onClose(); }}>
      <h2>{title}</h2>
      {children}
    </dialog>
  );
}
