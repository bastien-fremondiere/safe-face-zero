import React, { useEffect, useRef, useState, useCallback } from 'react';

interface ImageLoupeProps {
  /** The container holding the image(s) where pointer events are captured */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Primary image element (e.g., Anonymized in slider mode, or single image in normal view) */
  targetImgRef: React.RefObject<HTMLImageElement | null>;
  /** Optional secondary image element (e.g., Original in Before/After slider mode) */
  secondaryImgRef?: React.RefObject<HTMLImageElement | null>;
  /** Optional slider position in percent (0 to 100) when used inside a Before/After split */
  sliderPosition?: number;
  /** Whether the loupe is active/enabled */
  enabled?: boolean;
  /** Whether the user is actively dragging the slider (loupe temporarily hidden) */
  isDragging?: boolean;
  /** Zoom factor (default 2.5x) */
  zoom?: number;
  /** Diameter of the circular loupe lens in pixels (default 160px) */
  size?: number;
}

export const ImageLoupe: React.FC<ImageLoupeProps> = ({
  containerRef,
  targetImgRef,
  secondaryImgRef,
  sliderPosition,
  enabled = true,
  isDragging = false,
  zoom = 2.5,
  size = 160,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [loupeState, setLoupeState] = useState<{
    visible: boolean;
    x: number;
    y: number;
    hoverSide?: 'before' | 'after' | 'split';
  }>({
    visible: false,
    x: 0,
    y: 0,
  });

  const renderLoupe = useCallback(
    (clientX: number, clientY: number) => {
      const container = containerRef.current;
      const targetImg = targetImgRef.current;
      const canvas = canvasRef.current;

      if (!container || !targetImg || !enabled || isDragging) {
        setLoupeState((prev) => (prev.visible ? { ...prev, visible: false } : prev));
        return;
      }

      // Check if image is loaded and rendered
      if (!targetImg.complete || targetImg.naturalWidth === 0) {
        setLoupeState((prev) => (prev.visible ? { ...prev, visible: false } : prev));
        return;
      }

      const imgRect = targetImg.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      // Check if cursor is strictly within the visible image rect (not black letterbox bars)
      if (
        clientX < imgRect.left ||
        clientX > imgRect.right ||
        clientY < imgRect.top ||
        clientY > imgRect.bottom
      ) {
        setLoupeState((prev) => (prev.visible ? { ...prev, visible: false } : prev));
        return;
      }

      const relImgX = clientX - imgRect.left;
      const relImgY = clientY - imgRect.top;
      const normX = relImgX / imgRect.width;
      const normY = relImgY / imgRect.height;

      // Position loupe adjacent to the cursor within container
      const cursorContainerX = clientX - containerRect.left;
      const cursorContainerY = clientY - containerRect.top;

      const OFFSET_X = 26;
      let loupeX = cursorContainerX + OFFSET_X;
      // If loupe would overflow the right side, flip to the left of the cursor
      if (loupeX + size > containerRect.width - 12) {
        loupeX = cursorContainerX - OFFSET_X - size;
      }

      let loupeY = cursorContainerY - size / 2;
      // Clamp Y inside container
      if (loupeY < 12) loupeY = 12;
      if (loupeY + size > containerRect.height - 12) {
        loupeY = Math.max(12, containerRect.height - 12 - size);
      }

      let side: 'before' | 'after' | 'split' = 'after';

      // Draw magnified content if canvas is ready
      if (canvas) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        if (canvas.width !== size * dpr || canvas.height !== size * dpr) {
          canvas.width = size * dpr;
          canvas.height = size * dpr;
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.save();
          ctx.scale(dpr, dpr);
          ctx.clearRect(0, 0, size, size);

          // Circular clip path
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
          ctx.clip();

          // Background fill
          ctx.fillStyle = '#090d16';
          ctx.fillRect(0, 0, size, size);

          const naturalW = targetImg.naturalWidth;
          const naturalH = targetImg.naturalHeight;

          // Calculate crop rectangle in natural image pixels
          const cropDispW = size / zoom;
          const cropDispH = size / zoom;
          const cropNatW = (cropDispW / imgRect.width) * naturalW;
          const cropNatH = (cropDispH / imgRect.height) * naturalH;
          const cropNatX = normX * naturalW - cropNatW / 2;
          const cropNatY = normY * naturalH - cropNatH / 2;

          // Safe clamped helper to draw without throwing IndexSizeError
          const drawSafe = (img: HTMLImageElement) => {
            const sx = Math.max(0, cropNatX);
            const sy = Math.max(0, cropNatY);
            const sRight = Math.min(naturalW, cropNatX + cropNatW);
            const sBottom = Math.min(naturalH, cropNatY + cropNatH);
            const sw = Math.max(0, sRight - sx);
            const sh = Math.max(0, sBottom - sy);

            const dx = (sx - cropNatX) * (size / cropNatW);
            const dy = (sy - cropNatY) * (size / cropNatH);
            const dw = sw * (size / cropNatW);
            const dh = sh * (size / cropNatH);

            if (sw > 0 && sh > 0 && dw > 0 && dh > 0) {
              ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
            }
          };

          // 1. Draw Target Image (Anonymized or single image)
          drawSafe(targetImg);

          // 2. If secondary image and slider position exist, draw the split view
          const secondaryImg = secondaryImgRef?.current;
          if (secondaryImg && secondaryImg.complete && sliderPosition !== undefined) {
            const dividerDispX = (sliderPosition / 100) * imgRect.width;
            // Position of divider line on loupe canvas
            const dividerCanvasX = (dividerDispX - relImgX) * zoom + size / 2;

            if (dividerCanvasX > 0) {
              // Draw Original (left side)
              ctx.save();
              ctx.beginPath();
              ctx.rect(0, 0, Math.min(dividerCanvasX, size), size);
              ctx.clip();

              drawSafe(secondaryImg);
              ctx.restore();

              if (dividerCanvasX < size) {
                side = 'split';
                // Draw vertical divider line
                ctx.beginPath();
                ctx.moveTo(dividerCanvasX, 0);
                ctx.lineTo(dividerCanvasX, size);
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#ffffff';
                ctx.shadowColor = 'rgba(59, 130, 246, 0.8)';
                ctx.shadowBlur = 4;
                ctx.stroke();
                ctx.shadowBlur = 0;
              } else {
                side = 'before';
              }
            } else {
              side = 'after';
            }
          }

          ctx.restore();
        }
      }

      setLoupeState({
        visible: true,
        x: loupeX,
        y: loupeY,
        hoverSide: side,
      });
    },
    [containerRef, targetImgRef, secondaryImgRef, sliderPosition, enabled, isDragging, zoom, size]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) {
      setLoupeState((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      return;
    }

    const handlePointerMove = (e: PointerEvent) => {
      if (isDragging) {
        setLoupeState((prev) => (prev.visible ? { ...prev, visible: false } : prev));
        return;
      }
      renderLoupe(e.clientX, e.clientY);
    };

    const handlePointerLeave = () => {
      setLoupeState((prev) => (prev.visible ? { ...prev, visible: false } : prev));
    };

    container.addEventListener('pointermove', handlePointerMove, { passive: true });
    container.addEventListener('pointerleave', handlePointerLeave, { passive: true });

    return () => {
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, [containerRef, enabled, isDragging, renderLoupe]);

  if (!enabled || isDragging) return null;

  return (
    <div
      className={`absolute pointer-events-none z-40 select-none transition-opacity duration-100 ${
        loupeState.visible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        left: `${loupeState.x}px`,
        top: `${loupeState.y}px`,
        width: `${size}px`,
        height: `${size}px`,
        visibility: loupeState.visible ? 'visible' : 'hidden',
      }}
    >
      <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-white/90 shadow-[0_12px_36px_rgba(0,0,0,0.85)] ring-4 ring-blue-500/40 bg-slate-950">
        <canvas
          ref={canvasRef}
          style={{ width: `${size}px`, height: `${size}px` }}
          className="w-full h-full block"
        />

        {/* Realistic glass lens sheen / reflection */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/5 to-white/20 pointer-events-none" />

        {/* Center crosshair dot for precise inspection */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full border border-white/80 bg-blue-500/50 shadow-sm" />
            <div className="absolute w-5 h-[1px] bg-white/40" />
            <div className="absolute h-5 w-[1px] bg-white/40" />
          </div>
        </div>

        {/* Magnification pill badge */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none flex items-center gap-1">
          <span className="rounded-full bg-slate-950/85 border border-slate-700/80 px-2 py-0.5 text-[10px] font-mono font-bold text-blue-300 shadow backdrop-blur-sm">
            {zoom}×
          </span>
          {loupeState.hoverSide && (
            <span
              className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold border shadow backdrop-blur-sm ${
                loupeState.hoverSide === 'before'
                  ? 'bg-amber-950/85 text-amber-300 border-amber-600/60'
                  : loupeState.hoverSide === 'after'
                  ? 'bg-blue-950/85 text-blue-300 border-blue-500/60'
                  : 'bg-indigo-950/85 text-indigo-300 border-indigo-500/60'
              }`}
            >
              {loupeState.hoverSide === 'before'
                ? 'Avant'
                : loupeState.hoverSide === 'after'
                ? 'Après'
                : 'Diff'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
