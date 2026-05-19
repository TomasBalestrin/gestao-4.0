"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

type PetState =
  | "greeting"
  | "tracking"
  | "happy"
  | "bored"
  | "sleeping"
  | "suspicious";

const HIDDEN_ROUTES = ["/crm/", "/agenda"];

export function PetCompanion() {
  const pathname = usePathname();
  const svgRef = useRef<SVGSVGElement>(null);
  const pupilsRef = useRef<SVGGElement>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sleepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const happyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [state, setState] = useState<PetState>("greeting");
  const [nodding, setNodding] = useState(false);

  const hidden = HIDDEN_ROUTES.some((r) => pathname.startsWith(r));

  useEffect(() => {
    if (hidden) return;
    const greetTimer = setTimeout(() => setState("tracking"), 2200);
    return () => clearTimeout(greetTimer);
  }, [hidden]);

  useEffect(() => {
    if (hidden) return;
    function resetIdle() {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (sleepTimer.current) clearTimeout(sleepTimer.current);
      if (state === "sleeping" || state === "bored") setState("tracking");
      idleTimer.current = setTimeout(() => setState("bored"), 1000);
      sleepTimer.current = setTimeout(() => setState("sleeping"), 3000);
    }

    // Throttle de mousemove via rAF: o navegador pode emitir o evento >120Hz
    // e o calculo de bounding rect + DOM write bloqueia main thread em hover.
    let rafId = 0;
    let pendingEvent: MouseEvent | null = null;

    function processMove(e: MouseEvent) {
      const svg = svgRef.current;
      const pupils = pupilsRef.current;
      if (!svg || !pupils) return;
      const rect = svg.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      const max = 4;
      const ratio = Math.min(1, max / Math.max(1, dist));
      const ox = dx * ratio * 0.05;
      const oy = dy * ratio * 0.05;
      pupils.style.transform = `translate(${ox}px, ${oy}px)`;
    }

    function onMove(e: MouseEvent) {
      resetIdle();
      if (state === "greeting" || state === "sleeping") return;
      pendingEvent = e;
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        const ev = pendingEvent;
        pendingEvent = null;
        if (ev) processMove(ev);
      });
    }

    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target?.closest("button, a, [role='button']")) return;
      setState("happy");
      setNodding(true);
      if (happyTimer.current) clearTimeout(happyTimer.current);
      happyTimer.current = setTimeout(() => {
        setNodding(false);
        setState("tracking");
      }, 800);
    }

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("click", onClick);
    resetIdle();

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("click", onClick);
      if (rafId) cancelAnimationFrame(rafId);
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (sleepTimer.current) clearTimeout(sleepTimer.current);
      if (happyTimer.current) clearTimeout(happyTimer.current);
    };
  }, [state, hidden]);

  if (hidden) return null;

  const sleeping = state === "sleeping";
  const bored = state === "bored";
  const happy = state === "happy" || state === "greeting";

  return (
    <div
      aria-hidden
      className="fixed bottom-5 right-5 z-[600] pointer-events-none select-none opacity-80 hover:opacity-100 transition-opacity"
    >
      <svg
        ref={svgRef}
        viewBox="0 0 64 52"
        width="56"
        height="46"
        className={cn("block", nodding && "animate-pet-nod")}
      >
        <ellipse
          cx="32"
          cy="32"
          rx="28"
          ry="20"
          fill="var(--surface-elevated)"
          stroke="var(--border-strong)"
          strokeWidth="0.5"
        />
        <circle cx="20" cy="24" r="6" fill="var(--accent)" />
        <circle cx="44" cy="24" r="6" fill="var(--accent)" />
        <g ref={pupilsRef} style={{ transform: "translate(0,0)", willChange: "transform" }}>
          <circle cx="20" cy="24" r="2.4" fill="#fff" />
          <circle cx="44" cy="24" r="2.4" fill="#fff" />
        </g>
        {(sleeping || bored) && (
          <>
            <rect x="14" y="20" width="12" height={sleeping ? "8" : "4"} fill="var(--surface-elevated)" />
            <rect x="38" y="20" width="12" height={sleeping ? "8" : "4"} fill="var(--surface-elevated)" />
          </>
        )}
        <path
          d={
            happy
              ? "M22 38 Q32 44 42 38"
              : bored
                ? "M24 40 L40 40"
                : "M24 39 Q32 42 40 39"
          }
          stroke="var(--accent)"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
        {sleeping && (
          <text
            x="48"
            y="14"
            fontSize="10"
            fontFamily="var(--font-geist-mono), monospace"
            fill="var(--text-muted)"
            style={{
              animation: "zzz-float 2.4s ease infinite",
            }}
          >
            z
          </text>
        )}
      </svg>
    </div>
  );
}
