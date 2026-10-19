import type { OcrSegment } from "./types";
import { loadImageElement } from "./imageUtils";

let segCounter = 0;
function genSegId(): string {
  segCounter += 1;
  return `seg-${Date.now().toString(36)}-${segCounter}`;
}

interface TesseractLine {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

export interface OcrProgress {
  status: string;
  progress: number;
}

/** Chạy OCR tesseract.js trên ảnh, trả về danh sách đoạn chữ theo dòng kèm bbox (% theo kích thước ảnh) */
export async function runOcr(
  imageUrl: string,
  lang: string,
  onProgress?: (p: OcrProgress) => void
): Promise<OcrSegment[]> {
  const img = await loadImageElement(imageUrl);
  const { createWorker } = await import("tesseract.js");

  const worker = await createWorker(lang, undefined, {
    logger: (m: { status: string; progress: number }) => {
      onProgress?.({ status: m.status, progress: m.progress });
    },
  });

  const { data } = await worker.recognize(imageUrl, {}, { blocks: true });
  await worker.terminate();

  const segments: OcrSegment[] = [];
  const blocks = data.blocks ?? [];

  for (const block of blocks) {
    for (const paragraph of block.paragraphs ?? []) {
      for (const line of (paragraph.lines ?? []) as TesseractLine[]) {
        const text = line.text.trim();
        if (!text) continue;
        const bw = line.bbox.x1 - line.bbox.x0;
        const bh = line.bbox.y1 - line.bbox.y0;
        if (bw <= 0 || bh <= 0) continue;

        segments.push({
          id: genSegId(),
          text,
          translated: "",
          bbox: {
            x: (line.bbox.x0 / img.naturalWidth) * 100,
            y: (line.bbox.y0 / img.naturalHeight) * 100,
            w: (bw / img.naturalWidth) * 100,
            h: (bh / img.naturalHeight) * 100,
          },
          applied: false,
        });
      }
    }
  }

  return segments;
}

/** Dịch văn bản qua Google Translate (endpoint công khai, không cần API key) */
export async function translateText(text: string, targetLang: string): Promise<string> {
  if (!text.trim()) return "";
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(
    text
  )}`;
  const res = await fetch(url);
  const data = await res.json();
  return (data[0] as [string][]).map((item) => item[0]).join("");
}

function fitFontSize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxHeight: number): number {
  let size = Math.max(6, Math.floor(maxHeight * 0.85));
  ctx.font = `${size}px Arial`;
  while (size > 6 && ctx.measureText(text).width > maxWidth) {
    size -= 1;
    ctx.font = `${size}px Arial`;
  }
  return size;
}

/**
 * Xoá trắng vùng bbox của các đoạn đã áp dụng và vẽ đè bản dịch lên đúng vị trí.
 * Thực hiện theo 2 lượt (xoá trắng tất cả rồi mới vẽ chữ) để tránh đè lên nhau khi các bbox gần nhau.
 */
export async function applySegmentsToImage(
  srcUrl: string,
  segments: OcrSegment[]
): Promise<string> {
  const img = await loadImageElement(srcUrl);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);

  const toApply = segments.filter((s) => s.applied && s.translated.trim());

  const plans = toApply.map((seg) => {
    const bx = (seg.bbox.x / 100) * canvas.width;
    const by = (seg.bbox.y / 100) * canvas.height;
    const bw = (seg.bbox.w / 100) * canvas.width;
    const bh = (seg.bbox.h / 100) * canvas.height;

    const fontSize = seg.fontSize ?? fitFontSize(ctx, seg.translated, bw, bh);
    ctx.font = `${fontSize}px Arial`;
    const textW = ctx.measureText(seg.translated).width;

    const w = Math.max(bw, textW);
    const h = Math.max(bh, fontSize * 1.15);
    return { seg, x: bx, y: by, w, h, fontSize };
  });

  for (const p of plans) {
    const pad = p.h * 0.15;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(p.x - pad, p.y - pad, p.w + pad * 2, p.h + pad * 2);
  }

  ctx.fillStyle = "#000000";
  ctx.textBaseline = "top";
  for (const p of plans) {
    ctx.font = `${p.fontSize}px Arial`;
    ctx.fillText(p.seg.translated, p.x, p.y + (p.h - p.fontSize) / 2);
  }

  return canvas.toDataURL("image/png");
}
