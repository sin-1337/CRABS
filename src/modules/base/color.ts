/**
 * CRABS Color & Accessibility Utilities
 *
 * Shared 1x1 canvas context, brightness analysis, and contrast outline generation.
 *
 * @module base/color
 */

/** Shared Static Canvas Resources to prevent multi-instance memory leaks */
const colorBrightnessCache = new Map<string, number>();
const colorCanvas: HTMLCanvasElement = document.createElement("canvas");
export const canvasContext: CanvasRenderingContext2D | null =
  colorCanvas.getContext("2d", { willReadFrequently: true });

/**
 * Converts a hex color string into an RGBA CSS string.
 *
 * @param hex - Hex color string (#RRGGBB or RRGGBB).
 * @param alpha - Opacity value between 0.0 and 1.0.
 * @returns Formatted `rgba(...)` string.
 */
export function convertColor(hex: string, alpha: number = 0): string {
  const cleanHex = hex.replace(/^#/, "");
  const red = parseInt(cleanHex.slice(0, 2), 16);
  const green = parseInt(cleanHex.slice(2, 4), 16);
  const blue = parseInt(cleanHex.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

/**
 * Evaluates the perceived luminance (brightness) of a CSS color string using the ITU-R BT.601 formula.
 *
 * @param color - CSS color string or hex value.
 * @returns Brightness metric ranging from 0 (black) to 255 (white).
 */
export function getColorBrightness(color: string): number {
  if (!color) return 255;
  if (colorBrightnessCache.has(color)) return colorBrightnessCache.get(color)!;
  if (!canvasContext) return 255;

  try {
    let validColor = color.trim();
    if (/^[0-9A-F]{6}$/i.test(validColor)) {
      validColor = `#${validColor}`;
    }

    colorCanvas.width = 1;
    colorCanvas.height = 1;
    canvasContext.clearRect(0, 0, 1, 1);
    canvasContext.fillStyle = validColor;
    canvasContext.fillRect(0, 0, 1, 1);

    const data = canvasContext.getImageData(0, 0, 1, 1).data;
    const brightness = (data[0] * 299 + data[1] * 587 + data[2] * 114) / 1000;
    colorBrightnessCache.set(color, brightness);
    return brightness;
  } catch {
    colorBrightnessCache.set(color, 255);
    return 255;
  }
}

/**
 * Generates an outline color with high contrast against darker player label colors.
 *
 * @param color - Source label color string.
 * @returns An RGBA CSS string suited for outline contrast text shadows.
 */
export function getBrightOutlineColor(color: string): string {
  if (!canvasContext) return "rgba(255,255,255,0.8)";

  try {
    let validColor = color.trim();
    if (/^[0-9A-F]{6}$/i.test(validColor)) {
      validColor = `#${validColor}`;
    }

    colorCanvas.width = 1;
    colorCanvas.height = 1;
    canvasContext.clearRect(0, 0, 1, 1);
    canvasContext.fillStyle = validColor;
    canvasContext.fillRect(0, 0, 1, 1);

    const data = canvasContext.getImageData(0, 0, 1, 1).data;
    let r = data[0],
      g = data[1],
      b = data[2];

    if (r < 30 && g < 30 && b < 30) {
      return "rgba(200, 200, 200, 0.9)";
    }

    const max = Math.max(r, g, b) || 1;
    const multiplier = 255 / max;
    const brightR = Math.min(255, r * multiplier);
    const brightG = Math.min(255, g * multiplier);
    const brightB = Math.min(255, b * multiplier);

    r = Math.round((brightR + 255) / 2);
    g = Math.round((brightG + 255) / 2);
    b = Math.round((brightB + 255) / 2);

    return `rgba(${r}, ${g}, ${b}, 0.9)`;
  } catch {
    return "rgba(255,255,255,0.8)";
  }
}
