"use client";

import { useRef, useState } from "react";
import { Plus, X, Loader2, FileStack } from "lucide-react";
import type { DrawingPage } from "./types";

interface Props {
  pages: DrawingPage[];
  activePageId: string | null;
  isLoading: boolean;
  onSelect: (id: string) => void;
  onAddFiles: (files: File[]) => void;
  onRemove: (id: string) => void;
}

export default function PagesSidebar({
  pages,
  activePageId,
  isLoading,
  onSelect,
  onAddFiles,
  onRemove,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (fileList: FileList | File[] | null) => {
    if (!fileList) return;
    const files = Array.from(fileList);
    if (files.length) onAddFiles(files);
  };

  return (
    <div
      className="w-52 flex-shrink-0 border-r border-white/8 bg-surface flex flex-col"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
    >
      <div className="p-3 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">
          Trang ({pages.length})
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="application/pdf,image/*"
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <button
        onClick={() => inputRef.current?.click()}
        className="mx-3 mb-3 flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-medium py-2 transition-all shadow-[0_4px_12px_-4px_rgba(99,102,241,0.6)]"
      >
        <Plus size={14} />
        Thêm file/trang
      </button>

      <div
        className={`flex-1 overflow-y-auto px-3 pb-3 space-y-2 ${
          isDragging ? "ring-2 ring-indigo-500 rounded-md" : ""
        }`}
      >
        {pages.map((page, idx) => (
          <div
            key={page.id}
            onClick={() => onSelect(page.id)}
            className={`group relative rounded-lg border overflow-hidden cursor-pointer transition-all
              ${
                activePageId === page.id
                  ? "border-indigo-500 ring-1 ring-indigo-500/60 shadow-[0_4px_14px_-4px_rgba(99,102,241,0.5)]"
                  : "border-white/8 hover:border-white/20"
              }`}
          >
            <div className="absolute top-1 left-1 z-10 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
              {idx + 1}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(page.id);
              }}
              className="absolute top-1 right-1 z-10 bg-black/70 hover:bg-red-600 text-white rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Xoá trang"
            >
              <X size={12} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={page.workingUrl}
              alt={page.name}
              className="w-full h-24 object-contain bg-white"
            />
            <div className="px-1.5 py-1 text-[11px] text-zinc-300 truncate bg-black/40">
              {page.name}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center justify-center gap-2 text-xs text-zinc-400 py-4">
            <Loader2 size={14} className="animate-spin" />
            Đang xử lý...
          </div>
        )}

        {pages.length === 0 && !isLoading && (
          <div className="text-center text-[11px] text-zinc-500 py-6 flex flex-col items-center gap-2">
            <FileStack size={20} className="opacity-40" />
            Kéo thả PDF / ảnh vào đây
            <br />
            hoặc nhấn &quot;Thêm file/trang&quot;
          </div>
        )}
      </div>
    </div>
  );
}
