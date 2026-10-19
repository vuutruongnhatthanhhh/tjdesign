import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "TJDesign — Chuyển đổi & biên tập bản vẽ kỹ thuật",
    template: "%s · TJDesign",
  },
  description:
    "TJDesign giúp crop, nâng chất lượng, OCR & dịch, biên tập và đóng khung A4 cho bản vẽ kỹ thuật từ PDF hoặc ảnh scan — xử lý hoàn toàn trên trình duyệt, không cần tài khoản.",
};

export const viewport: Viewport = {
  themeColor: "#0a0c16",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--bg)] text-[var(--text)]">{children}</body>
    </html>
  );
}
