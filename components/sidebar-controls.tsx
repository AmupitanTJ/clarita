"use client";

import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

const minimumSidebarWidth = 190;
const maximumSidebarWidth = 300;

type SidebarToggleProps = {
  collapsed: boolean;
  onToggle: () => void;
  controls: string;
};

export function SidebarToggle({ collapsed, onToggle, controls }: SidebarToggleProps) {
  return (
    <button
      type="button"
      className="sidebar-collapse-icon"
      onClick={onToggle}
      aria-label={collapsed ? "Expand navigation sidebar" : "Collapse navigation sidebar"}
      aria-controls={controls}
      aria-expanded={!collapsed}
      title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
    </button>
  );
}

type SidebarResizerProps = {
  width: number;
  onWidth: (width: number) => void;
};

export function SidebarResizer({ width, onWidth }: SidebarResizerProps) {
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => () => cleanupRef.current?.(), []);

  function beginResize(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = width;

    function finishResize() {
      window.removeEventListener("pointermove", resize);
      window.removeEventListener("pointerup", finishResize);
      window.removeEventListener("pointercancel", finishResize);
      document.body.classList.remove("is-resizing-sidebar");
      cleanupRef.current = null;
    }

    function resize(pointerEvent: PointerEvent) {
      const nextWidth = Math.min(maximumSidebarWidth, Math.max(minimumSidebarWidth, startWidth + pointerEvent.clientX - startX));
      onWidth(Math.round(nextWidth));
    }

    cleanupRef.current?.();
    cleanupRef.current = finishResize;
    document.body.classList.add("is-resizing-sidebar");
    window.addEventListener("pointermove", resize);
    window.addEventListener("pointerup", finishResize);
    window.addEventListener("pointercancel", finishResize);
  }

  function resizeWithKeyboard(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const adjustment = event.key === "ArrowLeft" ? -10 : 10;
    onWidth(Math.min(maximumSidebarWidth, Math.max(minimumSidebarWidth, width + adjustment)));
  }

  return (
    <div
      className="sidebar-resizer"
      role="separator"
      aria-label="Resize sidebar"
      aria-orientation="vertical"
      aria-valuemin={minimumSidebarWidth}
      aria-valuemax={maximumSidebarWidth}
      aria-valuenow={width}
      tabIndex={0}
      onPointerDown={beginResize}
      onKeyDown={resizeWithKeyboard}
      title="Drag to resize sidebar"
    />
  );
}
