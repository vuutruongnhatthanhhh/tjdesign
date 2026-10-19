import type { Annotation } from "./types";

let annCounter = 0;
export function genAnnId(): string {
  annCounter += 1;
  return `ann-${Date.now().toString(36)}-${annCounter}`;
}

function pctX(v: number, w: number) {
  return (v / 100) * w;
}
function pctY(v: number, h: number) {
  return (v / 100) * h;
}

function drawArrowHead(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, size: number) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - size * Math.cos(angle - Math.PI / 7), y2 - size * Math.sin(angle - Math.PI / 7));
  ctx.lineTo(x2 - size * Math.cos(angle + Math.PI / 7), y2 - size * Math.sin(angle + Math.PI / 7));
  ctx.closePath();
  ctx.fill();
}

/** Vẽ toàn bộ chú thích (text/line/arrow/rect/circle/pencil) lên canvas đã có sẵn ảnh nền */
export function renderAnnotationsToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  annotations: Annotation[]
): void {
  for (const ann of annotations) {
    ctx.strokeStyle = ann.color;
    ctx.fillStyle = ann.color;
    ctx.lineWidth = (ann.strokeWidth / 100) * Math.min(width, height);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    if (ann.type === "text") {
      const fontPx = Math.max(8, (ann.fontSize / 100) * height);
      ctx.font = `${fontPx}px Arial`;
      ctx.textBaseline = "top";
      ctx.fillText(ann.text, pctX(ann.x, width), pctY(ann.y, height));
    } else if (ann.type === "line" || ann.type === "arrow") {
      const x1 = pctX(ann.x1, width);
      const y1 = pctY(ann.y1, height);
      const x2 = pctX(ann.x2, width);
      const y2 = pctY(ann.y2, height);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      if (ann.type === "arrow") {
        drawArrowHead(ctx, x1, y1, x2, y2, Math.max(8, ctx.lineWidth * 3));
      }
    } else if (ann.type === "rect") {
      ctx.strokeRect(pctX(ann.x, width), pctY(ann.y, height), pctX(ann.w, width), pctY(ann.h, height));
    } else if (ann.type === "circle") {
      ctx.beginPath();
      ctx.ellipse(
        pctX(ann.cx, width),
        pctY(ann.cy, height),
        Math.max(1, pctX(ann.rx, width)),
        Math.max(1, pctY(ann.ry, height)),
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    } else if (ann.type === "pencil") {
      if (ann.points.length < 2) continue;
      ctx.beginPath();
      ann.points.forEach((p, i) => {
        const x = pctX(p.x, width);
        const y = pctY(p.y, height);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
  }
}

/** Vẽ ảnh nguồn + toàn bộ chú thích vào 1 canvas mới, trả về dataURL */
export async function bakeAnnotationsToDataUrl(
  srcUrl: string,
  annotations: Annotation[]
): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new window.Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = srcUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  renderAnnotationsToCanvas(ctx, canvas.width, canvas.height, annotations);

  return canvas.toDataURL("image/png");
}
