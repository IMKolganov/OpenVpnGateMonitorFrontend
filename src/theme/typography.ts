/** Keep in sync with --font-size-* in src/css/tokens.css */
export const fontSize = {
  "2xs": 12,
  xs: 12,
  sm: 12,
  md: 14,
  base: 14,
  lg: 16,
  xl: 16,
  "2xl": 18,
} as const;

export const fontSizeBasePx = fontSize.base;
