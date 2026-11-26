import { Btn, Div, P, Span } from '../components/primitives/index'
import React from 'react'
import { Pill, FlaskConical, ChevronRight, Clock, Check } from '../components/primitives/icons'
import { Screen, DEVICE } from '../components/ui/Screen'
import { BottomNav } from '../components/ui/Nav'
import { Card, Segmented, StatusBadge } from '../components/ui/Display'
import { Button } from '../components/ui/Button'
import { rupee } from '../mock-data/mock'
import { useNav } from '../navigation/navigation'
import { syncOne } from '../services/live/sync'
import '../services/live/sync-commerce'
import { useOrders } from '../store/orders'
import { getLab, getMedicine, getTest } from '../store/catalog'
import { useNow } from '../hooks/useNow'
import { diagnosticRow, orderTestTitle, paiseRupees, pharmacyRow, RETURN_STATUS_LABEL, RETURN_STATUS_TONE, type OrderRow } from '../domain/orderTracking'
import { loadMyReturns, useAfterSales } from '../services/live/returns'
import { LIVE } from '../services/config'

/* ======================================== 34a — Orders (pharmacy + labs) == */

/**
 * The Orders tab needs a hub. A patient can have a medicine order and a lab
 * booking running at once; sending the tab straight to one order's tracking
 * screen hides the other.
 */

export function OrdersScreen() {
  const nav = useNav()
  const pharmacy = useOrders((s) => s.pharmacy)
  const diagnostics = useOrders((s) => s.diagnostics)
  const now = useNow(5000)
  const [segment, setSegment] = React.useState<'all' | 'meds' | 'tests'>('all')
  useLiveOrdersRefresh()
  const returns = useAfterSales((s) => s.mine) ?? []
  React.useEffect(() => {
    if (LIVE) void loadMyReturns().catch(() => undefined)
  }, [])
  const pharmacyRows = pharmacy.map((o) => pharmacyRow(o, (id) => getMedicine(id).name, now))
  const testRows = diagnostics.map((o) =>
    diagnosticRow(o, o.title || orderTestTitle(getTest(o.testId)), o.labName ?? getLab(o.labId).name, now),
  )
  const showing = (r: OrderRow) => segment === 'all' || (segment === 'meds' ? r.kind === 'pharmacy' : r.kind === 'diagnostics')
  const active = [...pharmacyRows, ...testRows].filter((o) => o.live && showing(o))
  const past = [...testRows, ...pharmacyRows].filter((o) => !o.live && showing(o))
  const open = (o: OrderRow) => nav.navigate(o.screen, { params: { id: o.id } })

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <Div
        className="sticky z-30 bg-white"
        style={{ marginTop: -DEVICE.safeTop, paddingTop: DEVICE.safeTop, top: -DEVICE.safeTop }}
      >
        <P className="px-5 pb-3 pt-4 text-title-lg text-ink-900">Orders</P>
        <Div className="px-5 pb-3.5">
          <Segmented
            options={[
              { id: 'all', label: 'All', count: pharmacyRows.length + testRows.length },
              { id: 'meds', label: 'Medicines', count: pharmacyRows.length },
              { id: 'tests', label: 'Lab tests', count: testRows.length },
            ]}
            value={segment}
            onChange={(id) => setSegment(id as typeof segment)}
          />
        </Div>
      </Div>

      <Div className="gap-5 px-5 pb-[112px] pt-4">
        {active.length > 0 && (
          <Div>
            <P className="mb-2.5 text-caption font-bold uppercase tracking-[.08em] text-ink-400">In progress</P>
            <Div className="gap-2.5">
              {active.map((o) => (
                <OrderCard key={o.id} order={o} onClick={() => open(o)} />
              ))}
            </Div>
          </Div>
        )}

        {past.length > 0 && (
          <Div>
            <P className="mb-2.5 text-caption font-bold uppercase tracking-[.08em] text-ink-400">Completed</P>
            <Div className="gap-2.5">
              {past.map((o) => (
                <OrderCard key={o.id} order={o} onClick={() => open(o)} />
              ))}
            </Div>
          </Div>
        )}

        {returns.length > 0 && segment !== 'tests' && (
          <Div>
            <P className="mb-2.5 text-caption font-bold uppercase tracking-[.08em] text-ink-400">My returns</P>
            <Card elevation="tile" padded={false} className="overflow-hidden">
              {returns.map((r, i) => {
                const packs = r.lines.reduce((t, l) => t + l.qty, 0)
                const money = r.refund ? `${paiseRupees(r.refund.amountPaise)} refunded` : r.creditNote ? `${paiseRupees(r.creditNote.totalPaise)} to refund` : null
                return (
                  <Btn
                    key={r.code}
                    onPress={() => nav.navigate('order-tracking', { params: { id: r.orderCode } })}
                    accessibilityLabel={`Return ${r.code}`}
                    className={`tap flex-row w-full items-center gap-3 px-4 py-3 text-left ${i ? 'border-t border-ink-100' : ''}`}
                  >
                    <Div className="min-w-0 flex-1">
                      <P className="truncate text-body-sm font-semibold text-ink-900">
                        {r.reasonLabel} · {packs} {packs === 1 ? 'pack' : 'packs'}
                      </P>
                      <P className="truncate text-caption tabular-nums text-ink-400">
                        {r.orderCode}
                        {money ? ` · ${money}` : ''}
                      </P>
                    </Div>
                    <StatusBadge tone={RETURN_STATUS_TONE[r.status]}>{RETURN_STATUS_LABEL[r.status]}</StatusBadge>
                    <ChevronRight className="h-[16px] w-[16px] shrink-0 text-ink-300" />
                  </Btn>
                )
              })}
            </Card>
          </Div>
        )}

        <Div className=" grid-cols-2 gap-2.5">
          <Button variant="tertiary" onClick={() => nav.navigate('pharmacy')}>
            Order medicines
          </Button>
          <Button variant="tertiary" onClick={() => nav.navigate('diagnostics')}>
            Book a test
          </Button>
        </Div>
      </Div>

      <BottomNav active="orders" />
    </Screen>
  )
}

/** Live: the server's orders, reloaded when the screen opens and every 30 seconds while it's showing. */
export function useLiveOrdersRefresh() {
  React.useEffect(() => {
    if (!LIVE) return
    const reload = () => void syncOne('orders').catch(() => undefined)
    reload()
    const timer = setInterval(reload, 30_000)
    return () => clearInterval(timer)
  }, [])
}

function OrderCard({ order, onClick }: { order: OrderRow; onClick?: () => void }) {
  const Icon = order.kind === 'pharmacy' ? Pill : FlaskConical
  return (
    <Card onClick={onClick} elevation="tile" padded={false} className="overflow-hidden">
      <Div className="flex-row items-start gap-3.5 p-4">
        <Span
          className={`flex-col h-[42px] w-[42px] shrink-0 items-center justify-center rounded-tile ${
            order.kind === 'pharmacy' ? 'bg-brand-50' : 'bg-vital-50'
          }`}
        >
          <Icon
            className={`h-[19px] w-[19px] ${order.kind === 'pharmacy' ? 'text-brand-600' : 'text-vital-600'}`}
            strokeWidth={2}
          />
        </Span>
        <Div className="min-w-0 flex-1">
          <Div className="flex-row items-start justify-between gap-2">
            <P className="min-w-0 flex-1 truncate text-title-sm text-ink-900">{order.title}</P>
            <StatusBadge tone={order.tone} dot={order.live}>
              {order.status}
            </StatusBadge>
          </Div>
          <P className="mt-0.5 truncate text-body-sm text-ink-500">{order.sub}</P>
          <P className="mt-1.5 truncate text-caption tabular-nums text-ink-400">{order.id}</P>
        </Div>
      </Div>

      <Div className="flex-row items-center gap-2 border-t border-ink-100 bg-ink-50/60 px-4 py-2.5">
        {order.live ? (
          <Clock className="h-[14px] w-[14px] shrink-0 text-brand-600" strokeWidth={2.2} />
        ) : (
          <Check className="h-[14px] w-[14px] shrink-0 text-vital-600" strokeWidth={2.6} />
        )}
        <Span className="min-w-0 flex-1 truncate text-body-sm font-semibold text-ink-800">{order.when}</Span>
        <Span className="shrink-0 text-body-sm font-bold tabular-nums text-ink-900">{rupee(order.amount)}</Span>
        <ChevronRight className="h-[16px] w-[16px] shrink-0 text-ink-300" />
      </Div>
    </Card>
  )
}





