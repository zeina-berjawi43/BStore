// Contract shared with Admin Panel and BStore. Keep the math identical.
export type ImageFrame = { zoom: number; x: number; y: number };
export const DEFAULT_FRAME: ImageFrame = { zoom: 1, x: 0, y: 0 };
export const MAX_ZOOM = 4;
export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function validFrame(value: unknown): value is ImageFrame {
  if (!value || typeof value !== 'object') return false;
  const f = value as ImageFrame;
  return [f.zoom, f.x, f.y].every(n => typeof n === 'number' && Number.isFinite(n)) &&
    f.zoom >= 1 && f.zoom <= MAX_ZOOM && Math.abs(f.x) <= 1 && Math.abs(f.y) <= 1;
}

// x/y are fractions of available travel: -1 = left/top, +1 = right/bottom.
// No screen pixels or source image dimensions are persisted.
export function frameGeometry(iw: number, ih: number, fw: number, fh: number, frame: ImageFrame) {
  const f = validFrame(frame) ? frame : DEFAULT_FRAME;
  const ratio = Math.max(fw / iw, fh / ih) * f.zoom;
  const width = iw * ratio, height = ih * ratio;
  const travelX = Math.max(0, (width - fw) / 2), travelY = Math.max(0, (height - fh) / 2);
  return { width, height, left: -travelX * (1 + f.x), top: -travelY * (1 + f.y), travelX, travelY };
}

export function panFrame(frame: ImageFrame, dx: number, dy: number, travelX: number, travelY: number): ImageFrame {
  return { ...frame,
    x: travelX > 0 ? clamp(frame.x - dx / travelX, -1, 1) : frame.x,
    y: travelY > 0 ? clamp(frame.y - dy / travelY, -1, 1) : frame.y,
  };
}
