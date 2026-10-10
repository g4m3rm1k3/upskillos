export function validGraphBounds(min: number, max: number): boolean {
  return Number.isFinite(min) && Number.isFinite(max) && Number.isFinite(max - min) && max > min;
}

// Bound the work even when floating-point rounding would make x += step stall.
export function graphTicks(min: number, max: number): number[] {
  if (!validGraphBounds(min, max)) return [];
  const step = (max - min) / 10;
  if (step === 0) return [];
  const start = Math.ceil(min / step) * step;
  return Array.from(new Set(Array.from({ length: 12 }, (_, i) => start + i * step)))
    .filter(value => Number.isFinite(value) && value >= min && value <= max);
}
