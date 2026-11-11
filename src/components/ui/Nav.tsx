import { Btn, Div, P, Span } from '../primitives/index'
import React, { createContext, useContext } from 'react'
import { ChevronLeft, Home, Stethoscope, CalendarDays, Package, User } from '../primitives/icons'
import { useNav, type TabId } from '../../navigation/navigation'
import { DEVICE, DirectStickyHeader, InTabs, tabBarInset } from './Screen'

/**
 * iOS-style navigation bar. Pinned below the Dynamic Island, translucent on
 * scroll, with an optional large-title variant used on section roots.
 */
export function ScreenHeader({
  title,
  subtitle,
  onBack,
  right,
  tone = 'light',
  border = true,
  transparent = false,
  backTo,
  embedded = false,
}: {
  title?: React.ReactNode
  subtitle?: React.ReactNode
  onBack?: () => void
  right?: React.ReactNode
  tone?: 'light' | 'dark'
  border?: boolean
  transparent?: boolean
  backTo?: string
  /** True when a parent already applies the sticky position and safe area. */
  embedded?: boolean
}) {
  const nav = useNav()
  const dark = tone === 'dark'
  const direct = useContext(DirectStickyHeader)
  const handleBack = onBack ?? (() => (backTo ? nav.navigate(backTo) : nav.back()))
  return (
    <Div
      className={`${embedded ? '' : 'z-40'} ${
        transparent ? '' : dark ? 'bg-ink-900/85 ' : 'bg-white/88 '
      } ${border && !transparent ? (dark ? '' : 'border-b border-ink-100') : ''}`}
      style={embedded ? undefined : { marginTop: direct ? 0 : -DEVICE.safeTop, paddingTop: DEVICE.safeTop }}
    >
      <Div className="relative flex-row h-[50px] items-center px-2">
        <Btn
          onPress={handleBack}
          className={`tap flex-col h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full ${
            transparent ? 'bg-white/88 shadow-tile ' : ''
          }`}
        >
          <ChevronLeft className={`h-[23px] w-[23px] ${dark ? 'text-white' : 'text-ink-800'}`} strokeWidth={2.4} />
        </Btn>
        <Div className="pointer-events-none absolute inset-x-[52px] text-center">
          {title && (
            <P className={`truncate text-title-sm ${dark ? 'text-white' : 'text-ink-900'}`}>{title}</P>
          )}
          {subtitle && (
            <P className={`truncate text-caption ${dark ? 'text-white/60' : 'text-ink-400'}`}>{subtitle}</P>
          )}
        </Div>
        <Div className="ml-auto flex-row shrink-0 items-center gap-1 pr-1">{right}</Div>
      </Div>
    </Div>
  )
}

/** Large-title header for section roots (Pharmacy, Diagnostics, Records...). */
export function LargeHeader({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string
  subtitle?: string
  onBack?: () => void
  right?: React.ReactNode
}) {
  const nav = useNav()
  return (
    <Div className="bg-white px-5 pb-4" style={{ marginTop: -DEVICE.safeTop, paddingTop: DEVICE.safeTop }}>
      <Div className="flex-row h-[50px] items-center justify-between">
        <Btn
          onPress={onBack ?? nav.back}
          className="tap -ml-2 flex-col h-[38px] w-[38px] items-center justify-center rounded-full"
        >
          <ChevronLeft className="h-[23px] w-[23px] text-ink-800" strokeWidth={2.4} />
        </Btn>
        <Div className="flex-row items-center gap-1">{right}</Div>
      </Div>
      <P className="mt-1 text-title-lg text-ink-900">{title}</P>
      {subtitle && <P className="mt-1 text-body text-ink-500">{subtitle}</P>}
    </Div>
  )
}

/* ------------------------------------------------------------ Bottom nav */

const TABS: { id: TabId; label: string; icon: React.ComponentType<any>; screen: string }[] = [
  { id: 'home', label: 'Home', icon: Home, screen: 'home' },
  { id: 'doctors', label: 'Doctors', icon: Stethoscope, screen: 'doctor-search' },
  { id: 'appointments', label: 'Appointments', icon: CalendarDays, screen: 'appointments' },
  { id: 'orders', label: 'Orders', icon: Package, screen: 'orders' },
  { id: 'profile', label: 'Profile', icon: User, screen: 'profile' },
]

/** True under the tab navigator, which draws this bar itself. */
export { InTabs }

export function BottomNav({ active }: { active: TabId }) {
  const nav = useNav()
  if (useContext(InTabs)) return null
  return <BottomNavBar active={active} onSelect={(t) => nav.resetTo(t.screen, t.id)} />
}
;(BottomNav as any).overlay = true

export function BottomNavBar({ active, onSelect }: { active: TabId; onSelect: (t: (typeof TABS)[number]) => void }) {
  return (
    <Div
      className="absolute inset-x-0 bottom-0 z-40 border-t border-ink-100 bg-white/94 "
      style={{ paddingBottom: tabBarInset() }}
    >
      <Div className="flex-row items-start justify-around px-1 pt-2">
        {TABS.map((t) => {
          const on = t.id === active
          const Icon = t.icon
          return (
            <Btn
              key={t.id}
              onPress={() => onSelect(t)}
              className="tap  w-[72px] flex-col items-center gap-[5px] pb-1"
            >
              <Icon
                className={`h-[23px] w-[23px] ${on ? 'text-brand-600' : 'text-ink-400'}`}
                strokeWidth={on ? 2.4 : 1.9}
              />
              <Span
                className={`whitespace-nowrap text-[10.5px] leading-none ${on ? 'font-bold text-brand-600' : 'font-medium text-ink-400'}`}
              >
                {t.label}
              </Span>
            </Btn>
          )
        })}
      </Div>
    </Div>
  )
}

/** Horizontal scroller that bleeds to the screen edges — iOS carousel pattern. */
export function HScroll({
  children,
  className = '',
  gap = 12,
  padX = 20,
  ...scroll
}: {
  children: React.ReactNode
  className?: string
  gap?: number
  padX?: number
  contentOffset?: { x: number; y: number }
}) {
  return (
    <Div
      className={` flex-row overflow-x-auto ${className}`}
      contentContainerStyle={{ gap, paddingLeft: padX, paddingRight: padX }}
      {...scroll}
    >
      {children}
    </Div>
  )
}

;(BottomNav as any).overlay = true

;(ScreenHeader as any).stickyHeader = true
