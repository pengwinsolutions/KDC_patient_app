import { Btn, Div, Span } from '../primitives/index'
import React, { useContext } from 'react'
import { FooterLayout, footerInset } from './Screen'
import { Loader2 } from '../primitives/icons'

type Variant = 'primary' | 'secondary' | 'tertiary' | 'text' | 'danger' | 'success' | 'onDark' | 'light'
type Size = 'lg' | 'md' | 'sm'

const base =
  'tap relative inline-flex flex-row  items-center justify-center gap-2 font-semibold  disabled:opacity-40'

const variants: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white shadow-cta active:bg-brand-700',
  secondary: 'bg-brand-50 text-brand-700 active:bg-brand-100',
  tertiary: 'bg-white text-ink-800 ring-1 ring-inset  ring-ink-200 shadow-tile active:bg-ink-50',
  text: 'bg-transparent text-brand-600 active:opacity-70',
  danger: 'bg-critical-600 text-white active:bg-critical-700',
  success: 'bg-vital-600 text-white active:bg-vital-700',
  onDark: 'bg-white/14 text-white ring-1 ring-inset  ring-white/22  active:bg-white/22',
  light: 'bg-white text-ink-900 shadow-[0_8px_24px_-10px_rgba(0,0,0,.6)] active:bg-ink-50',
}

const sizes: Record<Size, string> = {
  lg: 'h-[54px] rounded-ctl px-6 text-body-lg',
  md: 'h-[44px] rounded-ctl px-5 text-body',
  sm: 'h-[34px] rounded-chip px-3.5 text-body-sm',
}

export function Button({
  children,
  variant = 'primary',
  size = 'lg',
  block = true,
  loading = false,
  icon,
  iconRight,
  className = '',
  ...rest
}: Record<string, any> & {
  variant?: Variant
  size?: Size
  block?: boolean
  loading?: boolean
  icon?: React.ReactNode
  iconRight?: React.ReactNode
}) {
  return (
    <Btn
      className={`${base} ${variants[variant]} ${sizes[size]} ${block ? 'w-full' : ''} ${
        variant === 'text' ? '' : ''
      } ${className}`}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading ? (
        <Loader2 className="h-[18px] w-[18px] animate-spinSlow" />
      ) : (
        <>
          {icon}
          <Span>{children}</Span>
          {iconRight}
        </>
      )}
    </Btn>
  )
}

/** Circular icon-only control (call controls, close buttons, steppers). */
export function IconButton({
  children,
  size = 44,
  tone = 'neutral',
  className = '',
  label,
  ...rest
}: Record<string, any> & {
  size?: number
  tone?: 'neutral' | 'brand' | 'danger' | 'glass' | 'glassActive' | 'success'
  label?: string
}) {
  const tones: Record<string, string> = {
    neutral: 'bg-ink-50 text-ink-700 active:bg-ink-100',
    brand: 'bg-brand-600 text-white shadow-cta',
    danger: 'bg-critical-600 text-white',
    success: 'bg-vital-600 text-white',
    glass: 'bg-white/14 text-white ring-1 ring-inset  ring-white/20 ',
    glassActive: 'bg-white text-ink-900',
  }
  return (
    <Btn
      className={`tap flex-col shrink-0 items-center justify-center rounded-full ${tones[tone]} ${className}`}
      style={{ width: size, height: size }}
      accessibilityLabel={label}
      {...rest}
    >
      {children}
    </Btn>
  )
}

/** Sticky bottom action bar — the standard place for a screen's primary CTA. */
export function StickyBar({
  children,
  className = '',
  blur = true,
}: {
  children: React.ReactNode
  className?: string
  blur?: boolean
}) {
  const reportHeight = useContext(FooterLayout)
  return (
    <Div
      className={`absolute inset-x-0 bottom-0 z-30 border-t border-ink-100 px-5 pt-3.5 ${
        blur ? 'bg-white/92 ' : 'bg-white'
      } ${className}`}
      style={{ paddingBottom: footerInset() }}
      // Its Screen keeps the end of the page above this height.
      onLayout={(e: { nativeEvent: { layout: { height: number } } }) => reportHeight?.(e.nativeEvent.layout.height)}
    >
      {children}
    </Div>
  )
}

;(StickyBar as any).overlay = true
;(StickyBar as any).footerBar = true
