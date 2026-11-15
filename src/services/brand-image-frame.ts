import { frameGeometry, validFrame, type ImageFrame } from './image-frame';

// Brand v2 is separate from Product framing. Older clients see no zoom and
// safely show the original logo instead of interpreting scale as a cover crop.
export type ContainedBrandFrame = { version: 2; scale: number; x: number; y: number };
export type BrandFrame = ImageFrame | ContainedBrandFrame;
export const DEFAULT_BRAND_FRAME: ContainedBrandFrame = { version: 2, scale: 1, x: 0, y: 0 };
export function containedBrandFrame(value: unknown): value is ContainedBrandFrame {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const f = value as ContainedBrandFrame;
  return f.version === 2 && Object.keys(f).every(key => ['version', 'scale', 'x', 'y'].includes(key)) &&
    [f.scale, f.x, f.y].every(n => typeof n === 'number' && Number.isFinite(n)) &&
    f.scale >= 1 && f.scale <= 4 && Math.abs(f.x) <= 1 && Math.abs(f.y) <= 1;
}
export const validBrandFrame = (value: unknown): value is BrandFrame => containedBrandFrame(value) || (validFrame(value) && !Object.hasOwn(value, 'version'));
export const copyBrandFrame = (frame: BrandFrame): BrandFrame => containedBrandFrame(frame)
  ? { version: 2, scale: frame.scale, x: frame.x, y: frame.y }
  : { zoom: frame.zoom, x: frame.x, y: frame.y };
export function brandFrameGeometry(iw: number, ih: number, fw: number, fh: number, frame: BrandFrame) {
  if (!containedBrandFrame(frame)) return frameGeometry(iw, ih, fw, fh, frame);
  const ratio = Math.min(fw / iw, fh / ih) * .7 * frame.scale;
  const width = iw * ratio, height = ih * ratio;
  // Positive travel supports dragging both smaller and larger logos consistently.
  const travelX = Math.abs(width - fw) / 2, travelY = Math.abs(height - fh) / 2;
  return { width, height, left: (fw - width) / 2 - travelX * frame.x,
    top: (fh - height) / 2 - travelY * frame.y, travelX, travelY };
}
