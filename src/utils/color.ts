import type { HassEntity } from '../types/ha';

/**
 * Color temperature (Kelvin) to RGB integer [0..255, 0..255, 0..255]
 * Based on Tanner Helland's algorithm, clamped to [1500, 10000].
 */
export function kelvinToRgb(kelvin: number): [number, number, number] {
  const temp = Math.max(1500, Math.min(10000, kelvin)) / 100;

  // Red
  let red: number;
  if (temp <= 66) {
    red = 255;
  } else {
    red = temp - 60;
    red = 329.698727446 * Math.pow(red, -0.1332047592);
  }

  // Green
  let green: number;
  if (temp <= 66) {
    green = temp;
    green = 99.4708025861 * Math.log(green) - 161.1195681661;
  } else {
    green = temp - 60;
    green = 288.1221695283 * Math.pow(green, -0.0755148492);
  }

  // Blue
  let blue: number;
  if (temp >= 66) {
    blue = 255;
  } else if (temp <= 19) {
    blue = 0;
  } else {
    blue = temp - 10;
    blue = 138.5177312231 * Math.log(blue) - 305.0447927307;
  }

  const clamp = (v: number) => Math.round(Math.max(0, Math.min(255, v)));
  return [clamp(red), clamp(green), clamp(blue)];
}

/**
 * Converts mireds (micro reciprocal degrees) to Kelvin.
 */
export function miredsToKelvin(mireds: number): number {
  return Math.round(1_000_000 / Math.max(1, mireds));
}

/**
 * Converts Hue [0..360] and Saturation [0..100] (with Value = 100%) to RGB [0..255, 0..255, 0..255].
 */
export function hsToRgb(h: number, s: number): [number, number, number] {
  const normH = ((h % 360) + 360) % 360;
  const normS = Math.max(0, Math.min(100, s)) / 100;
  const v = 1;

  const c = v * normS;
  const x = c * (1 - Math.abs(((normH / 60) % 2) - 1));
  const m = v - c;

  let rPrime = 0;
  let gPrime = 0;
  let bPrime = 0;

  if (normH < 60) {
    rPrime = c;
    gPrime = x;
    bPrime = 0;
  } else if (normH < 120) {
    rPrime = x;
    gPrime = c;
    bPrime = 0;
  } else if (normH < 180) {
    rPrime = 0;
    gPrime = c;
    bPrime = x;
  } else if (normH < 240) {
    rPrime = 0;
    gPrime = x;
    bPrime = c;
  } else if (normH < 300) {
    rPrime = x;
    gPrime = 0;
    bPrime = c;
  } else {
    rPrime = c;
    gPrime = 0;
    bPrime = x;
  }

  const clamp = (val: number) => Math.round(Math.max(0, Math.min(255, (val + m) * 255)));
  return [clamp(rPrime), clamp(gPrime), clamp(bPrime)];
}

/**
 * Parses a hex color string ('#rgb', '#rrggbb', or without '#') to normalized RGB [0..1, 0..1, 0..1].
 */
export function hexToNormalizedRgb(hex: string): [number, number, number] {
  let clean = hex.trim().replace(/^#/, '');

  if (clean.length === 3) {
    clean = clean
      .split('')
      .map((c) => c + c)
      .join('');
  }

  if (clean.length !== 6) {
    return [1, 1, 1];
  }

  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);

  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return [1, 1, 1];
  }

  return [r / 255, g / 255, b / 255];
}

/**
 * Converts integer RGB [0..255, 0..255, 0..255] to lowercase '#rrggbb'.
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) =>
    Math.round(Math.max(0, Math.min(255, v)))
      .toString(16)
      .padStart(2, '0');
  return `#${clamp(r)}${clamp(g)}${clamp(b)}`.toLowerCase();
}

/**
 * Converts normalized RGB [0..1, 0..1, 0..1] to lowercase '#rrggbb'.
 */
export function normalizedRgbToHex(rgb: [number, number, number]): string {
  return rgbToHex(rgb[0] * 255, rgb[1] * 255, rgb[2] * 255);
}

/**
 * Linear interpolation between two RGB color tuples.
 */
export function lerpRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  const clampedT = Math.max(0, Math.min(1, t));
  return [
    a[0] + (b[0] - a[0]) * clampedT,
    a[1] + (b[1] - a[1]) * clampedT,
    a[2] + (b[2] - a[2]) * clampedT
  ];
}

export interface ExtractedLightColorBrightness {
  isOn: boolean;
  rgb: [number, number, number];
  hexColor: string;
  brightness: number;
}

/**
 * Extracts normalized light color and brightness from a HassEntity.
 *
 * Rules:
 * - If entity is undefined or state !== 'on':
 *   returns { isOn: false, rgb: [1, 0.72, 0.3], hexColor: '#ffb74d', brightness: 0 }.
 * - When entity.state === 'on':
 *   - brightness: attributes.brightness in [0..255] -> normalized [0.05..1.0] (default 1.0).
 *   - color priority: rgb_color -> hs_color -> color_temp_kelvin -> color_temp (mireds) -> warm white #ffb74d.
 *   - returns normalized rgb [0..1, 0..1, 0..1] and hexColor.
 */
export function extractEntityLightColorAndBrightness(
  entity: HassEntity | undefined
): ExtractedLightColorBrightness {
  if (!entity || entity.state !== 'on') {
    return {
      isOn: false,
      rgb: [1, 0.72, 0.3],
      hexColor: '#ffb74d',
      brightness: 0
    };
  }

  const attrs = entity.attributes || {};

  // Brightness
  let brightness = 1.0;
  if (typeof attrs.brightness === 'number') {
    brightness = Math.max(0.05, Math.min(1.0, attrs.brightness / 255));
  }

  // Color resolution by priority
  let rgbInt: [number, number, number];

  if (Array.isArray(attrs.rgb_color) && attrs.rgb_color.length === 3) {
    rgbInt = [attrs.rgb_color[0], attrs.rgb_color[1], attrs.rgb_color[2]];
  } else if (Array.isArray(attrs.hs_color) && attrs.hs_color.length === 2) {
    rgbInt = hsToRgb(attrs.hs_color[0], attrs.hs_color[1]);
  } else if (typeof attrs.color_temp_kelvin === 'number' && attrs.color_temp_kelvin > 0) {
    rgbInt = kelvinToRgb(attrs.color_temp_kelvin);
  } else if (typeof attrs.color_temp === 'number' && attrs.color_temp > 0) {
    rgbInt = kelvinToRgb(miredsToKelvin(attrs.color_temp));
  } else {
    // Default warm white #ffb74d: rgb(255, 183, 77)
    rgbInt = [255, 183, 77];
  }

  const rgbNorm: [number, number, number] = [
    rgbInt[0] / 255,
    rgbInt[1] / 255,
    rgbInt[2] / 255
  ];
  const hexColor = rgbToHex(rgbInt[0], rgbInt[1], rgbInt[2]);

  return {
    isOn: true,
    rgb: rgbNorm,
    hexColor,
    brightness
  };
}
