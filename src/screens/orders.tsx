import { Btn, Div, P, Span } from '../components/primitives/index'
import React from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Pill, FlaskConical, ChevronRight, Clock, Check, AlertTriangle, X } from '../components/primitives/icons'
import { Screen, DEVICE } from '../components/ui/Screen'
import { BottomNav, ScreenHeader } from '../components/ui/Nav'
import { Card, Segmented, StatusBadge } from '../components/ui/Display'
import { Field, Input } from '../components/ui/Inputs'
import { BLOOD_GROUPS, ChoiceChips, FormInput } from '../components/forms/Fields'
import { Button, StickyBar } from '../components/ui/Button'
import { rupee } from '../mock-data/mock'
import { useNav } from '../navigation/navigation'
import { syncOne } from '../services/live/sync'
import '../services/live/sync-commerce'
import { useOrders } from '../store/orders'
import { getLab, getMedicine, getTest } from '../store/catalog'
import { useProfile } from '../store/profile'
import { useNow } from '../hooks/useNow'
import { services } from '../services'
import { diagnosticRow, orderTestTitle, pharmacyRow, type OrderRow } from '../domain/orderTracking'
import { formatMobile, medicalSchema, medicalSchemaLive, type MedicalForm } from '../validation/schemas'
import { LIVE } from '../services/config'
import { errorMessage } from '../services/errors'
import { showToast } from '../store/toast'

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

/* =============================== 50b — Edit medical information =========== */

type MedicalListKey = 'allergies' | 'conditions' | 'medications' | 'surgeries'

export function MedicalInfoEditScreen() {
  const nav = useNav()
  const medical = useProfile((s) => s.medical)
  const [lists, setLists] = React.useState<Record<MedicalListKey, string[]>>({
    allergies: medical.allergies,
    conditions: medical.conditions,
    medications: medical.medications,
    surgeries: medical.surgeries,
  })
  const { control, handleSubmit, watch, setValue, formState } = useForm<MedicalForm>({
    resolver: zodResolver(LIVE ? (medicalSchemaLive as unknown as typeof medicalSchema) : medicalSchema),
    defaultValues: {
      bloodGroup: medical.bloodGroup,
      height: medical.height,
      weight: medical.weight,
      emergencyName: medical.emergency.name,
      emergencyRelation: medical.emergency.relation,
      emergencyMobile: medical.emergency.mobile,
    },
  })
  const addTo = (key: MedicalListKey) => (value: string) =>
    setLists((l) => (l[key].includes(value) ? l : { ...l, [key]: [...l[key], value] }))
  const removeFrom = (key: MedicalListKey) => (value: string) =>
    setLists((l) => ({ ...l, [key]: l[key].filter((v) => v !== value) }))

  const save = handleSubmit(async (form) => {
    const unit = (v: string, u: string) => (v.trim() ? `${v.replace(new RegExp(`\\s*${u}$`, 'i'), '')} ${u}` : '')
    let saved
    try {
      saved = await services.profile.saveMedical({
        ...lists,
        bloodGroup: form.bloodGroup,
        height: LIVE ? unit(form.height, 'cm') : `${form.height.replace(/\s*cm$/i, '')} cm`,
        weight: LIVE ? unit(form.weight, 'kg') : `${form.weight.replace(/\s*kg$/i, '')} kg`,
        emergency: {
          name: form.emergencyName.trim(),
          relation: form.emergencyRelation.trim(),
          mobile: form.emergencyMobile.trim() ? formatMobile(form.emergencyMobile) : '',
        },
      })
    } catch (e) {
      showToast(errorMessage(e, 'Could not save your medical information. Please try again.'), 'critical')
      return
    }
    useProfile.getState().setMedical(saved)
    nav.back()
  })

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <EditHeader onBack={nav.back} />
      <Div className="flex-1 gap-3 px-5 pb-[130px] pt-4">
        <Card elevation="tile">
          <Controller
            control={control}
            name="bloodGroup"
            render={({ fieldState }) => (
              <Field label="Blood group" required error={fieldState.error?.message}>
                <Div className="flex-row flex-wrap gap-2">
                  <ChoiceChips
                    options={BLOOD_GROUPS}
                    value={watch('bloodGroup')}
                    onChange={(b) => setValue('bloodGroup', b)}
                    chipClass="tap h-[40px] w-[58px] rounded-chip text-body-sm font-bold "
                  />
                </Div>
              </Field>
            )}
          />
        </Card>

        <Card elevation="tile" className="!bg-critical-50">
          <Div className="mb-2 flex-row items-center gap-2.5">
            <AlertTriangle className="h-[16px] w-[16px] shrink-0 text-critical-600" strokeWidth={2.3} />
            <P className="text-[11px] font-bold uppercase tracking-[.08em] text-critical-700">Allergies</P>
          </Div>
          <P className="mb-2.5 text-caption leading-[17px] text-critical-700/80">
            Shown to every doctor you consult and printed on every prescription. Add anything you react to.
          </P>
          <Div className="mb-2.5 flex-row flex-wrap gap-2">
            {lists.allergies.map((a) => (
              <Span key={a} className="inline-flex flex-row items-center gap-2 rounded-chip bg-white px-3 py-1.5 text-body-sm font-bold text-critical-700">
                {a}
                <Btn accessibilityLabel={`Remove ${a}`} hitSlop={8} onPress={() => removeFrom('allergies')(a)}>
                  <X className="h-[12px] w-[12px]" strokeWidth={2.8} />
                </Btn>
              </Span>
            ))}
          </Div>
          <EntryInput placeholder="Add an allergy and press enter" className="!bg-white" onAdd={addTo('allergies')} />
        </Card>

        <EditList title="Existing conditions" items={lists.conditions} placeholder="Add a condition" onAdd={addTo('conditions')} onRemove={removeFrom('conditions')} />
        <EditList title="Current medications" items={lists.medications} placeholder="Add a medicine" onAdd={addTo('medications')} onRemove={removeFrom('medications')} />
        <EditList title="Previous surgeries" items={lists.surgeries} placeholder="Add a surgery" onAdd={addTo('surgeries')} onRemove={removeFrom('surgeries')} />

        <Card elevation="tile">
          <P className="mb-2.5 text-[11px] font-bold uppercase tracking-[.08em] text-ink-500">Measurements</P>
          <Div className=" grid-cols-2 gap-3">
            <FormInput control={control} name="height" label="Height" />
            <FormInput control={control} name="weight" label="Weight" />
          </Div>
        </Card>

        <Card elevation="tile">
          <P className="mb-2.5 text-[11px] font-bold uppercase tracking-[.08em] text-ink-500">Emergency contact</P>
          <Div className="gap-3">
            <FormInput control={control} name="emergencyName" label="Name" />
            <Div className=" grid-cols-2 gap-3">
              <FormInput control={control} name="emergencyRelation" label="Relationship" />
              <FormInput control={control} name="emergencyMobile" label="Mobile" inputMode="numeric" />
            </Div>
          </Div>
        </Card>
      </Div>

      <StickyBar>
        <Button loading={formState.isSubmitting} onClick={save}>
          Save medical information
        </Button>
      </StickyBar>
    </Screen>
  )
}

function EditHeader({ onBack }: { onBack: () => void }) {
  return <ScreenHeader title="Edit medical information" onBack={onBack} />
}
;(EditHeader as any).stickyHeader = true

/** A text field whose submitted value joins a list, then clears. */
function EntryInput({ onAdd, ...input }: Record<string, any> & { onAdd: (value: string) => void }) {
  const [text, setText] = React.useState('')
  const commit = () => {
    const value = text.trim()
    if (value) onAdd(value)
    setText('')
  }
  return <Input value={text} onChangeText={setText} onSubmitEditing={commit} onBlur={commit} returnKeyType="done" {...input} />
}

function EditList({
  title,
  items,
  placeholder,
  onAdd,
  onRemove,
}: {
  title: string
  items: string[]
  placeholder: string
  onAdd: (value: string) => void
  onRemove: (value: string) => void
}) {
  return (
    <Card elevation="tile">
      <P className="mb-2.5 text-[11px] font-bold uppercase tracking-[.08em] text-ink-500">{title}</P>
      <Div className="mb-2.5 gap-2">
        {items.map((i) => (
          <Div key={i} className="flex-row items-center gap-2.5 rounded-[11px] bg-ink-50 px-3.5 py-2.5">
            <Span className="h-[5px] w-[5px] shrink-0 rounded-full bg-ink-400" />
            <P className="min-w-0 flex-1 text-body text-ink-800">{i}</P>
            <Btn accessibilityLabel={`Remove ${i}`} hitSlop={8} onPress={() => onRemove(i)}>
              <X className="h-[14px] w-[14px] shrink-0 text-ink-400" strokeWidth={2.4} />
            </Btn>
          </Div>
        ))}
      </Div>
      <EntryInput placeholder={placeholder} onAdd={onAdd} />
    </Card>
  )
}
