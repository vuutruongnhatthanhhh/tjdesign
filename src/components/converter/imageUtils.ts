import { DEFAULT_FRAME } from "./types";
import type { DrawingPage, QualitySettings, RectCrop } from "./types";

let idCounter = 0;
export function genId(): string {
  idCounter += 1;
  return `pg-${Date.now().toString(36)}-${idCounter}`;
}

export function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function renderPdfPagesToDataUrls(file: File): Promise<string[]> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const urls: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.5 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    urls.push(canvas.toDataURL("image/png"));
  }

  return urls;
}

/** Chuyển danh sách file (PDF nhiều trang hoặc ảnh) thành danh sách trang bản vẽ */
export async function filesToPages(
  files: File[],
  defaultQuality: QualitySettings
): Promise<DrawingPage[]> {
  const pages: DrawingPage[] = [];

  for (const file of files) {
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    const baseName = file.name.replace(/\.[^/.]+$/, "");

    if (isPdf) {
      const urls = await renderPdfPagesToDataUrls(file);
      for (let i = 0; i < urls.length; i++) {
        const img = await loadImageElement(urls[i]);
        pages.push({
          id: genId(),
          name: urls.length > 1 ? `${baseName} - trang ${i + 1}` : baseName,
          originalUrl: urls[i],
          workingUrl: urls[i],
          width: img.naturalWidth,
          height: img.naturalHeight,
          quality: { ...defaultQuality },
          ocrSegments: [],
          annotations: [],
          frame: { ...DEFAULT_FRAME, fields: { ...DEFAULT_FRAME.fields } },
        });
      }
    } else if (file.type.startsWith("image/")) {
      const url = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const img = await loadImageElement(url);
      pages.push({
        id: genId(),
        name: baseName,
        originalUrl: url,
        workingUrl: url,
        width: img.naturalWidth,
        height: img.naturalHeight,
        quality: { ...defaultQuality },
        ocrSegments: [],
        annotations: [],
        frame: { ...DEFAULT_FRAME, fields: { ...DEFAULT_FRAME.fields } },
      });
    }
  }

  return pages;
}

/** Cắt ảnh theo khung chữ nhật (toạ độ % so với kích thước ảnh gốc) */
export async function cropRectToDataUrl(
  srcUrl: string,
  rect: RectCrop
): Promise<{ url: string; width: number; height: number }> {
  const img = await loadImageElement(srcUrl);
  const sx = (rect.x / 100) * img.naturalWidth;
  const sy = (rect.y / 100) * img.naturalHeight;
  const sw = (rect.w / 100) * img.naturalWidth;
  const sh = (rect.h / 100) * img.naturalHeight;

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sw));
  canvas.height = Math.max(1, Math.round(sh));
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

  return { url: canvas.toDataURL("image/png"), width: canvas.width, height: canvas.height };
}

/** Cắt ảnh theo đường vẽ tay tự do (các điểm toạ độ % so với kích thước ảnh gốc) */
export async function cropFreehandToDataUrl(
  srcUrl: string,
  pointsPct: { x: number; y: number }[]
): Promise<{ url: string; width: number; height: number }> {
  const img = await loadImageElement(srcUrl);
  const points = pointsPct.map((p) => ({
    x: (p.x / 100) * img.naturalWidth,
    y: (p.y / 100) * img.naturalHeight,
  }));

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.max(0, Math.min(...xs));
  const minY = Math.max(0, Math.min(...ys));
  const maxX = Math.min(img.naturalWidth, Math.max(...xs));
  const maxY = Math.min(img.naturalHeight, Math.max(...ys));
  const w = Math.max(1, Math.round(maxX - minX));
  const h = Math.max(1, Math.round(maxY - minY));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.beginPath();
  points.forEach((p, i) => {
    const x = p.x - minX;
    const y = p.y - minY;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, -minX, -minY);
  ctx.restore();

  return { url: canvas.toDataURL("image/png"), width: w, height: h };
}

function clamp255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

/** Áp dụng độ sáng/tương phản/thang xám trực tiếp lên ImageData (biến đổi tuyến tính theo điểm ảnh) */
function applyPointAdjustments(data: Uint8ClampedArray, settings: QualitySettings): void {
  const brightness = settings.brightness * 2.55; // -255..255
  const contrastFactor =
    (259 * (settings.contrast * 2.55 + 255)) / (255 * (259 - settings.contrast * 2.55));

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    if (settings.grayscale) {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = g = b = gray;
    }

    r = contrastFactor * (r - 128) + 128 + brightness;
    g = contrastFactor * (g - 128) + 128 + brightness;
    b = contrastFactor * (b - 128) + 128 + brightness;

    data[i] = clamp255(r);
    data[i + 1] = clamp255(g);
    data[i + 2] = clamp255(b);
  }
}

/** Convolve 3x3, dùng chung cho làm mờ (denoise) và làm nét (unsharp mask) */
function convolve3x3(
  src: Uint8ClampedArray,
  width: number,
  height: number,
  kernel: number[]
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(src.length);
  const kw = 3;
  const half = 1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0,
        g = 0,
        b = 0;
      for (let ky = 0; ky < kw; ky++) {
        for (let kx = 0; kx < kw; kx++) {
          const sx = Math.min(width - 1, Math.max(0, x + kx - half));
          const sy = Math.min(height - 1, Math.max(0, y + ky - half));
          const si = (sy * width + sx) * 4;
          const kv = kernel[ky * kw + kx];
          r += src[si] * kv;
          g += src[si + 1] * kv;
          b += src[si + 2] * kv;
        }
      }
      const di = (y * width + x) * 4;
      out[di] = clamp255(r);
      out[di + 1] = clamp255(g);
      out[di + 2] = clamp255(b);
      out[di + 3] = src[di + 3];
    }
  }

  return out;
}

const BLUR_KERNEL = [1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9];

/** Vẽ ảnh nguồn vào canvas đích và áp toàn bộ bộ lọc chất lượng (dùng cho preview lẫn xuất ảnh) */
export async function renderQualityToCanvas(
  srcUrl: string,
  settings: QualitySettings,
  targetCanvas: HTMLCanvasElement,
  maxDim?: number
): Promise<void> {
  const img = await loadImageElement(srcUrl);
  let w = img.naturalWidth;
  let h = img.naturalHeight;

  if (maxDim && Math.max(w, h) > maxDim) {
    const scale = maxDim / Math.max(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }

  targetCanvas.width = w;
  targetCanvas.height = h;
  const ctx = targetCanvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);

  const hasAdjustments =
    settings.brightness !== 0 ||
    settings.contrast !== 0 ||
    settings.sharpness !== 0 ||
    settings.denoise !== 0 ||
    settings.grayscale;

  if (!hasAdjustments) return;

  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  if (settings.denoise > 0) {
    const blurred = convolve3x3(data, w, h, BLUR_KERNEL);
    const amount = settings.denoise / 100;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = data[i] * (1 - amount) + blurred[i] * amount;
      data[i + 1] = data[i + 1] * (1 - amount) + blurred[i + 1] * amount;
      data[i + 2] = data[i + 2] * (1 - amount) + blurred[i + 2] * amount;
    }
  }

  if (settings.sharpness > 0) {
    const blurred = convolve3x3(data, w, h, BLUR_KERNEL);
    const amount = settings.sharpness / 100;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = clamp255(data[i] + (data[i] - blurred[i]) * amount * 2);
      data[i + 1] = clamp255(data[i + 1] + (data[i + 1] - blurred[i + 1]) * amount * 2);
      data[i + 2] = clamp255(data[i + 2] + (data[i + 2] - blurred[i + 2]) * amount * 2);
    }
  }

  applyPointAdjustments(data, settings);

  ctx.putImageData(imageData, 0, 0);
}

export async function renderQualityToDataUrl(
  srcUrl: string,
  settings: QualitySettings
): Promise<string> {
  const canvas = document.createElement("canvas");
  await renderQualityToCanvas(srcUrl, settings, canvas);
  return canvas.toDataURL("image/png");
}
