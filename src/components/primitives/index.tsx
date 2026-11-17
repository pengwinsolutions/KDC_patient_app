/**
 * Native equivalents of the HTML elements the blueprint is written in. They
 * reproduce the CSS behaviour React Native lacks: inherited text styles, inline
 * text flow, grid rows, divide lines and flex-shrink on row children.
 */
import React, { Children, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  Easing, interpolate, SlideInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming,
} from 'react-native-reanimated';
import RNSvg from 'react-native-svg';
import { cssInterop } from 'nativewind';
import { colorValue, nativeStyle, parseClasses, resolveText, sizeValue, type Parsed, type TextClasses } from './classes';
import { colors } from './tokens';
import { showToast } from '../../store/toast';

export {
  Path as SvgPath, Rect as SvgRect, G as SvgG, Circle as SvgCircle, Line as SvgLine, Polyline as SvgPolyline,
  Polygon as SvgPolygon, Defs as SvgDefs, LinearGradient as SvgLinearGradient, Stop as SvgStop,
} from 'react-native-svg';

interface Ctx {
  text: TextClasses;
  row: boolean;
  block: boolean;
  inText: boolean;
}
const ROOT: Ctx = { text: {}, row: false, block: true, inText: false };
const C = createContext<Ctx>(ROOT);

export const useInheritedText = () => useContext(C).text;

function useCtx(p: Parsed, parent: Ctx, extra?: TextClasses, row = p.isRow, block = !p.isFlexContainer) {
  const key = JSON.stringify(p.text);
  return useMemo<Ctx>(
    () => ({ text: { ...parent.text, ...extra, ...p.text }, row, block, inText: false }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [parent.text, key, row, block],
  );
}

/* ------------------------------------------------------------------ Text */

function isTextChild(c: React.ReactNode) {
  return typeof c === 'string' || typeof c === 'number';
}

export function flatten(children: React.ReactNode): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  Children.forEach(children, (c) => {
    if (c === null || c === undefined || typeof c === 'boolean') return;
    if (React.isValidElement(c) && c.type === React.Fragment) out.push(...flatten((c.props as any).children));
    else out.push(c);
  });
  return out;
}

/** Space that stands in for a small left margin on text inside text. */
function marginSpace(layout: string) {
  const m = /(?:^|\s)ml-(px|0\.5|1|1\.5|2|2\.5|3|\[[\d.]+px\])(?:\s|$)/.exec(layout);
  if (!m) return null;
  const px = m[1] === 'px' ? 1 : m[1].startsWith('[') ? Number(m[1].slice(1, -3)) : Number(m[1]) * 4;
  if (px <= 2) return '\u200A';
  if (px <= 4) return ' ';
  return ' \u2009';
}

/** Nested text ignores `opacity`, so it is carried by the colour instead. */
function fadedColor(layout: string, color?: string) {
  const m = /(?:^|\s)opacity-(\d+)(?:\s|$)/.exec(layout);
  if (!m || !color) return null;
  const c = colorValue(`${color.slice(5)}/${m[1]}`);
  return c ? { color: c } : null;
}

export function P({ className = '', style, children, numberOfLines, ...rest }: any) {
  const parent = useContext(C);
  const p = parseClasses(className);
  const merged = useMemo(() => ({ ...parent.text, ...p.text }), [parent.text, p]);
  const value = useMemo<Ctx>(() => ({ ...parent, text: merged, inText: true }), [parent, merged]);
  /* A <p className="flex …"> lays out its icon and text as a row with a gap. */
  if (p.isFlexContainer && !parent.inText) return <Div className={className} style={style} {...rest}>{children}</Div>;
  const t = resolveText(merged);
  const shrink = parent.row && !p.noShrink && !parent.inText ? { flexShrink: 1 } : null;
  return (
    <C.Provider value={value}>
      <Text
        allowFontScaling={false}
        textBreakStrategy="simple"
        numberOfLines={numberOfLines ?? p.lines}
        adjustsFontSizeToFit={p.nowrap}
        minimumFontScale={0.75}
        className={`${p.layout} ${t.className}`}
        style={[t.style as any, shrink, p.boxStyle as any, parent.inText ? fadedColor(p.layout, merged.color) : null, nativeStyle(style)]}
        {...rest}
      >
        {parent.inText ? marginSpace(p.layout) : null}
        {children}
      </Text>
    </C.Provider>
  );
}

const INLINE_TYPES = new Set<unknown>();

function isBlockSpan(c: any) {
  return parseClasses(c?.props?.className ?? '').blockEl;
}

/** Sits on a line with its siblings, as a span or inline svg does in a button. */
function isInlineNode(c: any) {
  if (isTextChild(c)) return true;
  return React.isValidElement(c) && !isBlockSpan(c) && (c.type === Span || Boolean((c.type as any).inlineIcon));
}

/** A `<span>`: text when it holds text, a box when it is used as one. */
export function Span(props: any) {
  const parent = useContext(C);
  const p = parseClasses(props.className ?? '');
  const nodes = flatten(props.children);
  const textOnly = nodes.every((c) => isTextChild(c) || (React.isValidElement(c) && INLINE_TYPES.has(c.type)));
  const hasBlockKid = nodes.some(isBlockSpan);
  if (parent.inText || (textOnly && !hasBlockKid && !p.isFlexContainer && !isSizedBox(p))) {
    return <P {...props} />;
  }
  if (parent.block && !p.blockEl && !parent.row) {
    const alignSelf = parent.text.align === 'text-center' ? 'center' : 'flex-start';
    return <Div {...props} style={{ alignSelf, ...props.style }} />;
  }
  return <Div {...props} />;
}
INLINE_TYPES.add(Span);
INLINE_TYPES.add(P);

/** Positioned or sized spans are boxes even when they sit among text. */
function isBoxSpan(c: any) {
  const q = parseClasses(c?.props?.className ?? '');
  return q.layout.split(' ').includes('absolute') || isSizedBox(q);
}

function isSizedBox(p: Parsed) {
  return /(^|\s)(h-|w-|size-|bg-|rounded|p[xytblr]?-|border|items-|justify-)/.test(p.layout);
}

/* ------------------------------------------------------------------- Box */

/** The frame shown when the device asks for reduced motion. */
const STILL: Record<string, any> = {
  pulseRing: { opacity: 0.3, transform: [{ scale: 1.08 }] },
};

function AnimView({ kind, style, children }: any) {
  const v = useSharedValue(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) { v.value = kind === 'riseIn' ? 1 : 0; return; }
    if (kind === 'riseIn') v.value = withTiming(1, { duration: 450, easing: Easing.bezier(0.22, 1, 0.36, 1) });
    else if (kind === 'pulse') v.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true);
    else if (kind === 'spinSlow') v.value = withRepeat(withTiming(1, { duration: 1000, easing: Easing.linear }), -1, false);
    else if (kind === 'pulseRing') v.value = withRepeat(withTiming(1, { duration: 2200 }), -1, false);
  }, [kind, v, reduced]);
  const anim = useAnimatedStyle(() => {
    if (reduced && STILL[kind]) return STILL[kind];
    switch (kind) {
      case 'riseIn':
        return { opacity: v.value, transform: [{ translateY: interpolate(v.value, [0, 1], [10, 0]) }] };
      case 'pulse':
        return { opacity: interpolate(v.value, [0, 1], [1, 0.5]) };
      case 'spinSlow':
        return { transform: [{ rotate: `${v.value * 360}deg` }] };
      case 'pulseRing':
        return {
          opacity: interpolate(v.value, [0, 0.7, 1], [0.55, 0, 0]),
          transform: [{ scale: interpolate(v.value, [0, 0.7, 1], [0.86, 1.3, 1.3]) }],
        };
      default:
        return {};
    }
  });
  const entering = kind === 'sheetUp' ? SlideInDown.duration(360) : undefined;
  return (
    <Animated.View entering={entering} style={[style, anim]}>
      {children}
    </Animated.View>
  );
}
/* NativeWind resolves the classes on this plain wrapper; handing them straight
   to a Reanimated view routes it through NativeWind's own animation path. */
cssInterop(AnimView, { className: 'style' });
const AnimLayer: any = AnimView;

function Shimmer() {
  const v = useSharedValue(-1);
  const width = useSharedValue(0);
  useEffect(() => {
    v.value = withRepeat(withTiming(1, { duration: 1600 }), -1, false);
  }, [v]);
  const anim = useAnimatedStyle(() => ({ transform: [{ translateX: v.value * width.value }] }));
  return (
    <Animated.View
      pointerEvents="none"
      onLayout={(e) => { width.value = e.nativeEvent.layout.width; }}
      style={[
        { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
        { experimental_backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,.75), rgba(255,255,255,0))' } as any,
        anim,
      ]}
    />
  );
}

/** Direct text children flow as one line of text, as they would inside a div. */
function isFlowText(c: React.ReactNode) {
  return isTextChild(c) || (React.isValidElement(c) && INLINE_TYPES.has(c.type) && !isBlockSpan(c) && !isBoxSpan(c));
}

function flowChildren(children: React.ReactNode, p: Parsed): React.ReactNode {
  const nodes = flatten(children);
  if (!nodes.some(isTextChild)) return children;
  if (!p.isRow && nodes.every(isFlowText)) return <P numberOfLines={p.lines}>{nodes}</P>;
  /* In a flex row, neighbouring text and inline spans form one item, and
     whitespace-only runs between items disappear, as in a browser. */
  const out: React.ReactNode[] = [];
  let run: React.ReactNode[] = [];
  const flush = () => {
    if (run.length && !run.every((c) => isTextChild(c) && !String(c).trim())) {
      const trimmed = run.map((c, i) => (typeof c === 'string' ? (i === 0 ? c.trimStart() : i === run.length - 1 ? c.trimEnd() : c) : c));
      out.push(<P key={`t${out.length}`} numberOfLines={p.lines}>{trimmed}</P>);
    }
    run = [];
  };
  for (const c of nodes) {
    if (isTextChild(c)) run.push(c);
    else { flush(); out.push(c); }
  }
  flush();
  return out;
}

/** Children of a grid cell fill it, as CSS grid items stretch. */
function GridCell({ children }: { children: React.ReactNode }) {
  const parent = useContext(C);
  const value = useMemo(() => ({ ...parent, block: false, row: false }), [parent]);
  return <C.Provider value={value}>{children}</C.Provider>;
}

function layoutChildren(children: React.ReactNode, p: Parsed): React.ReactNode {
  if (p.grid) {
    const cells = flatten(children);
    const rows: React.ReactNode[] = [];
    for (let i = 0; i < cells.length; i += p.grid) {
      const slice = cells.slice(i, i + p.grid);
      const pad = Array.from({ length: p.grid - slice.length });
      const line = { backgroundColor: colorValue(p.divideColor ?? '') ?? colors['ink-100'], width: 1 };
      rows.push(
        <View key={i} className={`flex-row ${p.gapClasses}`}>
          {slice.flatMap((c, j) => [
            ...(j && p.divide === 'x' ? [<View key={`d${j}`} style={line} />] : []),
            <View key={j} className="min-w-0 flex-1"><GridCell>{c}</GridCell></View>,
          ])}
          {pad.map((_, j) => <View key={`p${j}`} className="flex-1" />)}
        </View>,
      );
      if (p.divide === 'y' && i + p.grid < cells.length) {
        rows.push(<View key={`r${i}`} style={{ height: 1, backgroundColor: line.backgroundColor }} />);
      }
    }
    return rows;
  }
  if (p.divide) {
    const line = {
      backgroundColor: colorValue(p.divideColor ?? '') ?? colors['ink-100'],
      ...(p.divide === 'y' ? { height: 1 } : { width: 1 }),
    };
    return flatten(children).flatMap((c, i) => (i ? [<View key={`d${i}`} style={line} />, c] : [c]));
  }
  return flowChildren(children, p);
}

function boxStyles(p: Parsed, parent: Ctx, style: any) {
  const shrink = parent.row && !p.noShrink ? { flexShrink: 1 } : null;
  const inlineSelf = p.inline && parent.block ? { alignSelf: 'flex-start' as const } : null;
  return [shrink, inlineSelf, p.boxStyle as any, nativeStyle(style, p.sticky)];
}

export function Div({ className = '', style, children, onPress: press, onClick, ...rest }: any) {
  const parent = useContext(C);
  const p = parseClasses(className);
  const value = useCtx(p, parent);
  const onPress = press ?? onClick;
  if (onPress) return <Btn className={className} style={style} onPress={onPress} isDiv {...rest}>{children}</Btn>;

  const st = boxStyles(p, parent, style);
  const body = layoutChildren(children, p);
  let el: React.ReactElement;
  if (p.scroll) {
    const pad = p.layout.split(' ').filter((t) => /^-?p[xytblr]?-/.test(t)).join(' ');
    const frame = p.layout.split(' ').filter((t) => !/^-?p[xytblr]?-/.test(t)).join(' ');
    el = (
      <ScrollView
        horizontal={p.scroll === 'x'}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        className={frame}
        contentContainerClassName={p.scroll === 'x' ? `flex-row ${p.gapClasses} ${pad}` : `${p.gapClasses} ${pad}`}
        style={[p.scroll === 'x' && !/(^|\s)flex-1/.test(p.layout) ? { flexGrow: 0 } : null, ...st]}
        {...rest}
      >
        {body}
      </ScrollView>
    );
  } else if (p.anim && p.anim !== 'ecg' && p.anim !== 'shimmer') {
    el = <AnimLayer kind={p.anim} className={p.layout} style={st}>{body}</AnimLayer>;
  } else {
    el = (
      <View
        className={`${p.layout} ${p.skeleton ? 'overflow-hidden rounded-lg bg-ink-100' : ''}`}
        style={st}
        {...rest}
      >
        {body}
        {p.skeleton && <Shimmer />}
      </View>
    );
  }
  return <C.Provider value={value}>{el}</C.Provider>;
}

/**
 * A `<button>`. Text is centred by default, as a browser button's is, and
 * content sits in a row when the blueprint places inline children side by side.
 */
function labelOf(nodes: React.ReactNode[]): string {
  return nodes
    .map((c: any) => (isTextChild(c) ? String(c) : React.isValidElement(c) ? labelOf(flatten((c.props as any).children)) : ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function Btn({ className = '', style, children, onPress, onClick, disabled, isDiv, accessibilityLabel, ...rest }: any) {
  const parent = useContext(C);
  const p = parseClasses(className);
  const nodes = flatten(children);
  const inlineRow = !p.isFlexContainer && !p.grid && nodes.length > 1 && nodes.every(isInlineNode);
  const value = useCtx(p, parent, p.text.align || isDiv ? undefined : { align: 'text-center' }, p.isRow || inlineRow, false);
  const [pressed, setPressed] = useState(false);
  const feedback = p.tap && pressed ? { opacity: 0.9, transform: [{ scale: 0.975 }] } : null;
  /* Like a browser button, it sizes to its content inside a block unless a width or display class says otherwise. */
  const fill = isDiv || p.isFlexContainer || p.grid || p.blockEl || p.inline || parent.row || !parent.block
    || /(^|\s)(w-|flex-1|self-|absolute|inset-|min-w-)/.test(p.layout);
  const shrinkWrap = fill ? null : { alignSelf: parent.text.align === 'text-center' ? 'center' as const : 'flex-start' as const };
  const body = layoutChildren(children, p);
  return (
    <C.Provider value={value}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        accessibilityLabel={accessibilityLabel}
        onPress={onPress ?? onClick ?? (() => showToast(labelOf(nodes) || accessibilityLabel || 'Done'))}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        className={`${p.layout} ${inlineRow ? 'flex-row items-center justify-center' : !p.isFlexContainer && !isDiv ? 'justify-center' : ''}`}
        style={[shrinkWrap, ...boxStyles(p, parent, style), feedback]}
        {...rest}
      >
        {body}
      </Pressable>
    </C.Provider>
  );
}

/* ----------------------------------------------------------------- Media */

/** CSS `object-position` as fractions of the overflow: `center 22%` -> [0.5, 0.22]. */
function objectPos(value: string): [number, number] {
  const word: Record<string, number> = { left: 0, top: 0, center: 0.5, right: 1, bottom: 1 };
  const parts = value.trim().split(/\s+/).map((v) => (v.endsWith('%') ? Number(v.slice(0, -1)) / 100 : word[v] ?? 0.5));
  if (parts.length === 1) return /^(top|bottom)$/.test(value.trim()) ? [0.5, parts[0]] : [parts[0], 0.5];
  return [parts[0], parts[1]];
}

/**
 * React Native's Image always centres a cover crop. When the blueprint moves
 * the crop with object-position, the image is drawn oversized inside a
 * clipping box and offset by hand.
 */
function PositionedImage({ img, pos, layout, boxStyle, alt, onError, rest }: any) {
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  let inner: any = StyleSheet.absoluteFill;
  if (box && nat) {
    const k = Math.max(box.w / nat.w, box.h / nat.h);
    const w = nat.w * k;
    const h = nat.h * k;
    const [px, py] = objectPos(pos);
    inner = { position: 'absolute', width: w, height: h, left: (box.w - w) * px, top: (box.h - h) * py };
  }
  return (
    <View
      {...(layout ? { className: layout } : null)}
      style={[StyleSheet.flatten(boxStyle), { overflow: 'hidden' }]}
      onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      <Image
        source={img}
        accessibilityLabel={alt}
        resizeMode="cover"
        onError={onError}
        onLoad={(e: any) => {
          const src = e.nativeEvent?.source;
          if (src?.width && src?.height) setNat({ w: src.width, h: src.height });
        }}
        style={inner}
        {...rest}
      />
    </View>
  );
}

const BLUR: Record<string, number> = { 'blur-sm': 4, blur: 8, 'blur-md': 12, 'blur-lg': 16, 'blur-xl': 24 };

export function Img({ src, alt, className = '', style, onError, source, ...rest }: any) {
  const parent = useContext(C);
  const p = parseClasses(className);
  const blurTok = className.split(/\s+/).find((t: string) => /^blur(-|$)/.test(t));
  if (blurTok) {
    const m = /^blur-\[([\d.]+)px\]$/.exec(blurTok);
    const r = m ? Number(m[1]) : BLUR[blurTok] ?? 8;
    /* Android's blur radius reads stronger than the CSS one at the same value. */
    rest = { blurRadius: Platform.OS === 'android' ? Math.max(1, Math.round(r / 2)) : r, ...rest };
  }
  const img = source ?? (typeof src === 'string' ? { uri: src } : src);
  const pos: string | undefined = style && !Array.isArray(style) ? style.objectPosition : undefined;
  const image = pos && (p.resizeMode ?? 'cover') === 'cover' && !/^(center|50% 50%|center center)$/.test(pos) ? (
    <PositionedImage img={img} pos={pos} layout={p.layout} boxStyle={boxStyles(p, parent, style)} alt={alt} onError={onError} rest={rest} />
  ) : (
    <Image
      source={img}
      accessibilityLabel={alt}
      resizeMode={p.resizeMode ?? 'cover'}
      onError={onError}
      {...(p.layout ? { className: p.layout } : null)}
      style={StyleSheet.flatten(boxStyles(p, parent, style))}
      {...rest}
    />
  );
  return p.anim ? <AnimLayer kind={p.anim}>{image}</AnimLayer> : image;
}

/* ----------------------------------------------------------------------- */

export function SvgBox({ className = '', style, width, height, children, viewBox, ...rest }: any) {
  const p = parseClasses(className);
  const size = (axis: 'h' | 'w', given: any) => {
    if (given !== undefined) return given;
    if (new RegExp(`(^|\\s)${axis}-full`).test(p.layout)) return '100%';
    const tok = p.layout.split(' ').find((t) => t.startsWith(`${axis}-`));
    return sizeValue(tok);
  };
  const { fill, stroke, preserveAspectRatio } = rest;
  return (
    <RNSvg
      viewBox={viewBox}
      width={size('w', width)}
      height={size('h', height)}
      fill={fill}
      stroke={stroke}
      preserveAspectRatio={preserveAspectRatio}
      style={nativeStyle(style)}
    >
      {children}
    </RNSvg>
  );
}

/* ---------------------------------------------------------------- Inputs */

function field({ className = '', style, onChange, onChangeText, type, readOnly, onFocus, onBlur, value, defaultValue, ...rest }: any, multiline: boolean) {
  return { className, style, onChange, onChangeText, type, readOnly, onFocus, onBlur, value, defaultValue, rest, multiline };
}

/** `focus:ring-[1.5px] focus:border-brand-600` as a style: a thicker ring in that colour. */
function focusStyle(focus: string, ring: any) {
  const width = focus.match(/(?:^|\s)ring-\[([\d.]+)px\]/)?.[1] ?? focus.match(/(?:^|\s)ring-(\d+)(?:\s|$)/)?.[1];
  const color = focus.match(/(?:^|\s)(?:border|ring)-([a-z]+-\d{2,3})(?:\s|$)/)?.[1];
  return {
    borderWidth: width ? Number(width) : ring?.borderWidth ?? 1,
    ...(color ? { borderColor: colorValue(color) } : null),
  };
}

function FieldInput(props: any) {
  const { className, style, onChange, onChangeText, type, readOnly, onFocus, onBlur, value, defaultValue, rest, multiline } = props;
  const [text, setText] = useState<string>(value ?? defaultValue ?? '');
  useEffect(() => { if (value !== undefined) setText(value); }, [value]);
  const parent = useContext(C);
  const [focused, setFocused] = useState(false);
  const p = parseClasses(className);
  const t = resolveText({ ...parent.text, align: undefined, ...p.text });
  const ring: any = p.boxStyle?.outlineWidth
    ? { borderWidth: p.boxStyle.outlineWidth, borderColor: p.boxStyle.outlineColor, outlineWidth: 0 }
    : null;
  // Focus styles go in `style`, never the class list: changing an input's classes makes the styling
  // layer rebuild the native text field, which drops keyboard focus (the keyboard closes or never
  // opens on the first tap) and its padding.
  const focusRing: any = focused && p.focus ? focusStyle(p.focus, ring) : null;
  return (
    <TextInput
      allowFontScaling={false}
      multiline={multiline}
      textAlignVertical={multiline ? 'top' : 'center'}
      secureTextEntry={type === 'password'}
      editable={!readOnly}
      placeholderTextColor={p.placeholder ?? colors['ink-300']}
      pointerEvents={readOnly ? 'none' : undefined}
      value={text}
      onChangeText={(v) => {
        setText(v);
        onChangeText?.(v);
        onChange?.({ target: { value: v } });
      }}
      onFocus={(e) => { setFocused(true); onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); onBlur?.(e); }}
      className={`${p.layout} ${t.className}`}
      style={[
        t.style as any,
        /(^|\s)!?p[xlr]?-/.test(p.layout) ? null : { paddingHorizontal: 0 },
        ...boxStyles(p, parent, style),
        ring,
        focusRing,
        { paddingVertical: multiline ? undefined : 0 },
      ]}
      {...rest}
    />
  );
}

export const TextField = (props: any) => <FieldInput {...field(props, false)} />;
export const TextAreaField = (props: any) => <FieldInput {...field(props, true)} />;

export { colorValue, parseClasses, sizeValue };
