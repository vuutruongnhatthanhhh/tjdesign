import Link from "next/link";
import {
  ArrowRight,
  Crop,
  Sparkles,
  ScanText,
  PenLine,
  FileText,
  Download,
  ShieldCheck,
  Zap,
  Lock,
} from "lucide-react";
import Logo from "@/components/brand/Logo";

const FEATURES = [
  {
    icon: Crop,
    title: "Crop chính xác",
    desc: "Cắt khung bản vẽ theo hình chữ nhật hoặc vẽ tay tự do (lasso), loại bỏ phần thừa ngoài khung.",
  },
  {
    icon: Sparkles,
    title: "Nâng chất lượng ảnh",
    desc: "Chỉnh sáng/tương phản, làm nét đường CAD, giảm nhiễu bản scan, chuyển thang xám — có sẵn mẫu tinh chỉnh nhanh.",
  },
  {
    icon: ScanText,
    title: "OCR & Dịch thuật",
    desc: "Nhận dạng chữ trong bản vẽ (toàn trang hoặc theo vùng chọn) và dịch sang nhiều ngôn ngữ, đè trực tiếp lên ảnh.",
  },
  {
    icon: PenLine,
    title: "Biên tập & Vẽ",
    desc: "Chèn chữ, mũi tên, hình khối, vẽ tay hoặc tẩy ghi chú ngay trên bản vẽ với công cụ chọn màu và độ dày nét.",
  },
  {
    icon: FileText,
    title: "Khung tên A4 chuẩn",
    desc: "Đóng khung A4 ngang/dọc với khung tên kỹ thuật đầy đủ: công ty, số bản vẽ, vật liệu, tỷ lệ, mã QR tra cứu.",
  },
  {
    icon: Download,
    title: "Xuất đa định dạng",
    desc: "Xuất PNG, gộp nhiều trang thành PDF hoặc ZIP, và lưu/mở lại toàn bộ dự án dưới dạng file JSON.",
  },
];

const TRUST = [
  { icon: Lock, label: "Không cần tài khoản" },
  { icon: ShieldCheck, label: "Xử lý ngay trên trình duyệt" },
  { icon: Zap, label: "Không giới hạn số lần dùng" },
];

export default function Home() {
  return (
    <div className="flex-1 bg-bg relative overflow-x-hidden">
      {/* ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[560px] w-[900px] rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="absolute top-60 -right-40 h-[400px] w-[400px] rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      {/* nav */}
      <header className="relative z-10 mx-auto max-w-6xl px-6 py-6 flex items-center justify-between">
        <Logo size={34} />
        <Link
          href="/converter"
          className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-white/8 transition-colors"
        >
          Mở công cụ
          <ArrowRight size={15} />
        </Link>
      </header>

      {/* hero */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pt-16 pb-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-zinc-300 mb-6">
          <Sparkles size={13} className="text-amber-400" />
          Công cụ xử lý bản vẽ kỹ thuật — chạy hoàn toàn trên trình duyệt
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-[1.1]">
          Biến bản scan mờ thành
          <br />
          <span className="gradient-text">bản vẽ sẵn sàng để in</span>
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-base sm:text-lg text-zinc-400 leading-relaxed">
          TJDesign giúp bạn crop, làm nét, OCR &amp; dịch chữ, ghi chú và đóng khung A4 chuẩn kỹ thuật cho bản vẽ
          từ PDF hoặc ảnh scan — chỉ trong vài bước, không cần cài đặt hay tạo tài khoản.
        </p>
        <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/converter"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 px-7 py-3.5 text-sm font-semibold text-white shadow-[0_8px_24px_-6px_rgba(99,102,241,0.6)] transition-all"
          >
            Bắt đầu chuyển đổi bản vẽ
            <ArrowRight size={16} />
          </Link>
          <span className="text-xs text-zinc-500">Hỗ trợ PDF nhiều trang · JPG · PNG · BMP · TIFF · WEBP</span>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-5">
          {TRUST.map((t) => (
            <div key={t.label} className="flex items-center gap-1.5 text-xs text-zinc-400">
              <t.icon size={14} className="text-emerald-400" />
              {t.label}
            </div>
          ))}
        </div>
      </section>

      {/* preview frame */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 pb-20">
        <div className="glass-panel rounded-2xl p-2 shadow-2xl">
          <div className="rounded-xl bg-surface-2 bg-grid border border-white/8 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/8 bg-surface">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
              <span className="ml-3 text-[11px] text-zinc-500">tjdesign.app/converter</span>
            </div>
            <div className="flex items-center justify-center py-16 sm:py-24">
              <div className="flex items-center gap-6 text-zinc-600">
                <Crop size={28} />
                <Sparkles size={28} />
                <ScanText size={28} />
                <PenLine size={28} />
                <FileText size={28} />
                <Download size={28} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* features */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-24">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">6 bước xử lý, một luồng duy nhất</h2>
          <p className="mt-2 text-sm text-zinc-400">Từ file scan thô đến bản vẽ hoàn chỉnh, sẵn sàng in ấn hoặc lưu hồ sơ.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group rounded-xl border border-white/8 bg-surface hover:border-indigo-500/40 p-5 transition-colors"
            >
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500/20 to-sky-500/20 text-indigo-300 mb-4 group-hover:from-indigo-500/30 group-hover:to-sky-500/30 transition-colors">
                <f.icon size={18} />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1.5">{f.title}</h3>
              <p className="text-[13px] text-zinc-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* footer */}
      <footer className="relative z-10 border-t border-white/8">
        <div className="mx-auto max-w-6xl px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo size={24} />
          <p className="text-xs text-zinc-500 text-center sm:text-right">
            Mọi xử lý diễn ra trên trình duyệt của bạn — không lưu trữ hay tải file lên máy chủ.
          </p>
        </div>
      </footer>
    </div>
  );
}
