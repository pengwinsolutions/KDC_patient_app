import { Btn, Div, Img, P, Span } from '../primitives/index'
import { useLocal } from '../../hooks/useLocal'
import React, { useState } from 'react'
import { BadgeCheck, ChevronRight, Star, Minus, Plus } from '../primitives/icons'

/* ------------------------------------------------------------------ Avatar */

function initials(name: string) {
  return name
    .replace(/^Dr\.?\s+/i, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

export function Avatar({
  src,
  name,
  size = 44,
  radius,
  className = '',
  ring = false,
}: {
  src?: string
  name: string
  size?: number
  radius?: number
  className?: string
  ring?: boolean
}) {
  const [failed, setFailed] = useState(false)
  const r = radius ?? size * 0.34
  return (
    <Div
      className={`relative shrink-0 overflow-hidden bg-brand-50 ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: r,
        boxShadow: ring ? '0 0 0 2.5px #fff, 0 0 0 4px rgba(0,104,200,.18)' : undefined,
      }}
    >
      {src && !failed ? (
        <Img
          src={src}
          alt={name}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
          style={{ objectPosition: 'center 22%' }}
        />
      ) : (
        <Div className="flex-col h-full w-full items-center justify-center bg-brand-100">
          <Span className="font-display font-bold text-brand-700" style={{ fontSize: size * 0.36 }}>
            {initials(name)}
          </Span>
        </Div>
      )}
    </Div>
  )
}

export function VerifiedMark({ size = 15 }: { size?: number }) {
  return <BadgeCheck className="shrink-0 text-brand-600" style={{ width: size, height: size }} strokeWidth={2.4} />
}

/* ------------------------------------------------------------------- Badge */

type BadgeTone = 'brand' | 'success' | 'critical' | 'caution' | 'neutral' | 'info'

const badgeTones: Record<BadgeTone, string> = {
  brand: 'bg-brand-50 text-brand-700',
  success: 'bg-vital-50 text-vital-700',
  critical: 'bg-critical-50 text-critical-700',
  caution: 'bg-caution-50 text-caution-700',
  neutral: 'bg-ink-50 text-ink-600',
  info: 'bg-ink-900 text-white',
}

export function StatusBadge({
  children,
  tone = 'neutral',
  dot = false,
  icon,
  className = '',
}: {
  children: React.ReactNode
  tone?: BadgeTone
  dot?: boolean
  icon?: React.ReactNode
  className?: string
}) {
  const dotColor: Record<BadgeTone, string> = {
    brand: 'bg-brand-600',
    success: 'bg-vital-600',
    critical: 'bg-critical-600',
    caution: 'bg-caution-600',
    neutral: 'bg-ink-400',
    info: 'bg-white',
  }
  return (
    <Span
      className={`inline-flex flex-row shrink-0 items-center gap-1.5 rounded-[8px] px-2 py-[3px] text-micro font-semibold uppercase tracking-[.04em] ${badgeTones[tone]} ${className}`}
    >
      {dot && <Span className={`h-[5px] w-[5px] rounded-full ${dotColor[tone]}`} />}
      {icon}
      {children}
    </Span>
  )
}

/** Lower-case, sentence-style pill for metadata (languages, fee, duration). */
export function MetaChip({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <Span
      className={`inline-flex flex-row items-center gap-1 rounded-chip bg-ink-50 px-2.5 py-1 text-caption font-medium text-ink-600 ${className}`}
    >
      {children}
    </Span>
  )
}

export function FilterChip({
  children,
  active,
  onClick,
  icon,
}: {
  children: React.ReactNode
  active?: boolean
  onClick?: () => void
  icon?: React.ReactNode
}) {
  const [on, setOn] = useLocal(Boolean(active))
  return (
    <Btn
      onPress={onClick ?? (() => setOn(!on))}
      className={`tap inline-flex flex-row shrink-0 items-center gap-1.5 whitespace-nowrap rounded-chip px-3.5 py-[9px] text-body-sm font-semibold  ${
        on ? 'bg-brand-600 text-white' : 'bg-white text-ink-600 ring-1 ring-inset  ring-ink-200'
      }`}
    >
      {icon}
      {children}
    </Btn>
  )
}

/* ------------------------------------------------------------------ Rating */

export function Rating({
  value,
  count,
  size = 13,
  showValue = true,
  className = '',
}: {
  value: number
  count?: number
  size?: number
  showValue?: boolean
  className?: string
}) {
  return (
    <Span className={`inline-flex flex-row items-center gap-1 ${className}`}>
      <Star className="text-caution-600" style={{ width: size, height: size }} fill="currentColor" strokeWidth={0} />
      {showValue && <Span className="text-body-sm font-semibold tabular-nums text-ink-800">{value.toFixed(1)}</Span>}
      {count !== undefined && <Span className="text-body-sm text-ink-400">({count.toLocaleString('en-IN')})</Span>}
    </Span>
  )
}

export function StarPicker({
  value = 0,
  size = 38,
  onChange,
}: {
  value?: number
  size?: number
  onChange?: (v: number) => void
}) {
  const [rating, setRating] = useLocal(value, onChange)
  return (
    <Div className="flex-row justify-center gap-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <Btn key={i} onPress={() => setRating(i)} accessibilityLabel={`${i} star${i > 1 ? 's' : ''}`}>
          <Star
            style={{ width: size, height: size }}
            className={i <= rating ? 'text-caution-600' : 'text-ink-200'}
            fill="currentColor"
            strokeWidth={0}
          />
        </Btn>
      ))}
    </Div>
  )
}

/* ------------------------------------------------------- Surfaces & layout */

export function Card({
  children,
  className = '',
  onClick,
  padded = true,
  elevation = 'tile',
}: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  padded?: boolean
  elevation?: 'none' | 'tile' | 'card' | 'lift'
}) {
  const shadow = { none: '', tile: 'shadow-tile', card: 'shadow-card', lift: 'shadow-lift' }[elevation]
  const Tag: any = onClick ? Btn : Div
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`w-full rounded-card bg-white text-left ${shadow} ${padded ? 'p-4' : ''} ${
        onClick ? 'tap' : ''
      } ${className}`}
    >
      {children}
    </Tag>
  )
}

export function SectionHeader({
  title,
  action,
  onAction,
  className = '',
  subtitle,
}: {
  title: string
  action?: string
  onAction?: () => void
  className?: string
  subtitle?: string
}) {
  return (
    <Div className={`flex-row items-end justify-between gap-3 px-5 ${className}`}>
      <Div className="min-w-0 flex-1">
        <P className="text-title-sm text-ink-900">{title}</P>
        {subtitle && <P className="mt-0.5 text-body-sm text-ink-500">{subtitle}</P>}
      </Div>
      {action && (
        <Btn onPress={onAction} className="tap shrink-0 text-body-sm font-semibold text-brand-600">
          {action}
        </Btn>
      )}
    </Div>
  )
}

export function ListRow({
  icon,
  title,
  subtitle,
  trailing,
  onClick,
  danger,
  last,
}: {
  icon?: React.ReactNode
  title: React.ReactNode
  subtitle?: React.ReactNode
  trailing?: React.ReactNode
  onClick?: () => void
  danger?: boolean
  last?: boolean
}) {
  return (
    <Btn
      onPress={onClick}
      className={`tap flex-row w-full items-center gap-3.5 bg-white px-4 py-[13px] text-left ${last ? '' : 'border-b-[0.5px] border-ink-900/10'}`}
    >
      {icon && (
        <Span
          className={`flex-col h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] ${
            danger ? 'bg-critical-50 text-critical-600' : 'bg-brand-50 text-brand-600'
          }`}
        >
          {icon}
        </Span>
      )}
      <Span className="min-w-0 flex-1">
        <Span className={`block truncate text-body-lg ${danger ? 'text-critical-600' : 'text-ink-900'}`}>{title}</Span>
        {subtitle && <Span className="mt-[1px] block truncate text-body-sm text-ink-400">{subtitle}</Span>}
      </Span>
      {trailing ?? <ChevronRight className="h-[18px] w-[18px] shrink-0 text-ink-300" strokeWidth={2.2} />}
    </Btn>
  )
}

export function Group({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <Div className={`overflow-hidden rounded-card bg-white shadow-tile ${className}`}>{children}</Div>
}

export function KeyValue({
  label,
  value,
  strong,
  tone = 'default',
}: {
  label: React.ReactNode
  value: React.ReactNode
  strong?: boolean
  tone?: 'default' | 'success' | 'critical'
}) {
  const toneCls = { default: 'text-ink-900', success: 'text-vital-700', critical: 'text-critical-600' }[tone]
  return (
    <Div className="flex-row items-start justify-between gap-6 py-[7px]">
      <Span className="text-body text-ink-500">{label}</Span>
      <Span className={`text-right text-body ${strong ? 'font-bold' : 'font-semibold'} ${toneCls}`}>{value}</Span>
    </Div>
  )
}

export function Divider({ className = '' }: { className?: string }) {
  return <Div className={`h-px bg-ink-100 ${className}`} />
}

/* --------------------------------------------------------------- Selection */

export function Segmented({
  options,
  value,
  onChange,
  className = '',
  fit = false,
}: {
  options: { id: string; label: string; count?: number }[]
  value: string
  onChange?: (id: string) => void
  className?: string
  /** Size to the labels, as the web control does inside a content-sized row. */
  fit?: boolean
}) {
  const [current, select] = useLocal(value, onChange)
  return (
    <Div className={`flex-row gap-1 rounded-ctl bg-ink-50 p-1 ${className}`}>
      {options.map((o) => (
        <Btn
          key={o.id}
          onPress={() => select(o.id)}
          style={fit ? { flexGrow: 0, flexShrink: 0, flexBasis: 'auto' } : undefined}
          className={`tap ${fit ? 'whitespace-nowrap' : 'flex-1'} rounded-[11px] py-[9px] text-body-sm font-semibold  ${
            current === o.id ? 'bg-white text-ink-900 shadow-tile' : 'text-ink-500'
          }`}
        >
          {o.label}
          {o.count !== undefined && <Span className="ml-1 opacity-60">{o.count}</Span>}
        </Btn>
      ))}
    </Div>
  )
}

export function Tabs({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[]
  value: string
  onChange?: (id: string) => void
}) {
  const [current, select] = useLocal(value, onChange)
  return (
    <Div className="flex-row gap-6 border-b border-ink-100 px-5">
      {options.map((o) => (
        <Btn
          key={o.id}
          onPress={() => select(o.id)}
          className={`relative -mb-px pb-3 pt-1 text-body font-semibold  ${
            current === o.id ? 'text-brand-600' : 'text-ink-400'
          }`}
        >
          {o.label}
          {current === o.id && <Span className="absolute inset-x-0 bottom-0 h-[2.5px] rounded-full bg-brand-600" />}
        </Btn>
      ))}
    </Div>
  )
}

export function Stepper({ value = 1, onChange, min = 1 }: { value?: number; onChange?: (v: number) => void; min?: number }) {
  const [count, setCount] = useLocal(value, onChange)
  return (
    <Div className="flex-row h-[32px] items-center gap-0.5 rounded-[10px] bg-brand-50 p-0.5">
      <Btn
        onPress={() => setCount(Math.max(min, count - 1))}
        className="tap flex-col h-[28px] w-[28px] items-center justify-center rounded-[8px] text-brand-700"
      >
        <Minus className="h-[14px] w-[14px]" strokeWidth={2.6} />
      </Btn>
      <Span className="w-[22px] text-center text-body-sm font-bold tabular-nums text-ink-900">{count}</Span>
      <Btn
        onPress={() => setCount(count + 1)}
        className="tap flex-col h-[28px] w-[28px] items-center justify-center rounded-[8px] bg-white text-brand-700 shadow-tile"
      >
        <Plus className="h-[14px] w-[14px]" strokeWidth={2.6} />
      </Btn>
    </Div>
  )
}

/**
 * Progress through a linear sign-up flow. Segments fill up to and including the
 * current step, so the bar reads as "how far in am I", not "how much is done".
 */
export function StepBar({
  step,
  total,
  className = '',
}: {
  step: number
  total: number
  className?: string
}) {
  return (
    <Div className={className}>
      <Div className="flex-row items-center gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <Span key={i} className={`h-[4px] flex-1 rounded-full ${i < step ? 'bg-brand-600' : 'bg-ink-100'}`} />
        ))}
      </Div>
      <P className="mt-2.5 text-caption font-semibold text-ink-400">
        Step {step} of {total}
      </P>
    </Div>
  )
}

export function ProgressDots({
  total,
  index,
  tone = 'light',
}: {
  total: number
  index: number
  /** 'dark' inverts the dots for use on an ink surface. */
  tone?: 'light' | 'dark'
}) {
  const on = tone === 'dark' ? 'bg-white' : 'bg-brand-600'
  const off = tone === 'dark' ? 'bg-white/25' : 'bg-ink-200'
  return (
    <Div className="flex-row items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <Span
          key={i}
          className={`h-[6px] rounded-full  ${i === index ? `w-[22px] ${on}` : `w-[6px] ${off}`}`}
        />
      ))}
    </Div>
  )
}

export function ProgressBar({ pct, tone = 'brand' }: { pct: number; tone?: 'brand' | 'success' | 'caution' }) {
  const bg = { brand: 'bg-brand-600', success: 'bg-vital-600', caution: 'bg-caution-600' }[tone]
  return (
    <Div className="h-[6px] w-full overflow-hidden rounded-full bg-ink-100">
      <Div className={`h-full rounded-full ${bg} `} style={{ width: `${pct}%` }} />
    </Div>
  )
}
