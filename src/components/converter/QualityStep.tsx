"use client";

import { useEffect, useRef, useState } from "react";
import {
  Sun,
  Contrast,
  Sparkles,
  ShieldCheck,
  Eye,
  RefreshCcw,
  Check,
  Loader2,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { renderQualityToCanvas, renderQualityToDataUrl } from "./imageUtils";
import { DEFAULT_QUALITY, type DrawingPage, type QualitySettings } from "./types";

interface Props {
  page: DrawingPage;
  onQualityChange: (settings: QualitySettings) => void;
  onSaveForPage: (bakedUrl: string) => void;
}

const PRESETS: { label: string; hint: string; icon: React.ReactNode; apply: Partial<QualitySettings> }[] = [
  {
    label: "Nâng cao bản scan mờ",
    hint: "+Nét +Tương phản",
    icon: <Sparkles size={14} />,
    apply: { brightness: 8, contrast: 30, sharpness: 45, denoise: 10, grayscale: false },
  },
  {
    label: "Làm nét đường CAD",
    hint: "Nét cực đại",
    icon: <Contrast size={14} />,
    apply: { brightness: 0, contrast: 20, sharpness: 100, denoise: 0, grayscale: false },
  },
  {
    label: "Lọc nền trắng đen",
    hint: "Thang xám",
    icon: <ShieldCheck size={14} />,
    apply: { brightness: 5, contrast: 45, sharpness: 20, denoise: 15, grayscale: true },
  },
];

export default function QualityStep({ page, onQualityChange, onSaveForPage }: Props) {
  const [settings, setSettings] = useState<QualitySettings>(page.quality);
  const [comparing, setComparing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTokenRef = useRef(0);

  useEffect(() => {
    setSettings(page.quality);
  }, [page.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const token = ++renderTokenRef.current;
    const timer = setTimeout(() => {
      if (!canvasRef.current) return;
      renderQualityToCanvas(page.workingUrl, settings, canvasRef.current, 1800).then(() => {
        if (renderTokenRef.current !== token) return;
      });
    }, 60);
    return () => clearTimeout(timer);
  }, [page.workingUrl, settings]);

  const update = (patch: Partial<QualitySettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    onQualityChange(next);
  };

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    update(preset.apply);
  };

  const handleReset = () => {
    update(DEFAULT_QUALITY);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const bakedUrl = await renderQualityToDataUrl(page.workingUrl, settings);
      onSaveForPage(bakedUrl);
      setSettings(DEFAULT_QUALITY);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full lg:flex-row">
      <div className="w-full lg:w-80 flex-shrink-0 border-r border-white/8 bg-surface overflow-y-auto">
        <div className="p-4 space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sparkles size={16} className="text-indigo-400" />
              Chất lượng hiển thị ảnh scan
            </h2>
            <p className="text-xs text-zinc-400 mt-1">Làm rõ bản vẽ bị mờ, nhiễu</p>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-zinc-400 mb-2 uppercase tracking-wide">
              Mẫu tinh chỉnh nhanh
            </p>
            <div className="space-y-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => applyPreset(preset)}
                  className="w-full flex items-center justify-between gap-2 rounded-lg border border-white/10 hover:border-indigo-500/60 hover:bg-white/5 px-3 py-2 text-left transition-colors"
                >
                  <span className="flex items-center gap-2 text-xs font-medium text-zinc-200">
                    {preset.icon}
                    {preset.label}
                  </span>
                  <span className="text-[10px] text-zinc-500">{preset.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <SliderRow
            icon={<Sun size={14} />}
            label="Độ sáng (Brightness)"
            value={settings.brightness}
            min={-100}
            max={100}
            onChange={(v) => update({ brightness: v })}
          />
          <SliderRow
            icon={<Contrast size={14} />}
            label="Độ tương phản (Contrast)"
            value={settings.contrast}
            min={-100}
            max={100}
            onChange={(v) => update({ contrast: v })}
          />
          <SliderRow
            icon={<Sparkles size={14} />}
            label="Độ sắc nét (Sharpness)"
            value={settings.sharpness}
            min={0}
            max={100}
            suffix="%"
            hint="Làm nổi bật nét vẽ, số kích thước và đường bao chi tiết."
            onChange={(v) => update({ sharpness: v })}
          />
          <SliderRow
            icon={<ShieldCheck size={14} />}
            label="Giảm nhiễu scan (Denoise)"
            value={settings.denoise}
            min={0}
            max={100}
            suffix="%"
            hint="Lọc các vết bụi giấy, chấm đen ngẫu nhiên từ bản scan."
            onChange={(v) => update({ denoise: v })}
          />

          <div className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2">
            <span className="text-xs font-medium text-zinc-200">Chuyển sang thang xám (Grayscale)</span>
            <Switch
              checked={settings.grayscale}
              onCheckedChange={(v: boolean) => update({ grayscale: v })}
            />
          </div>

          <button
            onPointerDown={() => setComparing(true)}
            onPointerUp={() => setComparing(false)}
            onPointerLeave={() => setComparing(false)}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-white/10 py-2 text-xs font-medium text-zinc-300 hover:bg-white/5 select-none"
          >
            <Eye size={14} />
            Nhấn giữ để so sánh ảnh gốc
          </button>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleReset}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-white/10 py-2 text-xs font-medium text-zinc-300 hover:bg-white/5"
            >
              <RefreshCcw size={14} />
              Mặc định
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 py-2 text-xs font-semibold text-white shadow-[0_4px_12px_-4px_rgba(99,102,241,0.6)]"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Lưu cho trang
            </button>
          </div>
        </div>
      </div>

      <div className="relative flex-1 flex items-center justify-center bg-surface-2 bg-grid p-6 overflow-auto">
        <canvas
          ref={canvasRef}
          className={`max-w-full max-h-full bg-white shadow-2xl rounded-sm ${comparing ? "hidden" : ""}`}
        />
        {comparing && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={page.workingUrl}
            alt="Ảnh gốc"
            className="max-w-full max-h-full bg-white shadow-2xl rounded-sm"
          />
        )}
        {comparing && (
          <span className="absolute top-3 left-3 bg-black/70 text-white text-[11px] px-2 py-1 rounded">
            Ảnh gốc (trước chỉnh)
          </span>
        )}
      </div>
    </div>
  );
}

function SliderRow({
  icon,
  label,
  value,
  min,
  max,
  suffix = "",
  hint,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  hint?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-200">
          {icon}
          {label}
        </span>
        <span className="text-xs text-zinc-400">
          {value}
          {suffix}
        </span>
      </div>
      <Slider value={[value]} min={min} max={max} step={1} onValueChange={(v) => onChange(v[0])} />
      {hint && <p className="text-[10px] text-zinc-500 mt-1">{hint}</p>}
    </div>
  );
}
