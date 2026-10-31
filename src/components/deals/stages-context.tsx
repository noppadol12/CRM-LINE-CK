"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_STAGES, type Stage } from "@/lib/deal-stages";

const StagesContext = createContext<Stage[]>(DEFAULT_STAGES);

export function StagesProvider({ stages, children }: { stages: Stage[]; children: ReactNode }) {
  return <StagesContext.Provider value={stages}>{children}</StagesContext.Provider>;
}

/** ขั้นของดีลทั้งหมด (เรียงแล้ว) */
export function useStages() {
  return useContext(StagesContext);
}
