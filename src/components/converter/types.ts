export interface QualitySettings {
  brightness: number; // -100..100
  contrast: number; // -100..100
  sharpness: number; // 0..100
  denoise: number; // 0..100
  grayscale: boolean;
}

export const DEFAULT_QUALITY: QualitySettings = {
  brightness: 0,
  contrast: 0,
  sharpness: 0,
  denoise: 0,
  grayscale: false,
};

/** Một đoạn chữ phát hiện được qua OCR, toạ độ bbox tính theo % kích thước ảnh trang */
export interface OcrSegment {
  id: string;
  text: string;
  translated: string;
  bbox: { x: number; y: number; w: number; h: number };
  applied: boolean;
  /** Cỡ chữ khi vẽ lên ảnh, tính theo px thực của ảnh gốc. Bỏ trống = tự canh vừa khung bbox */
  fontSize?: number;
}

export type AnnotationTool =
  | "select"
  | "text"
  | "line"
  | "arrow"
  | "rect"
  | "circle"
  | "pencil"
  | "eraser";

interface AnnotationBase {
  id: string;
  color: string;
  strokeWidth: number;
}

export interface TextAnnotation extends AnnotationBase {
  type: "text";
  x: number; // % toạ độ trên ảnh
  y: number;
  text: string;
  fontSize: number; // % theo chiều cao ảnh
}

export interface LineAnnotation extends AnnotationBase {
  type: "line" | "arrow";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface RectAnnotation extends AnnotationBase {
  type: "rect";
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CircleAnnotation extends AnnotationBase {
  type: "circle";
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export interface PencilAnnotation extends AnnotationBase {
  type: "pencil";
  points: { x: number; y: number }[];
}

export type Annotation =
  | TextAnnotation
  | LineAnnotation
  | RectAnnotation
  | CircleAnnotation
  | PencilAnnotation;

export interface TitleBlockFields {
  companyName: string;
  drawingTitle: string;
  dwgNo: string;
  material: string;
  scale: string;
  drawnBy: string;
  checkedBy: string;
  date: string;
  qrValue: string;
}

export const DEFAULT_TITLE_BLOCK: TitleBlockFields = {
  companyName: "",
  drawingTitle: "",
  dwgNo: "",
  material: "",
  scale: "1:1",
  drawnBy: "",
  checkedBy: "",
  date: "",
  qrValue: "",
};

export type FrameTemplateId = "none" | "a4-landscape" | "a4-portrait";

export interface FrameSettings {
  template: FrameTemplateId;
  fields: TitleBlockFields;
}

export const DEFAULT_FRAME: FrameSettings = {
  template: "none",
  fields: DEFAULT_TITLE_BLOCK,
};

export interface DrawingPage {
  id: string;
  name: string;
  /** Ảnh gốc khi vừa tải lên / render từ PDF, không bao giờ bị ghi đè */
  originalUrl: string;
  /** Ảnh đang làm việc (sau khi crop/chỉnh chất lượng/áp dịch/vẽ), là đầu vào cho bước kế tiếp */
  workingUrl: string;
  width: number;
  height: number;
  quality: QualitySettings;
  ocrSegments: OcrSegment[];
  annotations: Annotation[];
  frame: FrameSettings;
}

export type CropTool = "rect" | "freehand";

export interface RectCrop {
  x: number; // % theo chiều rộng ảnh hiển thị
  y: number; // % theo chiều cao ảnh hiển thị
  w: number;
  h: number;
}

export const STEP_DEFS = [
  { id: 1, label: "Crop bản vẽ" },
  { id: 2, label: "Chất lượng ảnh" },
  { id: 3, label: "OCR & Dịch" },
  { id: 4, label: "Biên tập & Vẽ" },
  { id: 5, label: "Khung mẫu A4" },
  { id: 6, label: "Xuất file" },
] as const;

export type StepId = (typeof STEP_DEFS)[number]["id"];
