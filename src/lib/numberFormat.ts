type NumberFormatOptions = Intl.NumberFormatOptions;

/**
 * Force Western digits (0-9) across the app.
 */
export function formatNumberEn(value: number, options?: NumberFormatOptions): string {
  if (!Number.isFinite(value)) return "0";
  return new Intl.NumberFormat("en-US", options).format(value);
}
