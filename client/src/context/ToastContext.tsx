import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
type Kind = 'ok' | 'err';
const Ctx = createContext<(m: string, k?: Kind) => void>(() => {});
export const useToast = () => useContext(Ctx);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [t, setT] = useState<{ m: string; k: Kind } | null>(null);
  const show = useCallback((m: string, k: Kind = 'ok') => { setT({ m, k }); setTimeout(() => setT(null), 3500); }, []);
  return <Ctx.Provider value={show}>{children}
    {t && <div role="status" className={`fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg px-4 py-2 text-sm text-white shadow-lg ${t.k === 'ok' ? 'bg-emerald-600' : 'bg-red-600'}`}>{t.m}</div>}</Ctx.Provider>;
}
