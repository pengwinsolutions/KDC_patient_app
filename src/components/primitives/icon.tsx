import React from 'react';
import { View } from 'react-native';
import { colorValue, parseClasses, sizeValue } from './classes';
import { Div, useInheritedText } from './index';
import { colors } from './tokens';

/**
 * Wraps a Lucide icon so it reads size and colour from the blueprint's classes,
 * and inherits text colour from its parent as `currentColor` does on the web.
 */
export function tw(Icon: React.ComponentType<any>) {
  function TwIcon({ className = '', color: colorProp, size: sizeProp, strokeWidth, fill: fillProp, style: styleProp }: any) {
    const { width: sw, height: sh, color: sc, fill: sf, ...style } = styleProp ?? {};
    const size = sizeProp ?? sw ?? sh;
    const color = colorProp ?? sc;
    const fill = fillProp ?? sf;
    const inherited = useInheritedText();
    const p = parseClasses(className);
    const toks = p.layout.split(' ').filter(Boolean);
    const dim = (axis: string) => sizeValue(toks.find((t) => t.startsWith(`${axis}-`)));
    const px = size ?? dim('w') ?? dim('h') ?? 24;

    const colorTok = p.text.color ?? inherited.color;
    const tint = color ?? (colorTok ? colorValue(colorTok.slice(5)) : undefined) ?? colors['ink-900'];
    const fillTok = toks.find((t) => t.startsWith('fill-'));
    const fillColor =
      (fill === 'currentColor' ? tint : fill) ?? (fillTok ? (fillTok === 'fill-current' ? tint : colorValue(fillTok.slice(5))) : undefined);

    const rest = toks.filter((t) => !/^(h|w|size|fill)-/.test(t)).join(' ');
    const glyph = <Icon size={px} color={tint} strokeWidth={strokeWidth} fill={fillColor ?? 'none'} />;
    const hasStyle = Object.keys(style).length > 0;
    if (p.anim) return <Div className={`${rest} animate-${p.anim}`} style={style}>{glyph}</Div>;
    if (rest || hasStyle) return <View className={rest} style={style}>{glyph}</View>;
    return glyph;
  }
  TwIcon.inlineIcon = true;
  return TwIcon;
}
