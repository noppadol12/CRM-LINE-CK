"use client";

import { useSyncExternalStore } from "react";

export type ThemePref = "light" | "dark" | "system";
import { THEME_KEY } from "./theme-script";

export { THEME_KEY };
const EVENT = "ck-theme-change";

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

const media = () => window.matchMedia("(prefers-color-scheme: dark)");

export function applyTheme(pref: ThemePref = readPref()) {
  const dark = pref === "dark" || (pref === "system" && media().matches);
  document.documentElement.classList.toggle("dark", dark);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#16181d" : "#00a24f");
}

export function setThemePref(pref: ThemePref) {
  try {
    if (pref === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, pref);
  } catch {}
  applyTheme(pref);
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  const onSystem = () => {
    applyTheme();
    cb();
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_KEY) onSystem(); // เปลี่ยนจากอีกแท็บ
  };
  const mq = media();
  mq.addEventListener("change", onSystem);
  window.addEventListener("storage", onStorage);
  window.addEventListener(EVENT, cb);
  return () => {
    mq.removeEventListener("change", onSystem);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(EVENT, cb);
  };
}

/** ค่าที่ผู้ใช้เลือก + ธีมที่ใช้อยู่จริง */
export function useTheme() {
  const pref = useSyncExternalStore(subscribe, readPref, () => "system" as ThemePref);
  const resolved = useSyncExternalStore(
    subscribe,
    (): "light" | "dark" => (document.documentElement.classList.contains("dark") ? "dark" : "light"),
    () => "light" as const,
  );
  return { pref, resolved, setPref: setThemePref };
}
