"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Check, Loader2, XCircle, RectangleHorizontal, RectangleVertical } from "lucide-react";
import type { DrawingPage, FrameTemplateId, TitleBlockFields } from "./types";
import { composeFrame, composeFrameToDataUrl, getA4Size } from "./frameUtils";

interface Props {
  page: DrawingPage;
  onFrameChange: (template: FrameTemplateId, fields: TitleBlockFields) => void;
  onBake: (result: { url: string; width: number; height: number }) => void;
}

const TEMPLATES: { id: FrameTemplateId; label: string; desc: string; icon: React.ReactNode }[] = [
  { id: "none", label: "Không chọn mẫu", desc: "Bản vẽ thuần tuý, không đóng khung viền A4", icon: <XCircle size={18} /> },
  { id: "a4-landscape", label: "Khung A4 Ngang", desc: "A4 Ngang (297 x 210 mm)", icon: <RectangleHorizontal size={18} /> },
  { id: "a4-portrait", label: "Khung A4 Dọc", desc: "A4 Dọc (210 x 297 mm)", icon: <RectangleVertical size={18} /> },
];

const FIELD_DEFS: { key: keyof TitleBlockFields; label: string; placeholder: string }[] = [
  { key: "companyName", label: "Tên công ty", placeholder: "CÔNG TY ..." },
  { key: "drawingTitle", label: "Tên bản vẽ", placeholder: "Trục truyền động chính" },
  { key: "dwgNo", label: "Số bản vẽ (DWG No.)", placeholder: "ME-2026-DRW-001" },
  { key: "material", label: "Vật liệu", placeholder: "S45C" },
  { key: "scale", label: "Tỷ lệ", placeholder: "1:1" },
  { key: "drawnBy", label: "Người vẽ", placeholder: "Nguyễn Văn A" },
  { key: "checkedBy", label: "Người kiểm tra", placeholder: "Trần Thị B" },
  { key: "date", label: "Ngày", placeholder: "dd/mm/yyyy" },
  { key: "qrValue", label: "Nội dung mã QR", placeholder: "Mã số bản vẽ / link tra cứu" },
];

export default function FrameStep({ page, onFrameChange, onBake }: Props) {
  const [template, setTemplate] = useState<FrameTemplateId>(page.frame.template);
  const [fields, setFields] = useState<TitleBlockFields>(page.frame.fields);
  const [isSaving, setIsSaving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setTemplate(page.frame.template);
    setFields(page.frame.fields);
  }, [page.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!canvasRef.current) return;
      if (template === "none") {
        const img = new window.Image();
        img.onload = () => {
          const c = canvasRef.current!;
          c.width = img.naturalWidth;
          c.height = img.naturalHeight;
          c.getContext("2d")!.drawImage(img, 0, 0);
        };
        img.src = page.workingUrl;
        return;
      }
      const rendered = await composeFrame(page.workingUrl, template, fields);
      const c = canvasRef.current;
      c.width = rendered.width;
      c.height = rendered.height;
      c.getContext("2d")!.drawImage(rendered, 0, 0);
    }, 150);
    return () => clearTimeout(timer);
  }, [page.workingUrl, template, fields]);

  const updateField = (key: keyof TitleBlockFields, value: string) => {
    const next = { ...fields, [key]: value };
    setFields(next);
    onFrameChange(template, next);
  };

  const selectTemplate = (id: FrameTemplateId) => {
    setTemplate(id);
    onFrameChange(id, fields);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (template === "none") return;
      const result = await composeFrameToDataUrl(page.workingUrl, template, fields);
      onBake(result);
      setTemplate("none");
      onFrameChange("none", fields);
    } finally {
      setIsSaving(false);
    }
  };

  const a4 = template !== "none" ? getA4Size(template) : null;

  return (
    <div className="flex flex-col h-full lg:flex-row">
      <div className="w-full lg:w-96 flex-shrink-0 border-r border-white/8 bg-surface overflow-y-auto">
        <div className="p-4 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <FileText size={16} className="text-indigo-400" />
              Khung Mẫu & Khung Tên A4
            </h2>
            <p className="text-xs text-zinc-400 mt-1">Đổi mẫu sẽ cập nhật trực tiếp bản vẽ trên màn hình</p>
          </div>

          <div className="space-y-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => selectTemplate(t.id)}
                className={`w-full flex items-start gap-2.5 rounded-lg border p-2.5 text-left transition-colors ${
                  template === t.id ? "border-indigo-500 bg-indigo-500/10" : "border-white/10 hover:bg-white/5"
                }`}
              >
                <span className="mt-0.5 text-zinc-300">{t.icon}</span>
                <span className="flex-1">
                  <span className="block text-xs font-medium text-zinc-100">{t.label}</span>
                  <span className="block text-[11px] text-zinc-500">{t.desc}</span>
                </span>
                {template === t.id && <Check size={14} className="text-indigo-400 mt-0.5" />}
              </button>
            ))}
          </div>

          {template !== "none" && (
            <div className="space-y-2.5 pt-1 border-t border-white/8">
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide pt-3">
                Thông tin khung tên
              </p>
              {FIELD_DEFS.map((f) => (
                <div key={f.key}>
                  <label className="text-[10px] text-zinc-500 mb-0.5 block">{f.label}</label>
                  <input
                    value={fields[f.key]}
                    placeholder={f.placeholder}
                    onChange={(e) => updateField(f.key, e.target.value)}
                    className="w-full rounded bg-bg border border-white/10 text-xs text-zinc-200 px-2 py-1.5 outline-none focus:border-indigo-500"
                  />
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={isSaving || template === "none"}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 py-2 text-xs font-semibold text-white shadow-[0_4px_12px_-4px_rgba(99,102,241,0.6)]"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Lưu thiết lập khung cho trang này
          </button>
        </div>
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-center bg-surface-2 bg-grid p-6 overflow-auto gap-2">
        <canvas ref={canvasRef} className="max-w-full max-h-full bg-white shadow-2xl rounded-sm" />
        {a4 && (
          <p className="text-[11px] text-zinc-400">
            {TEMPLATES.find((t) => t.id === template)?.desc} · Tỷ lệ hiển thị theo khổ A4 ({a4.width}x{a4.height}px)
          </p>
        )}
      </div>
    </div>
  );
}
