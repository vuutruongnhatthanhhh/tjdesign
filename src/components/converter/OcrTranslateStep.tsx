"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ScanText,
  Languages,
  Loader2,
  Check,
  Trash2,
  Search,
  CheckCheck,
  Maximize,
  Crop as CropIcon,
  RotateCcw,
  Undo2,
  Save,
  X,
} from "lucide-react";
import type { DrawingPage, OcrSegment, RectCrop } from "./types";
import { cropRectToDataUrl } from "./imageUtils";
import { applySegmentsToImage, runOcr, translateText } from "./ocrUtils";

interface Props {
  page: DrawingPage;
  onSegmentsChange: (segments: OcrSegment[]) => void;
  onBake: (bakedUrl: string) => void;
}

type OcrScope = "page" | "region";

const SOURCE_LANG_OPTIONS = [
  { label: "Việt + Anh", value: "vie+eng" },
  { label: "Tiếng Việt", value: "vie" },
  { label: "Tiếng Anh", value: "eng" },
  { label: "Tiếng Trung", value: "chi_sim" },
  { label: "Tiếng Nhật", value: "jpn" },
  { label: "Tiếng Hàn", value: "kor" },
];

const TARGET_LANG_OPTIONS = [
  { label: "Tiếng Việt", value: "vi" },
  { label: "Tiếng Anh", value: "en" },
  { label: "Tiếng Trung", value: "zh" },
  { label: "Tiếng Hàn", value: "ko" },
  { label: "Tiếng Nhật", value: "ja" },
];

interface ImgRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export default function OcrTranslateStep({ page, onSegmentsChange, onBake }: Props) {
  const [segments, setSegments] = useState<OcrSegment[]>(page.ocrSegments);
  const [sourceLang, setSourceLang] = useState("vie+eng");
  const [targetLang, setTargetLang] = useState("vi");
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [search, setSearch] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [scope, setScope] = useState<OcrScope>("page");
  const [selectionRect, setSelectionRect] = useState<RectCrop | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgRect, setImgRect] = useState<ImgRect | null>(null);
  const selectDragRef = useRef<{ startX: number; startY: number } | null>(null);

  const segmentsRef = useRef(segments);
  segmentsRef.current = segments;
  const moveDragRef = useRef<{ id: string; startX: number; startY: number; origBbox: OcrSegment["bbox"] } | null>(
    null
  );

  useEffect(() => {
    setSegments(page.ocrSegments);
    setSelectionRect(null);
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

  const updateSegments = (next: OcrSegment[]) => {
    setSegments(next);
    onSegmentsChange(next);
  };

  const onSelectPointerDown = (e: React.PointerEvent) => {
    if (scope !== "region" || isRunning) return;
    const p = clientToPct(e.clientX, e.clientY);
    selectDragRef.current = { startX: p.x, startY: p.y };
    setSelectionRect({ x: p.x, y: p.y, w: 0, h: 0 });
    window.addEventListener("pointermove", onSelectPointerMove);
    window.addEventListener("pointerup", onSelectPointerUp);
  };

  const onSelectPointerMove = useCallback(
    (e: PointerEvent) => {
      const start = selectDragRef.current;
      if (!start) return;
      const p = clientToPct(e.clientX, e.clientY);
      setSelectionRect({
        x: Math.min(start.startX, p.x),
        y: Math.min(start.startY, p.y),
        w: Math.abs(p.x - start.startX),
        h: Math.abs(p.y - start.startY),
      });
    },
    [clientToPct]
  );

  const onSelectPointerUp = useCallback(() => {
    selectDragRef.current = null;
    window.removeEventListener("pointermove", onSelectPointerMove);
    window.removeEventListener("pointerup", onSelectPointerUp);
    setSelectionRect((r) => (r && r.w > 1 && r.h > 1 ? r : null));
  }, [onSelectPointerMove]);

  const onAppliedPointerDown = (seg: OcrSegment, e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    moveDragRef.current = { id: seg.id, startX: e.clientX, startY: e.clientY, origBbox: seg.bbox };
    window.addEventListener("pointermove", onAppliedPointerMove);
    window.addEventListener("pointerup", onAppliedPointerUp);
  };

  const onAppliedPointerMove = useCallback(
    (e: PointerEvent) => {
      const dr = moveDragRef.current;
      if (!dr || !imgRect) return;
      const dxPct = ((e.clientX - dr.startX) / imgRect.width) * 100;
      const dyPct = ((e.clientY - dr.startY) / imgRect.height) * 100;
      const nextX = Math.min(100 - dr.origBbox.w, Math.max(0, dr.origBbox.x + dxPct));
      const nextY = Math.min(100 - dr.origBbox.h, Math.max(0, dr.origBbox.y + dyPct));
      const next = segmentsRef.current.map((s) =>
        s.id === dr.id ? { ...s, bbox: { ...s.bbox, x: nextX, y: nextY } } : s
      );
      setSegments(next);
      onSegmentsChange(next);
    },
    [imgRect] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const onAppliedPointerUp = useCallback(() => {
    moveDragRef.current = null;
    window.removeEventListener("pointermove", onAppliedPointerMove);
    window.removeEventListener("pointerup", onAppliedPointerUp);
  }, [onAppliedPointerMove]);

  const resizeDragRef = useRef<{ id: string; startX: number; startY: number; origBbox: OcrSegment["bbox"] } | null>(
    null
  );

  const onResizeHandlePointerDown = (seg: OcrSegment, e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    resizeDragRef.current = { id: seg.id, startX: e.clientX, startY: e.clientY, origBbox: seg.bbox };
    window.addEventListener("pointermove", onResizePointerMove);
    window.addEventListener("pointerup", onResizePointerUp);
  };

  const onResizePointerMove = useCallback(
    (e: PointerEvent) => {
      const dr = resizeDragRef.current;
      if (!dr || !imgRect) return;
      const dxPct = ((e.clientX - dr.startX) / imgRect.width) * 100;
      const dyPct = ((e.clientY - dr.startY) / imgRect.height) * 100;
      const nextW = Math.min(100 - dr.origBbox.x, Math.max(2, dr.origBbox.w + dxPct));
      const nextH = Math.min(100 - dr.origBbox.y, Math.max(1.5, dr.origBbox.h + dyPct));
      const next = segmentsRef.current.map((s) =>
        s.id === dr.id ? { ...s, bbox: { ...s.bbox, w: nextW, h: nextH } } : s
      );
      setSegments(next);
      onSegmentsChange(next);
    },
    [imgRect] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const onResizePointerUp = useCallback(() => {
    resizeDragRef.current = null;
    window.removeEventListener("pointermove", onResizePointerMove);
    window.removeEventListener("pointerup", onResizePointerUp);
  }, [onResizePointerMove]);

  const handleRunOcr = async () => {
    if (scope === "region" && !selectionRect) return;
    setIsRunning(true);
    setProgress(0);
    setProgressLabel("Đang khởi tạo...");
    try {
      const statusMap: Record<string, string> = {
        "loading tesseract core": "Đang tải Tesseract...",
        "initializing tesseract": "Đang khởi tạo...",
        "loading language traineddata": "Đang tải ngôn ngữ...",
        "initializing api": "Đang khởi tạo API...",
        "recognizing text": "Đang nhận dạng văn bản...",
      };

      let sourceUrl = page.workingUrl;
      let region: RectCrop | null = null;
      if (scope === "region" && selectionRect) {
        region = selectionRect;
        const cropped = await cropRectToDataUrl(page.workingUrl, selectionRect);
        sourceUrl = cropped.url;
      }

      const detected = await runOcr(sourceUrl, sourceLang, (p) => {
        setProgressLabel(statusMap[p.status] ?? p.status);
        setProgress(Math.round(p.progress * 100));
      });

      const remapped = region
        ? detected.map((seg) => ({
            ...seg,
            bbox: {
              x: region!.x + (seg.bbox.x / 100) * region!.w,
              y: region!.y + (seg.bbox.y / 100) * region!.h,
              w: (seg.bbox.w / 100) * region!.w,
              h: (seg.bbox.h / 100) * region!.h,
            },
          }))
        : detected;

      setProgressLabel("Đang dịch...");
      const translated = await Promise.all(
        remapped.map(async (seg) => ({
          ...seg,
          translated: await translateText(seg.text, targetLang).catch(() => ""),
        }))
      );

      updateSegments(scope === "region" ? [...segments, ...translated] : translated);
    } finally {
      setIsRunning(false);
    }
  };

  const updateSegment = (id: string, patch: Partial<OcrSegment>) => {
    updateSegments(segments.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const removeSegment = (id: string) => {
    updateSegments(segments.filter((s) => s.id !== id));
  };

  const applyOne = (id: string) => updateSegment(id, { applied: true });
  const unapplyOne = (id: string) => updateSegment(id, { applied: false });

  const applyAll = () => {
    updateSegments(segments.map((s) => (s.translated.trim() ? { ...s, applied: true } : s)));
  };

  const handleSaveApplied = async () => {
    const toBake = segments.filter((s) => s.applied && s.translated.trim());
    if (!toBake.length) return;
    setIsSaving(true);
    try {
      const bakedUrl = await applySegmentsToImage(page.workingUrl, toBake);
      updateSegments(segments.filter((s) => !(s.applied && s.translated.trim())));
      onBake(bakedUrl);
    } finally {
      setIsSaving(false);
    }
  };

  const filtered = segments.filter(
    (s) =>
      !search.trim() ||
      s.text.toLowerCase().includes(search.toLowerCase()) ||
      s.translated.toLowerCase().includes(search.toLowerCase())
  );

  const canRunOcr = !isRunning && (scope === "page" || !!selectionRect);
  const appliedCount = segments.filter((s) => s.applied && s.translated.trim()).length;

  return (
    <div className="flex flex-col h-full lg:flex-row">
      <div className="w-full lg:w-96 flex-shrink-0 border-r border-white/8 bg-surface overflow-y-auto">
        <div className="p-4 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <ScanText size={16} className="text-indigo-400" />
              OCR & Dịch thuật kỹ thuật
            </h2>
            <p className="text-xs text-zinc-400 mt-1">Nhận dạng và dịch chữ trong bản vẽ</p>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-zinc-400 mb-1.5 block">Phạm vi</label>
            <div className="flex rounded-lg overflow-hidden border border-white/10">
              <button
                onClick={() => {
                  setScope("page");
                  setSelectionRect(null);
                }}
                disabled={isRunning}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium transition-colors ${
                  scope === "page" ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white" : "text-zinc-300 hover:bg-white/8"
                }`}
              >
                <Maximize size={13} />
                Toàn trang hiện tại
              </button>
              <button
                onClick={() => setScope("region")}
                disabled={isRunning}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium transition-colors ${
                  scope === "region" ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white" : "text-zinc-300 hover:bg-white/8"
                }`}
              >
                <CropIcon size={13} />
                Kéo chọn 1 vùng
              </button>
            </div>
            {scope === "region" && (
              <p className="text-[10px] text-zinc-500 mt-1.5">
                {selectionRect
                  ? `Đã chọn vùng ${Math.round((selectionRect.w / 100) * page.width)} x ${Math.round(
                      (selectionRect.h / 100) * page.height
                    )} px`
                  : "Kéo chuột trên ảnh bên phải để chọn vùng cần OCR"}
                {selectionRect && (
                  <button
                    onClick={() => setSelectionRect(null)}
                    className="ml-2 inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300"
                  >
                    <RotateCcw size={10} />
                    Chọn lại
                  </button>
                )}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 mb-1 block">Ngôn ngữ nguồn</label>
              <select
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                disabled={isRunning}
                className="w-full rounded-lg bg-bg border border-white/10 text-xs text-zinc-200 px-2 py-1.5"
              >
                {SOURCE_LANG_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 mb-1 block">Ngôn ngữ đích</label>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                disabled={isRunning}
                className="w-full rounded-lg bg-bg border border-white/10 text-xs text-zinc-200 px-2 py-1.5"
              >
                {TARGET_LANG_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleRunOcr}
            disabled={!canRunOcr}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 py-2 text-xs font-semibold text-white shadow-[0_4px_12px_-4px_rgba(99,102,241,0.6)]"
          >
            {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Languages size={14} />}
            {isRunning
              ? progressLabel || "Đang xử lý..."
              : scope === "region"
              ? "Bắt đầu OCR & Dịch vùng đã chọn"
              : "Bắt đầu OCR & Dịch toàn trang"}
          </button>
          {isRunning && (
            <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-sky-400 transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}

          {segments.length > 0 && (
            <>
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm chữ gốc hoặc bản dịch..."
                  className="w-full rounded-lg bg-bg border border-white/10 text-xs text-zinc-200 pl-8 pr-2 py-1.5 outline-none focus:border-indigo-500"
                />
              </div>

              <button
                onClick={applyAll}
                disabled={!segments.some((s) => s.translated.trim() && !s.applied)}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-40 py-1.5 text-xs font-medium text-zinc-200"
              >
                <CheckCheck size={13} />
                Áp dụng tất cả ({segments.filter((s) => s.translated.trim() && !s.applied).length})
              </button>

              {appliedCount > 0 && (
                <div className="rounded-lg border border-indigo-500/40 bg-indigo-500/10 p-2.5 space-y-2">
                  <p className="text-[11px] text-indigo-300">
                    {appliedCount} đoạn đang hiển thị trên bản vẽ — kéo trực tiếp trên ảnh để đổi vị trí, sau đó bấm
                    lưu để ghi hẳn vào ảnh.
                  </p>
                  <button
                    onClick={handleSaveApplied}
                    disabled={isSaving}
                    className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 py-2 text-xs font-semibold text-white"
                  >
                    {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Lưu vị trí lên bản vẽ
                  </button>
                </div>
              )}

              <div className="space-y-2">
                {filtered.map((seg, idx) => (
                  <div
                    key={seg.id}
                    onMouseEnter={() => setHoveredId(seg.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className={`rounded-lg border p-2.5 space-y-1.5 transition-colors ${
                      hoveredId === seg.id
                        ? "border-indigo-500 bg-indigo-500/5"
                        : seg.applied
                        ? "border-indigo-500/30"
                        : "border-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5">
                        #{idx + 1}
                        {seg.applied && (
                          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                            Đang hiển thị trên bản vẽ
                          </span>
                        )}
                      </span>
                      <button
                        onClick={() => removeSegment(seg.id)}
                        className="text-zinc-500 hover:text-red-400"
                        title="Bỏ qua đoạn này"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500">Chữ gốc (scan OCR)</label>
                      <input
                        value={seg.text}
                        onChange={(e) => updateSegment(seg.id, { text: e.target.value })}
                        className="w-full rounded bg-bg border border-white/10 text-xs text-zinc-200 px-2 py-1 mt-0.5"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500">Bản dịch</label>
                      <input
                        value={seg.translated}
                        onChange={(e) => updateSegment(seg.id, { translated: e.target.value })}
                        className="w-full rounded bg-bg border border-white/10 text-xs text-zinc-200 px-2 py-1 mt-0.5"
                      />
                    </div>
                    {seg.applied && (
                      <div>
                        <label className="text-[10px] text-zinc-500">Cỡ chữ (px)</label>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <input
                            type="number"
                            min={6}
                            max={400}
                            value={seg.fontSize ?? ""}
                            placeholder="Tự động"
                            onChange={(e) =>
                              updateSegment(seg.id, {
                                fontSize: e.target.value ? Number(e.target.value) : undefined,
                              })
                            }
                            className="w-24 rounded bg-bg border border-white/10 text-xs text-zinc-200 px-2 py-1"
                          />
                          {seg.fontSize != null && (
                            <button
                              onClick={() => updateSegment(seg.id, { fontSize: undefined })}
                              className="text-[10px] text-indigo-400 hover:text-indigo-300"
                            >
                              Tự động
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                    {seg.applied ? (
                      <button
                        onClick={() => unapplyOne(seg.id)}
                        className="w-full flex items-center justify-center gap-1.5 rounded bg-white/10 hover:bg-white/20 py-1 text-[11px] font-medium text-zinc-200"
                      >
                        <Undo2 size={12} />
                        Bỏ áp dụng
                      </button>
                    ) : (
                      <button
                        onClick={() => applyOne(seg.id)}
                        disabled={!seg.translated.trim()}
                        className="w-full flex items-center justify-center gap-1.5 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 py-1 text-[11px] font-medium text-zinc-200"
                      >
                        <Check size={12} />
                        Áp dụng lên bản vẽ
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {!isRunning && segments.length === 0 && (
            <p className="text-xs text-zinc-500 text-center py-6">
              Nhấn &quot;Bắt đầu OCR &amp; Dịch&quot; để nhận dạng chữ trong bản vẽ.
            </p>
          )}
        </div>
      </div>

      <div
        ref={stageRef}
        className="relative flex-1 flex items-center justify-center bg-surface-2 bg-grid p-6 overflow-auto"
        style={{ cursor: scope === "region" && !isRunning ? "crosshair" : "default" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={page.workingUrl}
          alt={page.name}
          onLoad={measure}
          className="max-w-full max-h-full w-auto h-auto bg-white shadow-2xl rounded-sm select-none"
          draggable={false}
        />
        {imgRect && (
          <div
            onPointerDown={scope === "region" ? onSelectPointerDown : undefined}
            className="absolute touch-none"
            style={{
              left: imgRect.left,
              top: imgRect.top,
              width: imgRect.width,
              height: imgRect.height,
              pointerEvents: scope === "region" ? "auto" : "none",
            }}
          >
            {segments
              .filter((s) => !s.applied)
              .map((seg) => (
                <div
                  key={seg.id}
                  className={`absolute border pointer-events-none transition-colors ${
                    hoveredId === seg.id ? "border-indigo-500 bg-indigo-500/20" : "border-indigo-400/40"
                  }`}
                  style={{
                    left: `${seg.bbox.x}%`,
                    top: `${seg.bbox.y}%`,
                    width: `${seg.bbox.w}%`,
                    height: `${seg.bbox.h}%`,
                  }}
                />
              ))}

            {segments
              .filter((s) => s.applied)
              .map((seg) => (
                <div
                  key={seg.id}
                  onPointerDown={(e) => onAppliedPointerDown(seg, e)}
                  onMouseEnter={() => setHoveredId(seg.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={`group absolute flex items-center bg-white border-2 pointer-events-auto cursor-move ${
                    hoveredId === seg.id ? "border-indigo-500" : "border-indigo-400/70"
                  }`}
                  style={{
                    left: `${seg.bbox.x}%`,
                    top: `${seg.bbox.y}%`,
                    width: `${seg.bbox.w}%`,
                    height: `${seg.bbox.h}%`,
                  }}
                  title="Kéo để đổi vị trí · kéo góc để đổi cỡ chữ"
                >
                  <span
                    className="text-black leading-none whitespace-nowrap px-0.5 select-none"
                    style={{
                      fontSize:
                        seg.fontSize != null
                          ? Math.max(6, seg.fontSize * ((imgRect?.height ?? 0) / (page.height || 1)))
                          : Math.max(8, (seg.bbox.h / 100) * (imgRect?.height ?? 0) * 0.75),
                    }}
                  >
                    {seg.translated}
                  </span>
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => unapplyOne(seg.id)}
                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Bỏ áp dụng"
                  >
                    <X size={10} />
                  </button>
                  <div
                    onPointerDown={(e) => onResizeHandlePointerDown(seg, e)}
                    className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-indigo-500 border border-white rounded-sm cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Kéo để đổi cỡ chữ"
                  />
                </div>
              ))}

            {selectionRect && (
              <div
                className="absolute border-2 border-dashed border-amber-400 bg-amber-400/10 pointer-events-none"
                style={{
                  left: `${selectionRect.x}%`,
                  top: `${selectionRect.y}%`,
                  width: `${selectionRect.w}%`,
                  height: `${selectionRect.h}%`,
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
