/**
 * Metres are the canonical unit everywhere in the model. These helpers only
 * translate at the edges, so inputs can accept "152 cm" or "1.52 m" without
 * the store ever seeing anything but metres.
 */

export function formatMetersShort(value: number) {
  return `${value.toFixed(2)} m`;
}

export function formatCentimeters(value: number) {
  return `${Math.round(value * 100)} cm`;
}

/** "152 x 203 cm" — the dimension caption used on cards and while resizing. */
export function formatFootprint(width: number, depth: number) {
  return `${Math.round(width * 100)} × ${Math.round(depth * 100)} cm`;
}

/** Sub-metre distances read better in centimetres. */
export function formatDistance(value: number) {
  if (value < 1) {
    return `${Math.round(value * 100)} cm`;
  }

  return `${value.toFixed(2)} m`;
}

/**
 * Parses a user-typed dimension into metres. Accepts a bare number (metres),
 * an explicit unit, and both decimal separators. Returns null when the text
 * cannot be understood so callers can keep the previous value.
 */
export function parseLengthToMeters(input: string): number | null {
  const text = input.trim().toLowerCase().replace(",", ".");

  if (text.length === 0) {
    return null;
  }

  const match = text.match(/^(-?\d*\.?\d+)\s*(mm|cm|m)?$/);

  if (!match) {
    return null;
  }

  const value = Number(match[1]);

  if (!Number.isFinite(value)) {
    return null;
  }

  const unit = match[2] ?? "m";

  if (unit === "mm") {
    return value / 1000;
  }

  if (unit === "cm") {
    return value / 100;
  }

  return value;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Keeps stored coordinates at millimetre precision instead of float noise. */
export function roundMeters(value: number) {
  return Number(value.toFixed(3));
}

export function normalizeDegrees(value: number) {
  return ((value % 360) + 360) % 360;
}
