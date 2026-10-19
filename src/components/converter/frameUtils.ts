import type { FrameTemplateId, TitleBlockFields } from "./types";
import { loadImageElement } from "./imageUtils";

// A4 ở 150 DPI
const DPI = 150;
const A4_SHORT = Math.round(8.27 * DPI); // 1240
const A4_LONG = Math.round(11.69 * DPI); // 1754

export function getA4Size(template: FrameTemplateId): { width: number; height: number } {
  if (template === "a4-landscape") return { width: A4_LONG, height: A4_SHORT };
  return { width: A4_SHORT, height: A4_LONG };
}

function drawBorderAndRefGrid(ctx: CanvasRenderingContext2D, width: number, height: number, margin: number) {
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = Math.max(1, width * 0.0015);
  ctx.strokeRect(margin, margin * 0.5, width - margin - margin * 0.5, height - margin - margin * 1.0);

  const left = margin;
  const top = margin * 0.5;
  const right = width - margin * 0.5;
  const bottom = height - margin * 0.5;
  const innerW = right - left;
  const innerH = bottom - top;

  const cols = 4;
  const rows = 4;
  ctx.font = `${Math.round(width * 0.011)}px Arial`;
  ctx.fillStyle = "#000000";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let i = 0; i < cols; i++) {
    const cx = left + (innerW / cols) * (i + 0.5);
    ctx.fillText(String(i + 1), cx, top - margin * 0.22);
    ctx.fillText(String(i + 1), cx, bottom + margin * 0.3);
  }
  const letters = ["A", "B", "C", "D"];
  for (let i = 0; i < rows; i++) {
    const cy = top + (innerH / rows) * (i + 0.5);
    ctx.fillText(letters[i], left - margin * 0.45, cy);
    ctx.fillText(letters[i], right + margin * 0.3, cy);
  }
}

async function drawTitleBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fields: TitleBlockFields
) {
  ctx.save();
  ctx.strokeStyle = "#000000";
  ctx.fillStyle = "#ffffff";
  ctx.lineWidth = Math.max(1, w * 0.0015);
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);

  const qrSize = h * 0.92;
  let qrDataUrl: string | null = null;
  if (fields.qrValue.trim()) {
    try {
      const QRCode = (await import("qrcode")).default;
      qrDataUrl = await QRCode.toDataURL(fields.qrValue, { margin: 0, width: 256 });
    } catch {
      qrDataUrl = null;
    }
  }

  const qrX = x + w - qrSize - h * 0.04;
  const qrY = y + h * 0.04;
  if (qrDataUrl) {
    const qrImg = await loadImageElement(qrDataUrl);
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
    ctx.strokeRect(qrX, qrY, qrSize, qrSize);
  }

  const leftColW = w * 0.32;
  ctx.beginPath();
  ctx.moveTo(x + leftColW, y);
  ctx.lineTo(x + leftColW, y + h);
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  const pad = h * 0.08;
  const titleFont = Math.round(h * 0.13);
  const labelFont = Math.round(h * 0.09);

  ctx.font = `bold ${titleFont}px Arial`;
  ctx.fillStyle = "#000000";
  wrapText(ctx, fields.companyName || "Tên công ty", x + pad, y + pad, leftColW - pad * 2, titleFont * 1.15, 2);

  ctx.font = `${labelFont}px Arial`;
  ctx.fillText(fields.drawingTitle || "Tên bản vẽ", x + pad, y + h * 0.55);
  ctx.fillText(`DWG: ${fields.dwgNo || "-"}`, x + pad, y + h * 0.78);

  const rightX = x + leftColW + pad;
  const rightW = w - leftColW - pad * 2 - qrSize - h * 0.08;
  const col2 = rightX + rightW * 0.5;
  ctx.font = `${labelFont}px Arial`;
  ctx.fillText(`Vật liệu: ${fields.material || "-"}`, rightX, y + pad);
  ctx.fillText(`Tỷ lệ: ${fields.scale || "-"}`, col2, y + pad);
  ctx.fillText(`Người vẽ: ${fields.drawnBy || "-"}`, rightX, y + h * 0.4);
  ctx.fillText(`Kiểm tra: ${fields.checkedBy || "-"}`, col2, y + h * 0.4);
  ctx.fillText(`Ngày: ${fields.date || "-"}`, rightX, y + h * 0.7);

  ctx.restore();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
) {
  const words = text.split(" ");
  let line = "";
  let lines = 0;
  for (let i = 0; i < words.length && lines < maxLines; i++) {
    const test = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y + lines * lineHeight);
      line = words[i];
      lines++;
    } else {
      line = test;
    }
  }
  if (lines < maxLines) ctx.fillText(line, x, y + lines * lineHeight);
}

/** Dựng ảnh bản vẽ + khung A4 + khung tên lên 1 canvas, trả về canvas đã vẽ xong */
export async function composeFrame(
  srcUrl: string,
  template: FrameTemplateId,
  fields: TitleBlockFields
): Promise<HTMLCanvasElement> {
  const { width, height } = getA4Size(template);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const margin = width * 0.045;
  const titleBlockH = height * 0.13;

  drawBorderAndRefGrid(ctx, width, height, margin);

  const contentLeft = margin + width * 0.01;
  const contentTop = margin * 0.5 + height * 0.01;
  const contentRight = width - margin * 0.5 - width * 0.01;
  const contentBottom = height - margin * 0.5 - titleBlockH - height * 0.015;
  const contentW = contentRight - contentLeft;
  const contentH = contentBottom - contentTop;

  const img = await loadImageElement(srcUrl);
  const scale = Math.min(contentW / img.naturalWidth, contentH / img.naturalHeight);
  const drawW = img.naturalWidth * scale;
  const drawH = img.naturalHeight * scale;
  const drawX = contentLeft + (contentW - drawW) / 2;
  const drawY = contentTop + (contentH - drawH) / 2;
  ctx.drawImage(img, drawX, drawY, drawW, drawH);

  await drawTitleBlock(
    ctx,
    margin,
    height - margin * 0.5 - titleBlockH,
    width - margin - margin * 0.5,
    titleBlockH,
    fields
  );

  return canvas;
}

export async function composeFrameToDataUrl(
  srcUrl: string,
  template: FrameTemplateId,
  fields: TitleBlockFields
): Promise<{ url: string; width: number; height: number }> {
  const canvas = await composeFrame(srcUrl, template, fields);
  return { url: canvas.toDataURL("image/png"), width: canvas.width, height: canvas.height };
}
