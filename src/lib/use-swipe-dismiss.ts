"use client";

import { useEffect } from "react";

/**
 * ปัดแผ่น (sheet) เพื่อปิด แบบ iOS:
 * - เกาะนิ้ว 1:1 หลังขยับเกิน 10px (กันชนกับการแตะ/เลื่อน)
 * - ลากสวนทาง = ต้านแบบยางยืด ไม่หยุดแข็ง
 * - ปล่อยนิ้ว: คาดจุดหยุดจากความเร็ว (momentum projection) แล้วตัดสินว่าปิดหรือเด้งกลับ
 * - ปิด = เคลื่อนต่อด้วยความเร็วเดิมของนิ้ว ไม่มีรอยต่อ
 */
type Axis = "down" | "left";

const HYSTERESIS = 10;
const project = (v: number, rate = 0.998) => ((v / 1000) * rate) / (1 - rate);
const rubberband = (over: number, dim: number, c = 0.55) => (over * dim * c) / (dim + c * Math.abs(over));
const SPRING_BACK = "transform 500ms var(--spring-sheet, cubic-bezier(0.32, 0.72, 0, 1))";

function isTyping(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || el.closest("input, textarea, select, [data-no-swipe]") !== null;
}

/** กล่องที่เลื่อน (scroll) ได้และยังไม่อยู่บนสุด — ให้มันเลื่อนตามปกติก่อน */
function scrolledAway(target: EventTarget | null, root: HTMLElement) {
  let el = target instanceof HTMLElement ? target : null;
  while (el && el !== root.parentElement) {
    if (el.scrollTop > 0 && el.scrollHeight > el.clientHeight) return true;
    if (el === root) break;
    el = el.parentElement;
  }
  return false;
}

/** el: ตัวแผ่น (ส่งผ่าน state จาก callback ref เพื่อให้ผูกใหม่ทุกครั้งที่เปิด) */
export function useSwipeDismiss(el: HTMLElement | null, opts: { axis: Axis; enabled?: boolean; mediaQuery?: string }) {
  const { axis, enabled = true, mediaQuery = "(max-width: 639.98px)" } = opts;

  useEffect(() => {
    if (!el || !enabled || !window.matchMedia(mediaQuery).matches) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const overlay = el.previousElementSibling instanceof HTMLElement && el.previousElementSibling.classList.contains("ck-overlay") ? el.previousElementSibling : null;

    let start: { x: number; y: number } | null = null;
    let claimed = false;
    let offset = 0;
    let history: { t: number; p: number }[] = [];

    const size = () => (axis === "down" ? el.offsetHeight : el.offsetWidth);
    const apply = (px: number) => {
      el.style.transform = axis === "down" ? `translateY(${px}px)` : `translateX(${px}px)`;
      if (overlay) overlay.style.opacity = String(Math.max(0.15, 1 - Math.max(0, axis === "down" ? px : -px) / size()));
    };
    const reset = () => {
      start = null;
      claimed = false;
      history = [];
      delete el.dataset.dragging;
    };

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || isTyping(e.target)) return;
      if (axis === "down" && scrolledAway(e.target, el)) return;
      const t = e.touches[0];
      start = { x: t.clientX, y: t.clientY };
      claimed = false;
    };

    const onMove = (e: TouchEvent) => {
      if (!start) return;
      const t = e.touches[0];
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      if (!claimed) {
        const primary = axis === "down" ? dy : -dx;
        const cross = axis === "down" ? dx : dy;
        if (Math.abs(primary) < HYSTERESIS && Math.abs(cross) < HYSTERESIS) return;
        // ทิศต้องตรงแกนและเป็นทางปิด — ไม่งั้นปล่อยให้เลื่อน/แตะตามปกติ
        if (primary <= 0 || Math.abs(cross) > Math.abs(primary)) {
          start = null;
          return;
        }
        claimed = true;
        el.dataset.dragging = "";
        el.style.transition = "none";
        if (overlay) overlay.style.transition = "none";
      }
      e.preventDefault(); // หยุดการเลื่อนหน้า ขณะลากแผ่น
      const raw = axis === "down" ? dy - HYSTERESIS : dx + HYSTERESIS;
      const closing = axis === "down" ? raw > 0 : raw < 0;
      offset = closing ? raw : rubberband(raw, size());
      apply(offset);
      const now = performance.now();
      history.push({ t: now, p: axis === "down" ? t.clientY : -t.clientX });
      history = history.filter((h) => now - h.t < 100);
    };

    const onEnd = () => {
      if (!start || !claimed) return reset();
      // นิ้วหยุดนิ่งก่อนปล่อย = ความเร็ว 0 (ใช้เฉพาะการเคลื่อนไหวใน 100ms สุดท้าย)
      const now = performance.now();
      const recent = history.filter((h) => now - h.t < 100);
      const first = recent[0];
      const last = recent[recent.length - 1];
      const v = first && last && last.t > first.t ? ((last.p - first.p) / (last.t - first.t)) * 1000 : 0; // px/s ไปทางปิด
      const distance = axis === "down" ? offset : -offset;
      const projected = distance + project(v);
      const dim = size();
      reset();

      if (projected > dim * 0.5 && distance > 0) {
        // ปิด: ไหลต่อด้วยความเร็วนิ้ว แล้วค่อยสั่งปิดจริง
        const remaining = dim - distance;
        const ms = reduced ? 0 : Math.min(320, Math.max(140, (remaining / Math.max(v, 1)) * 1000));
        el.style.transition = `transform ${ms}ms cubic-bezier(0.2, 0.6, 0.4, 1)`;
        if (overlay) overlay.style.transition = `opacity ${ms}ms linear`;
        apply(axis === "down" ? dim : -dim);
        window.setTimeout(() => {
          document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        }, ms);
      } else {
        // เด้งกลับด้วยสปริง จากตำแหน่งปัจจุบัน
        el.style.transition = reduced ? "none" : SPRING_BACK;
        if (overlay) overlay.style.transition = "opacity 300ms ease";
        apply(0);
        const clear = () => {
          el.style.transform = "";
          el.style.transition = "";
          if (overlay) {
            overlay.style.opacity = "";
            overlay.style.transition = "";
          }
        };
        if (reduced) clear();
        else window.setTimeout(clear, 520); // หลังสปริงนิ่ง (ไม่พึ่ง transitionend ที่ลูกปุ่มอาจส่งมาก่อน)
      }
      offset = 0;
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [el, axis, enabled, mediaQuery]);
}
