"use client";

import { useRef, useState } from "react";
import { Download, FileImage, FileText, FolderOpen, Loader2, Save, Images } from "lucide-react";
import type { DrawingPage } from "./types";

interface Props {
  page: DrawingPage;
  allPages: DrawingPage[];
  onImportProject: (pages: DrawingPage[]) => void;
}

const PX_PER_INCH = 150;

export default function ExportStep({ page, allPages, onImportProject }: Props) {
  const [fileName, setFileName] = useState(page.name || "ban-ve");
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfScope, setPdfScope] = useState<"current" | "all">("current");
  const [isImporting, setIsImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const downloadDataUrl = (url: string, name: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
  };

  const handleExportPng = async () => {
    setIsExportingPng(true);
    try {
      downloadDataUrl(page.workingUrl, `${fileName || "ban-ve"}.png`);
    } finally {
      setIsExportingPng(false);
    }
  };

  const handleExportZip = async () => {
    setIsExportingZip(true);
    try {
      const JSZip = (await import("jszip")).default;
      const { saveAs } = await import("file-saver");
      const zip = new JSZip();
      allPages.forEach((p, idx) => {
        const base64 = p.workingUrl.split(",")[1];
        zip.file(`${idx + 1}-${p.name || "trang"}.png`, base64, { base64: true });
      });
      const blob = await zip.generateAsync({ type: "blob" });
      saveAs(blob, `${fileName || "ban-ve"}.zip`);
    } finally {
      setIsExportingZip(false);
    }
  };

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const { saveAs } = await import("file-saver");
      const pdfDoc = await PDFDocument.create();
      const pagesToExport = pdfScope === "all" ? allPages : [page];

      for (const p of pagesToExport) {
        const bytes = await (await fetch(p.workingUrl)).arrayBuffer();
        const pngImage = await pdfDoc.embedPng(bytes);
        const ptW = (pngImage.width * 72) / PX_PER_INCH;
        const ptH = (pngImage.height * 72) / PX_PER_INCH;
        const pdfPage = pdfDoc.addPage([ptW, ptH]);
        pdfPage.drawImage(pngImage, { x: 0, y: 0, width: ptW, height: ptH });
      }

      const bytes = await pdfDoc.save();
      saveAs(new Blob([bytes as BlobPart], { type: "application/pdf" }), `${fileName || "ban-ve"}.pdf`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleSaveProject = () => {
    const json = JSON.stringify({ version: 1, pages: allPages }, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    downloadDataUrl(url, `${fileName || "du-an-ban-ve"}.json`);
    URL.revokeObjectURL(url);
  };

  const handleOpenProject = async (file: File) => {
    setIsImporting(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed?.pages)) {
        onImportProject(parsed.pages as DrawingPage[]);
      }
    } catch {
      // bỏ qua file không hợp lệ
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-surface-2">
      <div className="max-w-xl mx-auto p-6 space-y-5">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Download size={16} className="text-indigo-400" />
            Xuất Bản Vẽ Hoàn Chỉnh
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Xuất bản vẽ đã crop, chỉnh ảnh, dịch chữ và đóng khung (nếu có) ở các bước trước.
          </p>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-zinc-400 mb-1 block">Tên file xuất</label>
          <input
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            className="w-full rounded-lg bg-bg border border-white/10 text-sm text-zinc-200 px-3 py-2 outline-none focus:border-indigo-500"
          />
        </div>

        <div className="rounded-xl border border-white/10 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={page.workingUrl} alt={page.name} className="w-full max-h-72 object-contain bg-white" />
        </div>

        <div className="space-y-2.5">
          <button
            onClick={handleExportPng}
            disabled={isExportingPng}
            className="w-full flex items-center gap-3 rounded-lg border border-white/10 hover:border-indigo-500 hover:bg-white/5 px-4 py-3 text-left transition-colors"
          >
            {isExportingPng ? <Loader2 size={18} className="animate-spin" /> : <FileImage size={18} className="text-indigo-400" />}
            <span className="flex-1">
              <span className="block text-sm font-medium text-zinc-100">Tải PNG (trang hiện tại)</span>
              <span className="block text-[11px] text-zinc-500">Ảnh độ phân giải gốc, giữ nguyên nền trong suốt nếu có</span>
            </span>
          </button>

          {allPages.length > 1 && (
            <button
              onClick={handleExportZip}
              disabled={isExportingZip}
              className="w-full flex items-center gap-3 rounded-lg border border-white/10 hover:border-indigo-500 hover:bg-white/5 px-4 py-3 text-left transition-colors"
            >
              {isExportingZip ? <Loader2 size={18} className="animate-spin" /> : <Images size={18} className="text-indigo-400" />}
              <span className="flex-1">
                <span className="block text-sm font-medium text-zinc-100">Tải tất cả trang (.zip ảnh PNG)</span>
                <span className="block text-[11px] text-zinc-500">{allPages.length} trang</span>
              </span>
            </button>
          )}

          <div className="rounded-lg border border-white/10 px-4 py-3 space-y-2.5">
            <div className="flex items-center gap-3">
              <FileText size={18} className="text-indigo-400" />
              <span className="flex-1">
                <span className="block text-sm font-medium text-zinc-100">Xuất PDF</span>
                <span className="block text-[11px] text-zinc-500">Nhúng ảnh độ nét cao vào trang PDF, phù hợp in ấn</span>
              </span>
            </div>
            {allPages.length > 1 && (
              <div className="flex gap-1.5 pl-9">
                <button
                  onClick={() => setPdfScope("current")}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium border ${
                    pdfScope === "current" ? "bg-gradient-to-r from-indigo-600 to-violet-600 border-indigo-600 text-white" : "border-white/10 text-zinc-300"
                  }`}
                >
                  Trang hiện tại
                </button>
                <button
                  onClick={() => setPdfScope("all")}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium border ${
                    pdfScope === "all" ? "bg-gradient-to-r from-indigo-600 to-violet-600 border-indigo-600 text-white" : "border-white/10 text-zinc-300"
                  }`}
                >
                  Tất cả ({allPages.length} trang)
                </button>
              </div>
            )}
            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="ml-9 flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold text-white"
            >
              {isExportingPdf ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              Tải về PDF
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-white/8 space-y-2">
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide pt-3">Dự án</p>
          <button
            onClick={handleSaveProject}
            className="w-full flex items-center gap-3 rounded-lg border border-white/10 hover:border-indigo-500 hover:bg-white/5 px-4 py-3 text-left transition-colors"
          >
            <Save size={18} className="text-amber-400" />
            <span className="flex-1">
              <span className="block text-sm font-medium text-zinc-100">Sao lưu toàn bộ dự án (.json)</span>
              <span className="block text-[11px] text-zinc-500">
                Lưu lại tất cả trang để mở lại chỉnh sửa tiếp, không cần OCR lại từ đầu
              </span>
            </span>
          </button>

          <input
            ref={importInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleOpenProject(file);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => importInputRef.current?.click()}
            disabled={isImporting}
            className="w-full flex items-center gap-3 rounded-lg border border-white/10 hover:border-indigo-500 hover:bg-white/5 px-4 py-3 text-left transition-colors"
          >
            {isImporting ? <Loader2 size={18} className="animate-spin" /> : <FolderOpen size={18} className="text-amber-400" />}
            <span className="flex-1">
              <span className="block text-sm font-medium text-zinc-100">Mở dự án đã lưu (.json)</span>
              <span className="block text-[11px] text-zinc-500">Nạp lại toàn bộ trang từ file đã sao lưu trước đó</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
