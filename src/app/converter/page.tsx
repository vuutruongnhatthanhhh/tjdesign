import type { Metadata } from "next";
import DrawingConverter from "@/components/converter/DrawingConverter";

export const metadata: Metadata = {
  title: "Chuyển đổi bản vẽ",
  description: "Crop, nâng chất lượng, OCR & dịch, biên tập và đóng khung A4 cho bản vẽ kỹ thuật từ PDF / ảnh scan.",
};

export default function ConverterPage() {
  return <DrawingConverter />;
}
