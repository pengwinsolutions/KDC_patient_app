/**
 * Reads the blueprint's Tailwind class lists and separates what NativeWind can
 * apply directly from what React Native has no class for (text inheritance,
 * grids, dividers, gradients, multi-layer shadows, entrance animations).
 */
import { Platform, StyleSheet } from 'react-native';
import { colors, fontSizes, shadows, SPACING_UNIT } from './tokens';

export type TextCategory =
  | 'color' | 'size' | 'align' | 'family' | 'weight'
  | 'leading' | 'tracking' | 'case' | 'deco' | 'style' | 'nums';
export type TextClasses = Partial<Record<TextCategory, string>>;

export interface Parsed {
  layout: string;
  text: TextClasses;
  lines?: number;
  grid?: number;
  gapClasses: string;
  divide?: 'x' | 'y';
  divideColor?: string;
  anim?: string;
  scroll?: 'x' | 'y';
  sticky: boolean;
  skeleton: boolean;
  tap: boolean;
  inline: boolean;
  nowrap: boolean;
  blockEl: boolean;
  resizeMode?: 'cover' | 'contain';
  isRow: boolean;
  isFlexContainer: boolean;
  boxy: boolean;
  noShrink: boolean;
  boxStyle: Record<string, unknown> | undefined;
  focus: string;
  placeholder?: string;
}

const ALIGN = new Set(['center', 'left', 'right', 'justify']);
const CASE = new Set(['uppercase', 'lowercase', 'capitalize', 'normal-case']);
const DECO = new Set(['underline', 'line-through', 'no-underline']);
const BOXY = /^(flex|grid|inline-flex|items-|justify-|h-|w-|size-|bg-|border|rounded|p[xytblr]?-|absolute|gap-)/;

export function textCategory(tok: string): TextCategory | null {
  if (tok.includes(':')) return null;
  if (tok.startsWith('text-')) {
    const name = tok.slice(5);
    if (ALIGN.has(name)) return 'align';
    if (fontSizes[name] || /^\[\d/.test(name)) return 'size';
    return 'color';
  }
  if (tok.startsWith('font-')) {
    return /^font-(display|sans|mono|serif)$/.test(tok) ? 'family' : 'weight';
  }
  if (tok.startsWith('leading-')) return 'leading';
  if (tok.startsWith('tracking-')) return 'tracking';
  if (CASE.has(tok)) return 'case';
  if (DECO.has(tok)) return 'deco';
  if (tok === 'italic' || tok === 'not-italic') return 'style';
  if (tok === 'tabular-nums') return 'nums';
  return null;
}

/** Resolves `brand-600`, `white/60`, `[#0068C8]` to a React Native colour. */
export function colorValue(tok: string): string | undefined {
  const [name, op] = tok.split('/');
  const base = name.startsWith('[') ? name.slice(1, -1) : colors[name];
  if (!base) return undefined;
  if (op === undefined || !base.startsWith('#')) return base;
  const h = base.slice(1);
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const v = parseInt(n, 16);
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${Number(op) / 100})`;
}

function shadowValue(tok: string): string | undefined {
  const name = tok.slice(7);
  if (name === 'none') return 'none';
  if (name.startsWith('[')) return name.slice(1, -1).replace(/_/g, ' ');
  return shadows[name];
}

const BG_IMAGE: Record<string, string> = {
  'bg-brand-deep': 'linear-gradient(165deg, #0A3D70 0%, #0057A8 48%, #0068C8 100%)',
  'bg-clinical': 'radial-gradient(120% 70% at 50% 0%, rgba(0,104,200,.09) 0%, rgba(0,104,200,0) 62%), linear-gradient(180deg, #FFFFFF 0%, #EBF0F6 100%)',
};
const GRADIENT_DIR: Record<string, string> = {
  t: '0deg', tr: '45deg', r: '90deg', br: '135deg', b: '180deg', bl: '225deg', l: '270deg', tl: '315deg',
};

const cache = new Map<string, Parsed>();

const ARBITRARY: Record<string, string[]> = {
  h: ['height'], w: ['width'], 'min-h': ['minHeight'], 'min-w': ['minWidth'], 'max-h': ['maxHeight'], 'max-w': ['maxWidth'],
  rounded: ['borderRadius'], p: ['padding'], px: ['paddingHorizontal'], py: ['paddingVertical'], pt: ['paddingTop'],
  pb: ['paddingBottom'], pl: ['paddingLeft'], pr: ['paddingRight'], m: ['margin'], mx: ['marginHorizontal'],
  my: ['marginVertical'], mt: ['marginTop'], mb: ['marginBottom'], ml: ['marginLeft'], mr: ['marginRight'],
  gap: ['gap'], top: ['top'], bottom: ['bottom'], left: ['left'], right: ['right'],
};

/** `h-[46px]` → { height: 46 }. Returns false when the class isn't an arbitrary length. */
function arbitraryStyle(tok: string, into: Record<string, unknown>): boolean {
  const m = /^(-?)([a-z-]+)-\[(-?[\d.]+)px\]$/.exec(tok);
  if (!m) return false;
  if (m[2] === 'text') { into.fontSize = Number(m[3]); return true; }
  const props = ARBITRARY[m[2]];
  if (!props) return false;
  for (const prop of props) into[prop] = (m[1] ? -1 : 1) * Number(m[3]);
  return true;
}

/** The property a class sets, so a `!` class can displace plain classes for the same one. */
function groupOf(tok: string): string {
  const t = tok.replace(/^-/, '');
  const cat = textCategory(t);
  if (cat) return `text:${cat}`;
  const m = /^(bg|border(?:-[trblxy])?|divide|ring|outline|from|via|to|fill|stroke)-(.+)$/.exec(t);
  if (m && colorValue(m[2])) return `${m[1]}:color`;
  return t.replace(/-(\[[^\]]*\]|[\w./]+)$/, '');
}

export function parseClasses(className: string): Parsed {
  const hit = cache.get(className);
  if (hit) return hit;

  const out: Parsed = {
    layout: '', text: {}, gapClasses: '', sticky: false, skeleton: false, tap: false,
    inline: false, nowrap: false, blockEl: false, isRow: false, isFlexContainer: false, boxy: false, noShrink: false,
    boxStyle: undefined, focus: '',
  };
  const layout: string[] = [];
  const focus: string[] = [];
  let shadow: string | undefined;
  let glow = false;
  let bgImage: string | undefined;
  let dir: string | undefined;
  let from: string | undefined;
  let via: string | undefined;
  let to: string | undefined;
  let ringWidth: number | undefined;
  let ringColor: string | undefined;
  let frosted = false;
  let ringInset = false;
  const extra: Record<string, unknown> = {};

  const tokens = className.split(/\s+/).filter(Boolean);
  const forcedStyle: Record<string, unknown> = {};
  const forced = new Set(tokens.filter((t) => t.startsWith('!')).map((t) => groupOf(t.slice(1))));
  for (const raw of tokens) {
    const tok = raw.replace(/^!/, '');
    if (forced.size && !raw.startsWith('!') && forced.has(groupOf(tok))) continue;
    if (raw.startsWith('!') && arbitraryStyle(tok, forcedStyle)) continue;
    const cat = textCategory(tok);
    if (cat) { out.text[cat] = tok; continue; }
    if (BOXY.test(tok)) out.boxy = true;

    if (tok === 'whitespace-nowrap') out.nowrap = true;
    if (tok === 'truncate' || tok === 'whitespace-nowrap') out.lines = 1;
    else if (tok.startsWith('line-clamp-')) out.lines = Number(tok.slice(11));
    else if (tok.startsWith('grid-cols-')) out.grid = Number(tok.slice(10));
    else if (tok === 'divide-x' || tok === 'divide-y') out.divide = tok.slice(-1) as 'x' | 'y';
    else if (tok.startsWith('divide-')) out.divideColor = tok.slice(7);
    else if (tok.startsWith('animate-')) out.anim = tok.slice(8);
    else if (tok === 'overflow-x-auto') out.scroll = 'x';
    else if (tok === 'overflow-y-auto') out.scroll = 'y';
    else if (tok === 'sticky') out.sticky = true;
    else if (tok === 'skeleton') out.skeleton = true;
    else if (tok === 'tap') out.tap = true;
    else if (tok === 'inline-flex') { out.inline = true; }
    else if (tok === 'block') { out.blockEl = true; }
    else if (tok === 'object-cover' || tok === 'object-contain') out.resizeMode = tok.slice(7) as 'cover' | 'contain';
    else if (tok.startsWith('blur')) glow = true;
    /* Translucent white bars sit over a backdrop blur on the web, which native lacks;
       a near-opaque fill hides scrolled content the way the blur does. */
    else if (/^bg-white\/(8[5-9]|9[0-6])$/.test(tok) && /(^|\s)!?(sticky|inset-x-0|border-[tb]|z-[34]0)(\s|$)/.test(className)) frosted = true;
    else if (tok.startsWith('shadow-')) shadow = shadowValue(tok);
    /* A CSS ring sits outside the box without taking space; outline does the same natively. */
    else if (tok === 'ring-inset') ringInset = true;
    /* Half-point hairlines round away on some densities; one device pixel always shows. */
    else if (/^border(-[trblxy])?-\[0\.5px\]$/.test(tok)) {
      const side = tok.length > 15 ? tok[7] : '';
      const key = { t: ['borderTopWidth'], r: ['borderRightWidth'], b: ['borderBottomWidth'], l: ['borderLeftWidth'], x: ['borderLeftWidth', 'borderRightWidth'], y: ['borderTopWidth', 'borderBottomWidth'] }[side] ?? ['borderWidth'];
      for (const k of key) extra[k] = Platform.OS === 'android' ? 1 : StyleSheet.hairlineWidth;
    }
    else if (tok === 'w-fit') extra.alignSelf = 'flex-start';
    else if (tok === 'grayscale') extra.filter = [{ grayscale: 1 }];
    else if (/^ring-\[[\d.]+px\]$/.test(tok)) ringWidth = Number(tok.slice(6, -3));
    else if (/^ring-\d$/.test(tok)) ringWidth = Number(tok.slice(5));
    else if (tok === 'ring') ringWidth = 3;
    else if (tok.startsWith('ring-') && colorValue(tok.slice(5))) ringColor = colorValue(tok.slice(5));
    else if (BG_IMAGE[tok]) bgImage = BG_IMAGE[tok];
    else if (tok.startsWith('bg-gradient-to-')) dir = GRADIENT_DIR[tok.slice(15)];
    else if (/^from-/.test(tok)) from = colorValue(tok.slice(5));
    else if (/^via-/.test(tok)) via = colorValue(tok.slice(4));
    else if (/^to-/.test(tok)) to = colorValue(tok.slice(3));
    else if (tok.startsWith('focus:')) focus.push(tok.slice(6));
    else if (tok.startsWith('placeholder:text-')) out.placeholder = colorValue(tok.slice(17));
    else {
      layout.push(tok);
      if (/^gap(-[xy])?-/.test(tok)) out.gapClasses += ` ${tok}`;
      if (tok === 'flex-row') out.isRow = true;
      if (tok === 'flex-row' || tok === 'flex-col') out.isFlexContainer = true;
      if (tok === 'shrink-0' || tok === 'flex-none' || tok === 'flex-1' || tok === 'shrink') out.noShrink = true;
    }
  }

  /* A blurred colour disc on the web reads as a soft radial glow. */
  if (glow) {
    const i = layout.findIndex((t) => t.startsWith('bg-'));
    const c = i >= 0 ? colorValue(layout[i].slice(3)) : undefined;
    if (c) {
      layout.splice(i, 1);
      bgImage = `radial-gradient(circle, ${c} 0%, rgba(255,255,255,0) 70%)`;
    }
  }
  if (dir) {
    const stops = [from ?? 'transparent', via, to ?? 'transparent'].filter(Boolean);
    bgImage = `linear-gradient(${dir}, ${stops.join(', ')})`;
  }
  Object.assign(forcedStyle, extra);
  const hasForced = Object.keys(forcedStyle).length > 0;
  if (shadow || bgImage || ringWidth || frosted || hasForced) {
    out.boxStyle = {
      ...forcedStyle,
      ...(frosted ? { backgroundColor: 'rgba(255,255,255,0.97)' } : null),
      ...(ringWidth ? { outlineWidth: ringWidth, outlineStyle: 'solid', outlineColor: ringColor ?? 'rgba(59,130,246,0.5)', ...(ringInset ? { outlineOffset: -ringWidth } : null) } : null),
      ...(shadow && shadow !== 'none' ? { boxShadow: shadow } : null),
      ...(bgImage ? { experimental_backgroundImage: bgImage } : null),
    };
  }
  out.layout = layout.join(' ');
  out.focus = focus.join(' ');
  cache.set(className, out);
  return out;
}

const FAMILY_WEIGHTS = {
  sans: { 400: 'Inter-Regular', 500: 'Inter-Medium', 600: 'Inter-SemiBold', 700: 'Inter-Bold', 800: 'Inter-Bold' },
  display: { 400: 'Manrope-Medium', 500: 'Manrope-Medium', 600: 'Manrope-SemiBold', 700: 'Manrope-Bold', 800: 'Manrope-ExtraBold' },
} as const;

const WEIGHTS: Record<string, 400 | 500 | 600 | 700 | 800> = {
  'font-normal': 400, 'font-medium': 500, 'font-semibold': 600, 'font-bold': 700, 'font-extrabold': 800,
};
const LEADING: Record<string, number> = {
  'leading-none': 1, 'leading-tight': 1.25, 'leading-snug': 1.375, 'leading-normal': 1.5, 'leading-relaxed': 1.625,
};
const TRACKING: Record<string, number> = {
  'tracking-tighter': -0.05, 'tracking-tight': -0.025, 'tracking-normal': 0, 'tracking-wide': 0.025,
  'tracking-wider': 0.05, 'tracking-widest': 0.1,
};

function sizeOf(text: TextClasses): number {
  const tok = text.size;
  if (!tok) return 16;
  const name = tok.slice(5);
  if (fontSizes[name]) return fontSizes[name].size;
  const m = /^\[([\d.]+)px\]$/.exec(name);
  return m ? Number(m[1]) : 16;
}

const textCache = new Map<string, { className: string; style: Record<string, unknown> }>();

/**
 * Builds a Text's class list and style. Custom fonts are per-weight files, so a
 * weight becomes a font family rather than a `fontWeight`, which Android would
 * otherwise ignore or fake.
 */
export function resolveText(text: TextClasses) {
  const key = JSON.stringify(text);
  const hit = textCache.get(key);
  if (hit) return hit;

  const sizeName = text.size?.slice(5) ?? '';
  const weight = text.weight ? WEIGHTS[text.weight] ?? 400 : fontSizes[sizeName]?.weight ?? 400;
  const family = text.family === 'font-display' ? 'display' : 'sans';
  const style: Record<string, unknown> = { fontFamily: FAMILY_WEIGHTS[family][weight] };
  const px = sizeOf(text);

  const classes: string[] = [];
  for (const cat of ['color', 'size', 'align', 'case', 'deco', 'style'] as const) {
    if (text[cat]) classes.push(text[cat]!);
  }

  if (text.leading) {
    if (LEADING[text.leading] !== undefined) style.lineHeight = Math.round(LEADING[text.leading] * px);
    else {
      const m = /^leading-\[([\d.]+)(px)?\]$/.exec(text.leading);
      if (m) style.lineHeight = m[2] ? Number(m[1]) : Math.round(Number(m[1]) * px);
      else {
        const n = /^leading-(\d+)$/.exec(text.leading);
        if (n) style.lineHeight = Number(n[1]) * SPACING_UNIT;
      }
    }
  }
  if (text.tracking) {
    if (TRACKING[text.tracking] !== undefined) style.letterSpacing = TRACKING[text.tracking] * px;
    else {
      const m = /^tracking-\[(-?[\d.]+)(em|px)\]$/.exec(text.tracking);
      if (m) style.letterSpacing = m[2] === 'em' ? Number(m[1]) * px : Number(m[1]);
    }
  }
  if (text.nums) style.fontVariant = ['tabular-nums'];

  const result = { className: classes.join(' '), style };
  textCache.set(key, result);
  return result;
}

/** Spacing/size token to points: `h-[23px]` → 23, `h-5` → 20. */
export function sizeValue(tok?: string): number | undefined {
  if (!tok) return undefined;
  const m = /^(?:h|w|size)-(?:\[([\d.]+)px\]|([\d.]+))$/.exec(tok);
  if (!m) return undefined;
  return m[1] ? Number(m[1]) : Number(m[2]) * SPACING_UNIT;
}

/** Drops CSS the native renderer rejects, and carries gradients across. */
export function nativeStyle(style: any, sticky = false): any {
  if (!style || typeof style !== 'object' || Array.isArray(style)) return style;
  const { background, backdropFilter, WebkitBackdropFilter, maskImage, WebkitMaskImage, objectPosition,
    gridTemplateColumns, filter, backgroundImage, transition, animation, animationDelay, cursor, ...rest } = style;
  const out: any = { ...rest };
  if (sticky) {
    delete out.top;
    if (out.marginTop < 0) out.marginTop = 0;
  }
  const bg = background ?? backgroundImage;
  if (typeof bg === 'string') {
    if (bg.includes('gradient(')) out.experimental_backgroundImage = bg;
    else out.backgroundColor = bg;
  }
  return out;
}
