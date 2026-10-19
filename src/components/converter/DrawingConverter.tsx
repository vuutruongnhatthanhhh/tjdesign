"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Upload, ClipboardPaste, Download, Loader2 } from "lucide-react";
import { LogoMark } from "@/components/brand/Logo";
import PagesSidebar from "./PagesSidebar";
import StepIndicator from "./StepIndicator";
import CropStep from "./CropStep";
import QualityStep from "./QualityStep";
import OcrTranslateStep from "./OcrTranslateStep";
import AnnotateStep from "./AnnotateStep";
import FrameStep from "./FrameStep";
import ExportStep from "./ExportStep";
import { filesToPages, loadImageElement, renderQualityToDataUrl } from "./imageUtils";
import {
  DEFAULT_QUALITY,
  type Annotation,
  type DrawingPage,
  type FrameTemplateId,
  type OcrSegment,
  type QualitySettings,
  type StepId,
  type TitleBlockFields,
} from "./types";

export default function DrawingConverter() {
  const [pages, setPages] = useState<DrawingPage[]>([]);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [step, setStep] = useState<StepId>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const activePage = pages.find((p) => p.id === activePageId) ?? null;

  const addFiles = useCallback(
    async (files: File[]) => {
      setIsLoading(true);
      try {
        const newPages = await filesToPages(files, DEFAULT_QUALITY);
        if (!newPages.length) return;
        setPages((prev) => [...prev, ...newPages]);
        setActivePageId((prev) => prev ?? newPages[0].id);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const updatePage = useCallback((id: string, patch: Partial<DrawingPage>) => {
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const removePage = useCallback(
    (id: string) => {
      setPages((prev) => {
        const next = prev.filter((p) => p.id !== id);
        if (activePageId === id) {
          setActivePageId(next[0]?.id ?? null);
        }
        return next;
      });
    },
    [activePageId]
  );

  const handleCropped = (result: { url: string; width: number; height: number }) => {
    if (!activePage) return;
    updatePage(activePage.id, { workingUrl: result.url, width: result.width, height: result.height });
  };

  const handleResetToOriginal = async () => {
    if (!activePage) return;
    const img = await loadImageElement(activePage.originalUrl);
    updatePage(activePage.id, {
      workingUrl: activePage.originalUrl,
      width: img.naturalWidth,
      height: img.naturalHeight,
    });
  };

  const handleQualityChange = (settings: QualitySettings) => {
    if (!activePage) return;
    updatePage(activePage.id, { quality: settings });
  };

  const handleSaveQualityForPage = (bakedUrl: string) => {
    if (!activePage) return;
    updatePage(activePage.id, { workingUrl: bakedUrl, quality: DEFAULT_QUALITY });
  };

  const handleSegmentsChange = (segments: OcrSegment[]) => {
    if (!activePage) return;
    updatePage(activePage.id, { ocrSegments: segments });
  };

  const handleOcrBake = (bakedUrl: string) => {
    if (!activePage) return;
    updatePage(activePage.id, { workingUrl: bakedUrl });
  };

  const handleAnnotationsChange = (annotations: Annotation[]) => {
    if (!activePage) return;
    updatePage(activePage.id, { annotations });
  };

  const handleAnnotateBake = (bakedUrl: string) => {
    if (!activePage) return;
    updatePage(activePage.id, { workingUrl: bakedUrl });
  };

  const handleFrameChange = (template: FrameTemplateId, fields: TitleBlockFields) => {
    if (!activePage) return;
    updatePage(activePage.id, { frame: { template, fields } });
  };

  const handleFrameBake = (result: { url: string; width: number; height: number }) => {
    if (!activePage) return;
    updatePage(activePage.id, { workingUrl: result.url, width: result.width, height: result.height });
  };

  const handleImportProject = (importedPages: DrawingPage[]) => {
    setPages(importedPages);
    setActivePageId(importedPages[0]?.id ?? null);
    setStep(1);
  };

  const handleExportCurrentPage = async () => {
    if (!activePage) return;
    setIsExporting(true);
    try {
      const url = await renderQualityToDataUrl(activePage.workingUrl, activePage.quality);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${activePage.name || "ban-ve"}.png`;
      a.click();
    } finally {
      setIsExporting(false);
    }
  };

  const handleEmptyDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length) addFiles(files);
  };

  return (
    <div className="flex flex-col h-screen bg-bg text-white">
      {/* Top bar */}
      <div className="flex items-center h-14 px-3 bg-surface border-b border-white/8 gap-3 flex-shrink-0">
        <Link
          href="/"
          title="Quay lại trang chủ"
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:bg-white/8 hover:text-white flex-shrink-0"
        >
          <ArrowLeft size={16} />
        </Link>

        <div className="flex items-center gap-2 flex-shrink-0">
          <LogoMark size={26} />
          <div className="hidden sm:block">
            <div className="text-sm font-semibold leading-tight text-white">Converter</div>
            <div className="text-[11px] text-zinc-400 leading-tight truncate max-w-[160px]">
              {activePage ? activePage.name : "Chưa có bản vẽ"}
            </div>
          </div>
        </div>

        <div className="flex-1 flex justify-center overflow-x-auto">
          <StepIndicator step={step} onChange={setStep} hasPages={pages.length > 0} />
        </div>

        <button
          onClick={handleExportCurrentPage}
          disabled={!activePage || isExporting}
          title="Tải ảnh của trang hiện tại (PNG)"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/8 hover:bg-white/15 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 transition-colors"
        >
          {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          <span className="hidden sm:inline">Tải ảnh</span>
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        <PagesSidebar
          pages={pages}
          activePageId={activePageId}
          isLoading={isLoading}
          onSelect={setActivePageId}
          onAddFiles={addFiles}
          onRemove={removePage}
        />

        <div className="flex-1 min-w-0 min-h-0">
          {!activePage ? (
            <div
              ref={dropRef}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleEmptyDrop}
              onClick={() => inputRef.current?.click()}
              className={`h-full flex flex-col items-center justify-center gap-3 cursor-pointer m-6 rounded-2xl border-2 border-dashed transition-colors bg-surface-2 ${
                isDragging ? "border-indigo-500 bg-indigo-500/10" : "border-white/10 hover:border-white/25"
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                multiple
                accept="application/pdf,image/*"
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (files.length) addFiles(files);
                  e.target.value = "";
                }}
              />
              {isLoading ? (
                <Loader2 size={36} className="animate-spin text-zinc-400" />
              ) : (
                <div className="flex items-center gap-4 text-zinc-500">
                  <ClipboardPaste size={32} />
                  <span className="text-2xl font-light">|</span>
                  <Upload size={32} />
                </div>
              )}
              <p className="text-sm font-medium text-zinc-300 text-center">
                Kéo thả file vào đây hoặc nhấn để chọn
              </p>
              <p className="text-xs text-zinc-500 text-center">
                Hỗ trợ PDF (nhiều trang) · JPG · PNG · BMP · TIFF · WEBP
              </p>
            </div>
          ) : step === 1 ? (
            <CropStep
              key={activePage.id}
              page={activePage}
              onCropped={handleCropped}
              onResetToOriginal={handleResetToOriginal}
            />
          ) : step === 2 ? (
            <QualityStep
              key={activePage.id}
              page={activePage}
              onQualityChange={handleQualityChange}
              onSaveForPage={handleSaveQualityForPage}
            />
          ) : step === 3 ? (
            <OcrTranslateStep
              key={activePage.id}
              page={activePage}
              onSegmentsChange={handleSegmentsChange}
              onBake={handleOcrBake}
            />
          ) : step === 4 ? (
            <AnnotateStep
              key={activePage.id}
              page={activePage}
              onAnnotationsChange={handleAnnotationsChange}
              onBake={handleAnnotateBake}
            />
          ) : step === 5 ? (
            <FrameStep
              key={activePage.id}
              page={activePage}
              onFrameChange={handleFrameChange}
              onBake={handleFrameBake}
            />
          ) : (
            <ExportStep
              key={activePage.id}
              page={activePage}
              allPages={pages}
              onImportProject={handleImportProject}
            />
          )}
        </div>
      </div>
    </div>
  );
}
