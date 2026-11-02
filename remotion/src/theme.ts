import { loadFont } from '@remotion/fonts';
import { staticFile } from 'remotion';

export const palette = {
  background: '#101112',
  surface: '#191b1d',
  text: '#ecebe7',
  secondary: '#a7aaa9',
  muted: '#888e90',
  line: 'rgba(236,235,231,0.10)',
};

export const sans = 'Portfolio Manrope, sans-serif';
export const serif = 'Portfolio Cormorant, Georgia, serif';
export const ease = [0.22, 1, 0.36, 1] as const;

let ready: Promise<void[]> | undefined;
export function loadVideoFonts(): Promise<void[]> {
  ready ??= Promise.all([
    loadFont({ family: 'Portfolio Manrope', url: staticFile('assets/fonts/manrope-latin.woff2'), weight: '400', unicodeRange: 'U+0000-024F,U+2000-206F' }),
    loadFont({ family: 'Portfolio Manrope', url: staticFile('assets/fonts/manrope-cyrillic.woff2'), weight: '400', unicodeRange: 'U+0400-052F,U+2DE0-2DFF,U+A640-A69F' }),
    loadFont({ family: 'Portfolio Cormorant', url: staticFile('assets/fonts/cormorant-latin.woff2'), weight: '400', unicodeRange: 'U+0000-024F,U+2000-206F' }),
    loadFont({ family: 'Portfolio Cormorant', url: staticFile('assets/fonts/cormorant-cyrillic.woff2'), weight: '400', unicodeRange: 'U+0400-052F,U+2DE0-2DFF,U+A640-A69F' }),
  ]);
  return ready;
}
