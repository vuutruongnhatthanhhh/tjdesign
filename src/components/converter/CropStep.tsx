"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Crop, PenLine, RotateCcw, Check, Loader2 } from "lucide-react";
import type { CropTool, DrawingPage, RectCrop } from "./types";
import { cropFreehandToDataUrl, cropRectToDataUrl } from "./imageUtils";

interface Props {
  page: DrawingPage;
  onCropped: (result: { url: string; width: number; height: number }) => void;
  onResetToOriginal: () => void;
}

type Handle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

interface ImgRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

const MIN_SIZE_PCT = 4;
const DEFAULT_RECT: RectCrop = { x: 5, y: 5, w: 90, h: 90 };

export default function CropStep({ page, onCropped, onResetToOriginal }: Props) {
  const [tool, setTool] = useState<CropTool>("rect");
  const [rect, setRect] = useState<RectCrop>(DEFAULT_RECT);
  const [freehandPoints, setFreehandPoints] = useState<{ x: number; y: number }[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [imgRect, setImgRect] = useState<ImgRect | null>(null);
  const [isCropping, setIsCropping] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{
    mode: "move" | "resize" | null;
    handle: Handle | null;
    startX: number;
    startY: number;
    startRect: RectCrop;
  }>({ mode: null, handle: null, startX: 0, startY: 0, startRect: DEFAULT_RECT });

  useEffect(() => {
    setRect(DEFAULT_RECT);
    setFreehandPoints([]);
    setTool("rect");
  }, [page.id]);

  const measure = useCallback(() => {
    if (!imgRef.current || !stageRef.current) return;
    const imgBox = imgRef.current.getBoundingClientRect();
    const stageBox = stageRef.current.getBoundingClientRect();
    setImgRect({
      left: imgBox.left - stageBox.left,
      top: imgBox.top - stageBox.top,
      width: imgBox.width,
      height: imgBox.height,
    });
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure, page.workingUrl]);

  const clientToPct = useCallback(
    (clientX: number, clientY: number) => {
      if (!imgRect || !stageRef.current) return { x: 0, y: 0 };
      const stageBox = stageRef.current.getBoundingClientRect();
      const localX = clientX - stageBox.left - imgRect.left;
      const localY = clientY - stageBox.top - imgRect.top;
      return {
        x: Math.min(100, Math.max(0, (localX / imgRect.width) * 100)),
        y: Math.min(100, Math.max(0, (localY / imgRect.height) * 100)),
      };
    },
    [imgRect]
  );

  const onHandlePointerDown = (handle: Handle | null) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      mode: handle ? "resize" : "move",
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startRect: rect,
    };
    window.addEventListener("pointermove", onWindowPointerMove);
    window.addEventListener("pointerup", onWindowPointerUp);
  };

  const onWindowPointerMove = useCallback(
    (e: PointerEvent) => {
      const dr = dragRef.current;
      if (!dr.mode || !imgRect) return;
      const dxPct = ((e.clientX - dr.startX) / imgRect.width) * 100;
      const dyPct = ((e.clientY - dr.startY) / imgRect.height) * 100;
      const sr = dr.startRect;

      if (dr.mode === "move") {
        const x = Math.min(100 - sr.w, Math.max(0, sr.x + dxPct));
        const y = Math.min(100 - sr.h, Math.max(0, sr.y + dyPct));
        setRect({ ...sr, x, y });
        return;
      }

      let { x, y, w, h } = sr;
      const h0 = dr.handle!;
      if (h0.includes("e")) w = Math.max(MIN_SIZE_PCT, Math.min(100 - sr.x, sr.w + dxPct));
      if (h0.includes("s")) h = Math.max(MIN_SIZE_PCT, Math.min(100 - sr.y, sr.h + dyPct));
      if (h0.includes("w")) {
        const newX = Math.min(sr.x + sr.w - MIN_SIZE_PCT, Math.max(0, sr.x + dxPct));
        w = sr.w + (sr.x - newX);
        x = newX;
      }
      if (h0.includes("n")) {
        const newY = Math.min(sr.y + sr.h - MIN_SIZE_PCT, Math.max(0, sr.y + dyPct));
        h = sr.h + (sr.y - newY);
        y = newY;
      }
      setRect({ x, y, w, h });
    },
    [imgRect]
  );

  const onWindowPointerUp = useCallback(() => {
    dragRef.current.mode = null;
    window.removeEventListener("pointermove", onWindowPointerMove);
    window.removeEventListener("pointerup", onWindowPointerUp);
  }, [onWindowPointerMove]);

  const onFreehandPointerDown = (e: React.PointerEvent) => {
    if (tool !== "freehand") return;
    e.preventDefault();
    const p = clientToPct(e.clientX, e.clientY);
    setFreehandPoints([p]);
    setIsDrawing(true);
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const onFreehandPointerMove = (e: React.PointerEvent) => {
    if (!isDrawing || tool !== "freehand") return;
    const p = clientToPct(e.clientX, e.clientY);
    setFreehandPoints((prev) => [...prev, p]);
  };

  const onFreehandPointerUp = () => {
    setIsDrawing(false);
  };

  const handleConfirmCrop = async () => {
    setIsCropping(true);
    try {
      if (tool === "rect") {
        const result = await cropRectToDataUrl(page.workingUrl, rect);
        onCropped(result);
      } else if (freehandPoints.length >= 3) {
        const result = await cropFreehandToDataUrl(page.workingUrl, freehandPoints);
        onCropped(result);
      }
      setFreehandPoints([]);
      setRect(DEFAULT_RECT);
    } finally {
      setIsCropping(false);
    }
  };

  const handleResetOriginal = () => {
    onResetToOriginal();
    setRect(DEFAULT_RECT);
    setFreehandPoints([]);
  };

  const handlePts = (["nw", "n", "ne", "e", "se", "s", "sw", "w"] as Handle[]).map((h) => {
    const pos: Record<Handle, { left: string; top: string; cursor: string }> = {
      nw: { left: "0%", top: "0%", cursor: "nwse-resize" },
      n: { left: "50%", top: "0%", cursor: "ns-resize" },
      ne: { left: "100%", top: "0%", cursor: "nesw-resize" },
      e: { left: "100%", top: "50%", cursor: "ew-resize" },
      se: { left: "100%", top: "100%", cursor: "nwse-resize" },
      s: { left: "50%", top: "100%", cursor: "ns-resize" },
      sw: { left: "0%", top: "100%", cursor: "nesw-resize" },
      w: { left: "0%", top: "50%", cursor: "ew-resize" },
    };
    return { handle: h, ...pos[h] };
  });

  const freehandPath =
    freehandPoints.length > 0
      ? `M ${freehandPoints.map((p) => `${p.x} ${p.y}`).join(" L ")}${
          !isDrawing ? " Z" : ""
        }`
      : "";

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-white/8 bg-surface">
        <span className="text-sm font-semibold text-white mr-2">Bước 1 · Crop khung</span>

        <div className="flex rounded-lg overflow-hidden border border-white/10">
          <button
            onClick={() => setTool("rect")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
              tool === "rect" ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white" : "text-zinc-300 hover:bg-white/8"
            }`}
          >
            <Crop size={14} />
            Hộp chữ nhật
          </button>
          <button
            onClick={() => setTool("freehand")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
              tool === "freehand" ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white" : "text-zinc-300 hover:bg-white/8"
            }`}
          >
            <PenLine size={14} />
            Vẽ tay tự do (Lasso)
          </button>
        </div>

        {tool === "freehand" && freehandPoints.length > 1 && (
          <button
            onClick={() => setFreehandPoints([])}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:bg-white/8 border border-white/10"
          >
            <RotateCcw size={14} />
            Vẽ lại
          </button>
        )}

        <button
          onClick={handleResetOriginal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:bg-white/8 border border-white/10"
        >
          <RotateCcw size={14} />
          Khôi phục ảnh gốc
        </button>

        <div className="ml-auto">
          <button
            onClick={handleConfirmCrop}
            disabled={
              isCropping || (tool === "rect" ? false : freehandPoints.length < 3)
            }
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all shadow-[0_4px_12px_-4px_rgba(99,102,241,0.6)]"
          >
            {isCropping ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Xác nhận & Cắt bản vẽ
          </button>
        </div>
      </div>

      <div
        ref={stageRef}
        className="relative flex-1 flex items-center justify-center overflow-hidden bg-surface-2 bg-grid p-6"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={page.workingUrl}
          alt={page.name}
          onLoad={measure}
          className="max-w-full max-h-full w-auto h-auto select-none bg-white shadow-2xl rounded-sm"
          draggable={false}
        />

        {imgRect && (
          <div
            className="absolute"
            style={{
              left: imgRect.left,
              top: imgRect.top,
              width: imgRect.width,
              height: imgRect.height,
            }}
          >
            {tool === "rect" ? (
              <>
                <div
                  className="absolute pointer-events-none bg-black/50"
                  style={{ left: 0, top: 0, width: "100%", height: `${rect.y}%` }}
                />
                <div
                  className="absolute pointer-events-none bg-black/50"
                  style={{
                    left: 0,
                    top: `${rect.y + rect.h}%`,
                    width: "100%",
                    height: `${Math.max(0, 100 - rect.y - rect.h)}%`,
                  }}
                />
                <div
                  className="absolute pointer-events-none bg-black/50"
                  style={{
                    left: 0,
                    top: `${rect.y}%`,
                    width: `${rect.x}%`,
                    height: `${rect.h}%`,
                  }}
                />
                <div
                  className="absolute pointer-events-none bg-black/50"
                  style={{
                    left: `${rect.x + rect.w}%`,
                    top: `${rect.y}%`,
                    width: `${Math.max(0, 100 - rect.x - rect.w)}%`,
                    height: `${rect.h}%`,
                  }}
                />
                <div
                  onPointerDown={onHandlePointerDown(null)}
                  className="absolute border-2 border-indigo-400 cursor-move"
                  style={{
                    left: `${rect.x}%`,
                    top: `${rect.y}%`,
                    width: `${rect.w}%`,
                    height: `${rect.h}%`,
                  }}
                >
                  <span className="absolute -top-6 left-0 bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap">
                    {Math.round((rect.w / 100) * page.width)} x{" "}
                    {Math.round((rect.h / 100) * page.height)} px
                  </span>
                  {handlePts.map((h) => (
                    <div
                      key={h.handle}
                      onPointerDown={onHandlePointerDown(h.handle)}
                      className="absolute w-3 h-3 bg-white border-2 border-indigo-500 rounded-sm"
                      style={{
                        left: h.left,
                        top: h.top,
                        transform: "translate(-50%, -50%)",
                        cursor: h.cursor,
                      }}
                    />
                  ))}
                </div>
              </>
            ) : (
              <svg
                className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                onPointerDown={onFreehandPointerDown}
                onPointerMove={onFreehandPointerMove}
                onPointerUp={onFreehandPointerUp}
              >
                {freehandPath && (
                  <path
                    d={freehandPath}
                    fill="rgba(99,102,241,0.25)"
                    stroke="#818cf8"
                    strokeWidth={0.4}
                    vectorEffect="non-scaling-stroke"
                    strokeDasharray="1.5,1"
                  />
                )}
              </svg>
            )}
          </div>
        )}
      </div>

      <div className="px-4 py-2 border-t border-white/8 bg-surface text-[11px] text-zinc-400">
        Kích thước gốc: {page.width} x {page.height} px
        {tool === "rect"
          ? " · Kéo 8 góc/cạnh để chỉnh vùng crop, kéo giữa khung để di chuyển"
          : " · Giữ chuột và vẽ quanh vùng cần giữ lại, nhả chuột để khép kín"}
      </div>
    </div>
  );
}
