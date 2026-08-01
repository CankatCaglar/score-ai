"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { DashboardReturnTarget } from "@/lib/dashboard/return-navigation";

type DashboardBackContextValue = {
  override: DashboardReturnTarget | null;
  setOverride: (target: DashboardReturnTarget | null) => void;
};

const DashboardBackContext = createContext<DashboardBackContextValue | null>(
  null,
);

export function DashboardBackProvider({ children }: { children: ReactNode }) {
  const [override, setOverrideState] = useState<DashboardReturnTarget | null>(
    null,
  );
  const setOverride = useCallback((target: DashboardReturnTarget | null) => {
    setOverrideState(target);
  }, []);
  const value = useMemo(
    () => ({ override, setOverride }),
    [override, setOverride],
  );
  return (
    <DashboardBackContext.Provider value={value}>
      {children}
    </DashboardBackContext.Provider>
  );
}

export function useDashboardBackOverride() {
  return useContext(DashboardBackContext);
}

/** Let a page set the header back target while mounted (e.g. report → analysis detail). */
export function useRegisterDashboardBack(
  target: DashboardReturnTarget | null,
) {
  const ctx = useDashboardBackOverride();
  const setOverride = ctx?.setOverride;
  const href = target?.href ?? null;
  const label = target?.label ?? null;

  useEffect(() => {
    if (!setOverride) return;
    if (href && label) {
      setOverride({ href, label });
    } else {
      setOverride(null);
    }
    return () => setOverride(null);
  }, [setOverride, href, label]);
}
