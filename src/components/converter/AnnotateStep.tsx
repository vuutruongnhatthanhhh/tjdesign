"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MousePointer2,
  Type,
  Minus,
  ArrowUpRight,
  Square,
  Circle,
  Pencil,
  Eraser,
  Trash2,
  Loader2,
  Check,
} from "lucide-react";
import type { Annotation, AnnotationTool, DrawingPage } from "./types";
import { bakeAnnotationsToDataUrl, genAnnId } from "./annotationUtils";

interface Props {
  page: DrawingPage;
  onAnnotationsChange: (annotations: Annotation[]) => void;
  onBake: (bakedUrl: string) => void;
}

const COLORS = ["#ef4444", "#000000", "#4f46e5", "#16a34a", "#f59e0b", "#ffffff"];
const STROKE_OPTIONS = [
  { label: "Mỏng", value: 0.3 },
  { label: "Vừa", value: 0.6 },
  { label: "Đậm", value: 1.2 },
];

const TOOLS: { id: AnnotationTool; icon: React.ReactNode; label: string }[] = [
  { id: "select", icon: <MousePointer2 size={16} />, label: "Chọn / Di chuyển" },
  { id: "text", icon: <Type size={16} />, label: "Chèn chữ" },
  { id: "line", icon: <Minus size={16} />, label: "Đường thẳng" },
  { id: "arrow", icon: <ArrowUpRight size={16} />, label: "Mũi tên" },
  { id: "rect", icon: <Square size={16} />, label: "Hình chữ nhật" },
  { id: "circle", icon: <Circle size={16} />, label: "Hình tròn" },
  { id: "pencil", icon: <Pencil size={16} />, label: "Vẽ tay" },
  { id: "eraser", icon: <Eraser size={16} />, label: "Tẩy (kéo để tô trắng · bấm vào 1 nét để xoá hẳn)" },
];

const ERASER_WIDTH_MULTIPLIER = 7;

interface ImgRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export default function AnnotateStep({ page, onAnnotationsChange, onBake }: Props) {
  const [annotations, setAnnotations] = useState<Annotation[]>(page.annotations);
  const [tool, setTool] = useState<AnnotationTool>("select");
  const [color, setColor] = useState("#ef4444");
  const [strokeWidth, setStrokeWidth] = useState(0.6);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [imgRect, setImgRect] = useState<ImgRect | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const draftRef = useRef<Annotation | null>(null);
  const [draft, setDraft] = useState<Annotation | null>(null);
  const dragRef = useRef<{ id: string; startX: number; startY: number; original: Annotation } | null>(null);

  useEffect(() => {
    setAnnotations(page.annotations);
    setSelectedId(null);
  }, [page.id]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const update = (next: Annotation[]) => {
    setAnnotations(next);
    onAnnotationsChange(next);
  };

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

  const px = (pctX: number) => (imgRect ? (pctX / 100) * imgRect.width : 0);
  const py = (pctY: number) => (imgRect ? (pctY / 100) * imgRect.height : 0);
  const strokePx = (sw: number) => (imgRect ? (sw / 100) * Math.min(imgRect.width, imgRect.height) : sw);

  const annotationsRef = useRef(annotations);
  annotationsRef.current = annotations;

  const onStagePointerDown = (e: React.PointerEvent) => {
    if (!imgRect) return;
    const p = clientToPct(e.clientX, e.clientY);

    if (tool === "text") {
      const id = genAnnId();
      const ann: Annotation = { id, type: "text", x: p.x, y: p.y, text: "", color, strokeWidth, fontSize: 4 };
      update([...annotations, ann]);
      setEditingTextId(id);
      setSelectedId(id);
      return;
    }

    if (tool === "select") return;

    let ann: Annotation;
    if (tool === "line" || tool === "arrow") {
      ann = { id: genAnnId(), type: tool, x1: p.x, y1: p.y, x2: p.x, y2: p.y, color, strokeWidth };
    } else if (tool === "rect") {
      ann = { id: genAnnId(), type: "rect", x: p.x, y: p.y, w: 0, h: 0, color, strokeWidth };
    } else if (tool === "circle") {
      ann = { id: genAnnId(), type: "circle", cx: p.x, cy: p.y, rx: 0, ry: 0, color, strokeWidth };
    } else if (tool === "eraser") {
      ann = {
        id: genAnnId(),
        type: "pencil",
        points: [p],
        color: "#ffffff",
        strokeWidth: strokeWidth * ERASER_WIDTH_MULTIPLIER,
      };
    } else {
      ann = { id: genAnnId(), type: "pencil", points: [p], color, strokeWidth };
    }
    draftRef.current = ann;
    setDraft(ann);
    window.addEventListener("pointermove", onDraftPointerMove);
    window.addEventListener("pointerup", onDraftPointerUp);
  };

  const onDraftPointerMove = useCallback(
    (e: PointerEvent) => {
      const current = draftRef.current;
      if (!current) return;
      const p = clientToPct(e.clientX, e.clientY);
      let next: Annotation;
      if (current.type === "line" || current.type === "arrow") {
        next = { ...current, x2: p.x, y2: p.y };
      } else if (current.type === "rect") {
        next = { ...current, w: p.x - current.x, h: p.y - current.y };
      } else if (current.type === "circle") {
        next = { ...current, rx: Math.abs(p.x - current.cx), ry: Math.abs(p.y - current.cy) };
      } else if (current.type === "pencil") {
        next = { ...current, points: [...current.points, p] };
      } else {
        return;
      }
      draftRef.current = next;
      setDraft(next);
    },
    [clientToPct]
  );

  const onDraftPointerUp = useCallback(() => {
    window.removeEventListener("pointermove", onDraftPointerMove);
    window.removeEventListener("pointerup", onDraftPointerUp);
    const current = draftRef.current;
    draftRef.current = null;
    setDraft(null);
    if (!current) return;

    let valid = false;
    if (current.type === "line" || current.type === "arrow") {
      valid = Math.hypot(current.x2 - current.x1, current.y2 - current.y1) > 1;
    } else if (current.type === "rect") {
      valid = Math.abs(current.w) > 0.5 && Math.abs(current.h) > 0.5;
    } else if (current.type === "circle") {
      valid = current.rx > 0.5 && current.ry > 0.5;
    } else if (current.type === "pencil") {
      valid = current.points.length > 2;
    }

    if (valid) {
      const normalized =
        current.type === "rect"
          ? {
              ...current,
              x: current.w < 0 ? current.x + current.w : current.x,
              y: current.h < 0 ? current.y + current.h : current.y,
              w: Math.abs(current.w),
              h: Math.abs(current.h),
            }
          : current;
      update([...annotationsRef.current, normalized]);
    }
  }, [onDraftPointerMove]); // eslint-disable-line react-hooks/exhaustive-deps

  const onShapeClick = (ann: Annotation, e: React.PointerEvent | React.MouseEvent) => {
    e.stopPropagation();
    if (tool === "eraser") {
      update(annotations.filter((a) => a.id !== ann.id));
      return;
    }
    if (tool === "select") {
      setSelectedId(ann.id);
    }
  };

  const onShapePointerDown = (ann: Annotation, e: React.PointerEvent) => {
    if (tool !== "select") return;
    e.stopPropagation();
    setSelectedId(ann.id);
    dragRef.current = { id: ann.id, startX: e.clientX, startY: e.clientY, original: ann };
    window.addEventListener("pointermove", onDragMove);
    window.addEventListener("pointerup", onDragUp);
  };

  const onDragMove = useCallback(
    (e: PointerEvent) => {
      const dr = dragRef.current;
      if (!dr || !imgRect) return;
      const dxPct = ((e.clientX - dr.startX) / imgRect.width) * 100;
      const dyPct = ((e.clientY - dr.startY) / imgRect.height) * 100;
      const o = dr.original;
      let moved: Annotation;
      switch (o.type) {
        case "text":
          moved = { ...o, x: o.x + dxPct, y: o.y + dyPct };
          break;
        case "rect":
          moved = { ...o, x: o.x + dxPct, y: o.y + dyPct };
          break;
        case "circle":
          moved = { ...o, cx: o.cx + dxPct, cy: o.cy + dyPct };
          break;
        case "line":
        case "arrow":
          moved = { ...o, x1: o.x1 + dxPct, y1: o.y1 + dyPct, x2: o.x2 + dxPct, y2: o.y2 + dyPct };
          break;
        case "pencil":
          moved = { ...o, points: o.points.map((p) => ({ x: p.x + dxPct, y: p.y + dyPct })) };
          break;
      }

      update(annotationsRef.current.map((a) => (a.id === dr.id ? moved : a)));
    },
    [imgRect] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const onDragUp = useCallback(() => {
    dragRef.current = null;
    window.removeEventListener("pointermove", onDragMove);
    window.removeEventListener("pointerup", onDragUp);
  }, [onDragMove]);

  const deleteSelected = () => {
    if (!selectedId) return;
    update(annotations.filter((a) => a.id !== selectedId));
    setSelectedId(null);
  };

  const clearAll = () => {
    update([]);
    setSelectedId(null);
  };

  const commitTextEdit = (id: string, text: string) => {
    if (!text.trim()) {
      update(annotations.filter((a) => a.id !== id));
    } else {
      update(annotations.map((a) => (a.id === id && a.type === "text" ? { ...a, text } : a)));
    }
    setEditingTextId(null);
  };

  const handleSave = async () => {
    if (!annotations.length) return;
    setIsSaving(true);
    try {
      const bakedUrl = await bakeAnnotationsToDataUrl(page.workingUrl, annotations);
      onBake(bakedUrl);
      update([]);
      setSelectedId(null);
    } finally {
      setIsSaving(false);
    }
  };

  const renderShape = (ann: Annotation, isDraft = false) => {
    const isSelected = selectedId === ann.id;
    const common = {
      onPointerDown: isDraft ? undefined : (e: React.PointerEvent) => onShapePointerDown(ann, e),
      onClick: isDraft ? undefined : (e: React.MouseEvent) => onShapeClick(ann, e),
      style: {
        cursor: tool === "select" ? "move" : tool === "eraser" ? "pointer" : "default",
        pointerEvents: "all" as const,
      },
    };
    const strokeDash = isSelected ? "4,3" : undefined;

    if (ann.type === "text") {
      const fontPx = (ann.fontSize / 100) * (imgRect?.height ?? 0);
      if (editingTextId === ann.id) return null;
      return (
        <text
          key={ann.id}
          {...common}
          x={px(ann.x)}
          y={py(ann.y) + fontPx}
          fontSize={fontPx}
          fill={ann.color}
          fontFamily="Arial"
          stroke={isSelected ? "#6366f1" : "none"}
          strokeWidth={isSelected ? 0.5 : 0}
          onDoubleClick={() => setEditingTextId(ann.id)}
        >
          {ann.text}
        </text>
      );
    }
    if (ann.type === "line" || ann.type === "arrow") {
      const x1 = px(ann.x1),
        y1 = py(ann.y1),
        x2 = px(ann.x2),
        y2 = py(ann.y2);
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const headSize = Math.max(6, strokePx(ann.strokeWidth) * 3);
      return (
        <g key={ann.id} {...common}>
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={ann.color} strokeWidth={strokePx(ann.strokeWidth)} strokeDasharray={strokeDash} />
          {ann.type === "arrow" && (
            <polygon
              points={`${x2},${y2} ${x2 - headSize * Math.cos(angle - Math.PI / 7)},${y2 - headSize * Math.sin(angle - Math.PI / 7)} ${x2 - headSize * Math.cos(angle + Math.PI / 7)},${y2 - headSize * Math.sin(angle + Math.PI / 7)}`}
              fill={ann.color}
            />
          )}
        </g>
      );
    }
    if (ann.type === "rect") {
      const rx = Math.min(ann.x, ann.x + ann.w);
      const ry = Math.min(ann.y, ann.y + ann.h);
      return (
        <rect
          key={ann.id}
          {...common}
          x={px(rx)}
          y={py(ry)}
          width={px(Math.abs(ann.w))}
          height={py(Math.abs(ann.h))}
          fill="none"
          stroke={ann.color}
          strokeWidth={strokePx(ann.strokeWidth)}
          strokeDasharray={strokeDash}
        />
      );
    }
    if (ann.type === "circle") {
      return (
        <ellipse
          key={ann.id}
          {...common}
          cx={px(ann.cx)}
          cy={py(ann.cy)}
          rx={px(ann.rx)}
          ry={py(ann.ry)}
          fill="none"
          stroke={ann.color}
          strokeWidth={strokePx(ann.strokeWidth)}
          strokeDasharray={strokeDash}
        />
      );
    }
    const pencilPoints = (ann as Extract<Annotation, { type: "pencil" }>).points;
    const pointsAttr = pencilPoints.map((p) => `${px(p.x)},${py(p.y)}`).join(" ");
    return (
      <polyline
        key={ann.id}
        {...common}
        points={pointsAttr}
        fill="none"
        stroke={ann.color}
        strokeWidth={strokePx(ann.strokeWidth)}
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeDasharray={strokeDash}
      />
    );
  };

  const editingAnn = editingTextId ? annotations.find((a) => a.id === editingTextId) : null;

  return (
    <div className="flex flex-col h-full lg:flex-row">
      <div className="w-full lg:w-72 flex-shrink-0 border-r border-white/8 bg-surface overflow-y-auto">
        <div className="p-4 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Biên tập & Vẽ</h2>
            <p className="text-xs text-zinc-400 mt-1">Chèn chữ, ghi chú, vẽ thêm lên bản vẽ</p>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {TOOLS.map((t) => (
              <button
                key={t.id}
                title={t.label}
                onClick={() => {
                  setTool(t.id);
                  setSelectedId(null);
                }}
                className={`flex items-center justify-center rounded-lg py-2 border transition-colors ${
                  tool === t.id
                    ? "bg-gradient-to-r from-indigo-600 to-violet-600 border-indigo-600 text-white"
                    : "border-white/10 text-zinc-300 hover:bg-white/8"
                }`}
              >
                {t.icon}
              </button>
            ))}
          </div>

          {tool === "eraser" ? (
            <p className="text-[11px] text-zinc-400 bg-white/5 border border-white/10 rounded-lg p-2.5">
              Kéo (tô/quẹt vài lần) trên bản vẽ để tô trắng đè lên phần cần xoá — vùng to thì quẹt qua lại nhiều lần
              cho phủ kín. Bấm đúng vào 1 nét đã vẽ trước đó (không kéo) để xoá hẳn nét đó.
            </p>
          ) : (
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 mb-1.5 block">Màu</label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full border-2 ${color === c ? "border-indigo-500" : "border-white/20"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-6 h-6 rounded-full overflow-hidden border-2 border-white/20 bg-transparent cursor-pointer"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-[11px] font-semibold text-zinc-400 mb-1.5 block">
              {tool === "eraser" ? "Kích thước tẩy" : "Độ dày nét"}
            </label>
            <div className="flex gap-1.5">
              {STROKE_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setStrokeWidth(s.value)}
                  className={`flex-1 rounded-lg border py-1.5 text-xs font-medium transition-colors ${
                    strokeWidth === s.value
                      ? "bg-gradient-to-r from-indigo-600 to-violet-600 border-indigo-600 text-white"
                      : "border-white/10 text-zinc-300 hover:bg-white/8"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={deleteSelected}
              disabled={!selectedId}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-white/10 py-2 text-xs font-medium text-zinc-300 hover:bg-white/5 disabled:opacity-40"
            >
              <Trash2 size={13} />
              Xoá mục chọn
            </button>
            <button
              onClick={clearAll}
              disabled={!annotations.length}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-white/10 py-2 text-xs font-medium text-zinc-300 hover:bg-white/5 disabled:opacity-40"
            >
              Xoá tất cả
            </button>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving || !annotations.length}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 py-2 text-xs font-semibold text-white shadow-[0_4px_12px_-4px_rgba(99,102,241,0.6)]"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Lưu thay đổi trang này
          </button>

          <p className="text-[10px] text-zinc-500">
            Mẹo: dùng công cụ &quot;Chọn&quot; để kéo di chuyển hoặc bấm đúp vào chữ để sửa nội dung.
          </p>
        </div>
      </div>

      <div
        ref={stageRef}
        onPointerDown={onStagePointerDown}
        className="relative flex-1 flex items-center justify-center bg-surface-2 bg-grid p-6 overflow-auto select-none"
        style={{ cursor: tool === "select" ? "default" : tool === "eraser" ? "pointer" : "crosshair" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={page.workingUrl}
          alt={page.name}
          onLoad={measure}
          className="max-w-full max-h-full w-auto h-auto bg-white shadow-2xl rounded-sm"
          draggable={false}
        />

        {imgRect && (
          <svg
            className="absolute touch-none"
            style={{ left: imgRect.left, top: imgRect.top, width: imgRect.width, height: imgRect.height }}
            width={imgRect.width}
            height={imgRect.height}
          >
            {annotations.map((a) => renderShape(a))}
            {draft && renderShape(draft, true)}
          </svg>
        )}

        {editingAnn && editingAnn.type === "text" && imgRect && (
          <input
            autoFocus
            defaultValue={editingAnn.text}
            onBlur={(e) => commitTextEdit(editingAnn.id, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") commitTextEdit(editingAnn.id, "");
            }}
            style={{
              position: "absolute",
              left: imgRect.left + px(editingAnn.x),
              top: imgRect.top + py(editingAnn.y),
              fontSize: (editingAnn.fontSize / 100) * imgRect.height,
              color: editingAnn.color,
            }}
            className="bg-white/90 border border-indigo-500 rounded px-1 outline-none min-w-[80px]"
          />
        )}
      </div>
    </div>
  );
}
