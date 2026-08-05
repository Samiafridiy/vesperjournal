import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

const KEY = "vesper.demo-mode";

type DemoCtx = { demo: boolean; setDemo: (v: boolean) => void };

const Ctx = createContext<DemoCtx>({ demo: false, setDemo: () => {} });

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [demo, setDemoState] = useState(false);

  // Read after hydration to avoid SSR mismatch.
  useEffect(() => {
    try {
      setDemoState(window.localStorage.getItem(KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  const setDemo = useCallback((v: boolean) => {
    setDemoState(v);
    try {
      if (v) window.localStorage.setItem(KEY, "1");
      else window.localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }, []);

  return <Ctx.Provider value={{ demo, setDemo }}>{children}</Ctx.Provider>;
}

export const useDemoMode = () => useContext(Ctx);
