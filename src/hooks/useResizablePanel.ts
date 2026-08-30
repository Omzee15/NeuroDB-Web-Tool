"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Options {
  /** localStorage key to persist the width under */
  storageKey: string;
  /** default width in px when nothing is stored */
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  /**
   * Which edge of the panel the handle sits on. "right" means dragging right
   * grows the panel (handle is on the panel's right side, e.g. a left sidebar).
   */
  side?: "right" | "left";
}

interface Result {
  width: number;
  /** props to spread onto the drag handle element */
  handleProps: {
    onMouseDown: (e: React.MouseEvent) => void;
    onDoubleClick: () => void;
    role: "separator";
    "aria-orientation": "vertical";
    tabIndex: 0;
    onKeyDown: (e: React.KeyboardEvent) => void;
  };
  dragging: boolean;
}

export function useResizablePanel({
  storageKey,
  defaultWidth,
  minWidth,
  maxWidth,
  side = "right",
}: Options): Result {
  const [width, setWidth] = useState(defaultWidth);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const startWidth = useRef(defaultWidth);

  // Load persisted width once on mount (client only).
  useEffect(() => {
    const stored = Number(localStorage.getItem(storageKey));
    if (stored && !Number.isNaN(stored)) {
      setWidth(clamp(stored, minWidth, maxWidth));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = useCallback(
    (w: number) => {
      localStorage.setItem(storageKey, String(Math.round(w)));
    },
    [storageKey]
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      startX.current = e.clientX;
      startWidth.current = width;
      setDragging(true);
    },
    [width]
  );

  useEffect(() => {
    if (!dragging) return;

    function onMove(e: MouseEvent) {
      const delta = e.clientX - startX.current;
      const next = clamp(
        startWidth.current + (side === "right" ? delta : -delta),
        minWidth,
        maxWidth
      );
      setWidth(next);
    }

    function onUp() {
      setDragging(false);
      setWidth((w) => {
        persist(w);
        return w;
      });
    }

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, minWidth, maxWidth, side, persist]);

  const onDoubleClick = useCallback(() => {
    setWidth(defaultWidth);
    persist(defaultWidth);
  }, [defaultWidth, persist]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const step = e.shiftKey ? 32 : 8;
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const dir = e.key === "ArrowRight" ? 1 : -1;
        setWidth((w) => {
          const next = clamp(
            w + (side === "right" ? dir * step : -dir * step),
            minWidth,
            maxWidth
          );
          persist(next);
          return next;
        });
      }
    },
    [minWidth, maxWidth, side, persist]
  );

  return {
    width,
    dragging,
    handleProps: {
      onMouseDown,
      onDoubleClick,
      role: "separator",
      "aria-orientation": "vertical",
      tabIndex: 0,
      onKeyDown,
    },
  };
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}
