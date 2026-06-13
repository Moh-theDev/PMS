import * as React from 'react';

interface ResizableDividerProps {
  /** Ref forwarded to the details panel element so we can write style.width directly */
  panelRef: React.RefObject<HTMLElement | null>;
  /** Min/max width constraints in px */
  minWidth?: number;
  maxWidth?: number;
  /** Called once when drag ends with the final width */
  onResizeEnd?: (width: number) => void;
}

/**
 * A smooth, 60fps resizable divider using Pointer Capture.
 *
 * During drag we write panel.style.width directly (DOM mutation, no React re-render).
 * Only on pointerUp do we call onResizeEnd so the parent can sync its state once.
 */
export function ResizableDivider({
  panelRef,
  minWidth = 320,
  maxWidth = 750,
  onResizeEnd,
}: ResizableDividerProps) {
  const isDragging = React.useRef(false);
  const startX = React.useRef(0);
  const startWidth = React.useRef(0);

  const handlePointerDown = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!panelRef.current) return;
      e.preventDefault();

      isDragging.current = true;
      startX.current = e.clientX;
      startWidth.current = panelRef.current.offsetWidth;

      // Capture pointer so we keep receiving events even outside the element
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    },
    [panelRef]
  );

  const handlePointerMove = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging.current || !panelRef.current) return;
      e.preventDefault();

      const delta = e.clientX - startX.current;
      // Panel is on the right side → dragging left (negative delta) makes it wider
      const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth.current - delta));

      // Direct DOM write — bypasses React render pipeline → silky smooth
      panelRef.current.style.width = `${newWidth}px`;
    },
    [panelRef, minWidth, maxWidth]
  );

  const handlePointerUp = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging.current || !panelRef.current) return;
      isDragging.current = false;

      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);

      // Sync final width back to React state once
      const finalWidth = panelRef.current.offsetWidth;
      onResizeEnd?.(finalWidth);
    },
    [panelRef, onResizeEnd]
  );

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="w-1.5 shrink-0 self-stretch cursor-col-resize bg-muted/80 hover:bg-blue-400 active:bg-blue-500 transition-colors duration-150 select-none z-10"
      style={{ willChange: 'width', touchAction: 'none' }}
    />
  );
}
