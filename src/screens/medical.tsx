/**
 * Medical information: what every doctor sees before a consultation and the pharmacy checks
 * against. One record per family member. The view shows what's recorded and what's still
 * missing; the editor opens at the section that was tapped, offers one-tap suggestions, checks
 * values by the server's own limits, and never loses unsaved changes without asking.
 * Rules: src/domain/medical. Data: src/hooks/useMedicalRecord.
 */
import React from 'react'
import { Linking } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Btn, Div, P, Span } from '../components/primitives/index'
import { AlertTriangle, Check, HeartPulse, Phone, Pill, Plus, Scissors, ShieldCheck, UserRound, X } from '../components/primitives/icons'
import { Screen } from '../components/ui/Screen'
import { HScroll, ScreenHeader } from '../components/ui/Nav'
import { Button, IconButton, StickyBar } from '../components/ui/Button'
import { Avatar, Card, Divider, ProgressBar } from '../components/ui/Display'
import { Modal, Skeleton, StateBlock } from '../components/ui/Feedback'
import { Field, Input } from '../components/ui/Inputs'
import { FormInput } from '../components/forms/Fields'
import { useNav } from '../navigation/navigation'
import { useMedicalRecord } from '../hooks/useMedicalRecord'
import { useFamily } from '../store/family'
import { showToast } from '../store/toast'
import { errorMessage } from '../services/errors'
import {
  addEntry,
  API_BLOOD_GROUPS,
  bmi,
  BLOOD_UNKNOWN,
  EMERGENCY_RELATIONS,
  essentials,
  openSuggestions,
  parseMeasure,
  toApiBlood,
  toDisplayBlood,
  withUnit,
  type BmiBand,
  type MedicalListKey,
} from '../domain/medical'
import { formatMobile, medicalSchema, normalizeMobile, type MedicalForm } from '../validation/schemas'
import type { MedicalInfo } from '../types'

type Section = MedicalListKey | 'bloodGroup' | 'measurements' | 'emergency'

const LISTS: { key: MedicalListKey; title: string; Icon: React.ComponentType<any>; empty: string; placeholder: string }[] = [
  { key: 'conditions', title: 'Existing conditions', Icon: HeartPulse, empty: 'No conditions recorded', placeholder: 'Add a condition' },
  { key: 'medications', title: 'Current medication', Icon: Pill, empty: 'No regular medicines recorded', placeholder: 'Add a medicine and its dose' },
  { key: 'surgeries', title: 'Previous surgeries', Icon: Scissors, empty: 'No surgeries recorded', placeholder: 'Add a surgery and year' },
]

const BAND_TONE: Record<BmiBand, string> = {
  Underweight: 'bg-caution-50 text-caution-700',
  Healthy: 'bg-vital-50 text-vital-700',
  Overweight: 'bg-caution-50 text-caution-700',
  Obese: 'bg-critical-50 text-critical-700',
}

/* ================================================ Medical information ==== */

export function MedicalInfoScreen() {
  const nav = useNav()
  const members = useFamily((s) => s.members)
  const [memberId, setMemberId] = React.useState<string | undefined>(nav.params.memberId)
  const record = useMedicalRecord(memberId)
  const m = record.medical
  const edit = (focus?: Section) => nav.navigate('medical-info-edit', { params: { memberId: record.member?.id, focus } })

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader
        title="Medical information"
        right={
          m && (
            <Btn onPress={() => edit()} className="tap px-2 text-body-sm font-semibold text-brand-600">
              Edit
            </Btn>
          )
        }
      />

      <Div className="flex-1 gap-3 px-5 pb-[40px] pt-4">
        {members.length > 1 && (
          <Div className="-mx-5">
            <HScroll gap={8}>
              {members.map((f) => {
                const on = f.id === record.member?.id
                return (
                  <Btn
                    key={f.id}
                    onPress={() => setMemberId(f.id)}
                    accessibilityLabel={`${f.name}${on ? ', selected' : ''}`}
                    className={`tap flex-row items-center gap-2 rounded-chip py-1.5 pl-1.5 pr-3.5 ${on ? 'bg-brand-600' : 'bg-white ring-1 ring-inset ring-ink-200'}`}
                  >
                    <Avatar name={f.name} size={26} radius={13} />
                    <Span className={`text-body-sm font-semibold ${on ? 'text-white' : 'text-ink-700'}`}>{f.primary ? 'You' : f.name.split(' ')[0]}</Span>
                  </Btn>
                )
              })}
            </HScroll>
          </Div>
        )}

        {record.loading ? (
          <Div className="gap-3">
            <Skeleton className="h-[120px] w-full" rounded={18} />
            <Skeleton className="h-[84px] w-full" rounded={18} />
            <Skeleton className="h-[110px] w-full" rounded={18} />
          </Div>
        ) : record.error || !m ? (
          <StateBlock
            icon={<HeartPulse className="h-[24px] w-[24px]" strokeWidth={2} />}
            tone="critical"
            title="Couldn’t load the medical information"
            body={errorMessage(record.error, 'Check your connection and try again.')}
            primary={<Button onClick={record.reload}>Try again</Button>}
          />
        ) : (
          <>
            <Overview name={record.member?.name ?? 'You'} relation={record.isSelf ? 'You' : record.member?.relation} age={record.member?.age} medical={m} onFix={edit} />
            <Vitals medical={m} age={record.member?.age} onEdit={edit} />
            <Allergies items={m.allergies} onEdit={() => edit('allergies')} />
            {LISTS.map((l) => (
              <ListCard key={l.key} Icon={l.Icon} title={l.title} empty={l.empty} items={m[l.key]} onAdd={() => edit(l.key)} />
            ))}
            <EmergencyCard contact={m.emergency} onEdit={() => edit('emergency')} />
          </>
        )}
      </Div>
    </Screen>
  )
}

/** Who this is, that doctors see it, and which essentials are still missing. */
function Overview({ name, relation, age, medical, onFix }: { name: string; relation?: string; age?: number; medical: MedicalInfo; onFix: (s: Section) => void }) {
  const list = essentials(medical)
  const done = list.filter((e) => e.done).length
  const sectionOf: Record<string, Section> = { 'Blood group': 'bloodGroup', 'Height and weight': 'measurements', 'Emergency contact': 'emergency' }
  return (
    <Card elevation="tile">
      <Div className="flex-row items-center gap-3.5">
        <Avatar name={name} size={48} radius={16} />
        <Div className="min-w-0 flex-1">
          <P className="truncate text-title-sm text-ink-900">{name}</P>
          <P className="truncate text-body-sm text-ink-500">{[relation, age ? `${age} yrs` : null].filter(Boolean).join(' · ')}</P>
        </Div>
      </Div>
      <Div className="mt-3 flex-row items-center gap-1.5 rounded-[10px] bg-brand-50 px-3 py-2">
        <ShieldCheck className="h-[14px] w-[14px] shrink-0 text-brand-600" strokeWidth={2.3} />
        <P className="flex-1 text-caption leading-[16px] text-brand-700">Shared only with doctors you consult, and checked by the pharmacy.</P>
      </Div>
      <Div className="mt-3.5">
        <Div className="mb-2 flex-row items-center justify-between">
          <P className="text-body-sm font-semibold text-ink-800">Essentials</P>
          <P className={`text-body-sm font-bold ${done === list.length ? 'text-vital-700' : 'text-ink-500'}`}>
            {done === list.length ? 'Complete' : `${done} of ${list.length}`}
          </P>
        </Div>
        <ProgressBar pct={(done / list.length) * 100} tone={done === list.length ? 'success' : 'brand'} />
        {done < list.length && (
          <Div className="mt-3 flex-row flex-wrap gap-2">
            {list
              .filter((e) => !e.done)
              .map((e) => (
                <Btn key={e.label} onPress={() => onFix(sectionOf[e.label])} className="tap flex-row items-center gap-1 rounded-chip bg-white px-3 py-1.5 ring-1 ring-inset ring-brand-200">
                  <Plus className="h-[12px] w-[12px] text-brand-600" strokeWidth={2.6} />
                  <Span className="text-caption font-semibold text-brand-700">Add {e.label.toLowerCase()}</Span>
                </Btn>
              ))}
          </Div>
        )}
      </Div>
    </Card>
  )
}

function Vitals({ medical, age, onEdit }: { medical: MedicalInfo; age?: number; onEdit: (s: Section) => void }) {
  const h = parseMeasure(medical.height)
  const w = parseMeasure(medical.weight)
  const b = bmi(h, w, age)
  const tiles = [
    { label: 'Blood group', value: toDisplayBlood(medical.bloodGroup) || '—', tone: 'text-critical-600', section: 'bloodGroup' as Section },
    { label: 'Height', value: withUnit(h, 'cm') || '—', tone: 'text-ink-900', section: 'measurements' as Section },
    { label: 'Weight', value: withUnit(w, 'kg') || '—', tone: 'text-ink-900', section: 'measurements' as Section },
  ]
  return (
    <Card elevation="tile" padded={false}>
      <Div className=" grid-cols-3 divide-x divide-ink-100">
        {tiles.map((v) => (
          <Btn key={v.label} onPress={() => onEdit(v.section)} accessibilityLabel={`${v.label}: ${v.value}`} className="tap px-3 py-3.5 text-center">
            <P className={`text-title-md leading-none ${v.tone}`} style={{ lineHeight: 24, marginVertical: -2 }}>
              {v.value}
            </P>
            <P className="mt-1.5 text-caption text-ink-400">{v.label}</P>
          </Btn>
        ))}
      </Div>
      {b && (
        <>
          <Divider />
          <Div className="flex-row items-center justify-between px-4 py-2.5">
            <P className="text-body-sm text-ink-500">
              BMI <Span className="font-bold text-ink-900">{b.value}</Span>
            </P>
            <Span className={`rounded-chip px-2.5 py-1 text-caption font-bold ${BAND_TONE[b.band]}`}>{b.band}</Span>
          </Div>
        </>
      )}
    </Card>
  )
}

/** Clinically critical, so it carries the red treatment. */
function Allergies({ items, onEdit }: { items: string[]; onEdit: () => void }) {
  return (
    <Card elevation="tile" className="!bg-critical-50">
      <Div className="flex-row items-center gap-2.5">
        <AlertTriangle className="h-[17px] w-[17px] shrink-0 text-critical-600" strokeWidth={2.2} />
        <P className="flex-1 text-title-sm text-critical-700">Allergies{items.length ? ` · ${items.length}` : ''}</P>
        <Btn onPress={onEdit} accessibilityLabel="Add an allergy" className="tap flex-row items-center gap-1 rounded-chip bg-white px-2.5 py-1">
          <Plus className="h-[12px] w-[12px] text-critical-700" strokeWidth={2.6} />
          <Span className="text-caption font-bold text-critical-700">Add</Span>
        </Btn>
      </Div>
      <Div className="mt-3 flex-row flex-wrap gap-2">
        {items.map((a) => (
          <Span key={a} className="rounded-chip bg-white px-3 py-1.5 text-body-sm font-bold text-critical-700">
            {a}
          </Span>
        ))}
        {items.length === 0 && <P className="text-body-sm text-critical-700/80">No allergies recorded. Add any medicine, food or substance you react to.</P>}
      </Div>
      <P className="mt-3 text-caption leading-[17px] text-critical-700/80">Shown to every doctor you consult and printed on every prescription.</P>
    </Card>
  )
}

function ListCard({ Icon, title, empty, items, onAdd }: { Icon: React.ComponentType<any>; title: string; empty: string; items: string[]; onAdd: () => void }) {
  return (
    <Card elevation="tile">
      <Div className="flex-row items-center gap-2.5">
        <Icon className="h-[16px] w-[16px] shrink-0 text-brand-600" strokeWidth={2.1} />
        <P className="flex-1 text-title-sm text-ink-900">
          {title}
          {items.length ? <Span className="text-ink-400"> · {items.length}</Span> : null}
        </P>
        <Btn onPress={onAdd} accessibilityLabel={`Add to ${title}`} className="tap h-[30px] w-[30px] items-center justify-center rounded-full bg-brand-50">
          <Plus className="h-[15px] w-[15px] text-brand-600" strokeWidth={2.5} />
        </Btn>
      </Div>
      <Div className="mt-2.5 gap-1.5">
        {items.map((i) => (
          <Div key={i} className="flex-row items-center gap-2.5 py-1">
            <Span className="h-[5px] w-[5px] shrink-0 rounded-full bg-brand-400" />
            <P className="min-w-0 flex-1 text-body text-ink-800">{i}</P>
          </Div>
        ))}
        {items.length === 0 && <P className="text-body-sm text-ink-400">{empty}</P>}
      </Div>
    </Card>
  )
}

function EmergencyCard({ contact, onEdit }: { contact: MedicalInfo['emergency']; onEdit: () => void }) {
  const call = () => {
    const digits = normalizeMobile(contact.mobile)
    Linking.openURL(`tel:+91${digits}`).catch(() => showToast('Calling isn’t available on this device', 'critical'))
  }
  return (
    <Card elevation="tile">
      <Div className="flex-row items-center gap-2.5">
        <UserRound className="h-[16px] w-[16px] shrink-0 text-brand-600" strokeWidth={2.1} />
        <P className="flex-1 text-title-sm text-ink-900">Emergency contact</P>
      </Div>
      <Divider className="my-3" />
      {!contact.name ? (
        <Btn onPress={onEdit} className="tap flex-row items-center gap-1.5">
          <Plus className="h-[14px] w-[14px] text-brand-600" strokeWidth={2.5} />
          <P className="text-body-sm font-semibold text-brand-600">Add someone we can call in an emergency</P>
        </Btn>
      ) : (
        <Div className="flex-row items-center gap-3.5">
          <Avatar name={contact.name} size={42} radius={14} />
          <Div className="min-w-0 flex-1">
            <P className="truncate text-body-lg font-semibold text-ink-900">{contact.name}</P>
            <P className="truncate text-body-sm text-ink-500">{[contact.relation, contact.mobile].filter(Boolean).join(' · ')}</P>
          </Div>
          <IconButton size={38} tone="brand" label={`Call ${contact.name}`} onClick={call}>
            <Phone className="h-[16px] w-[16px]" strokeWidth={2.3} />
          </IconButton>
        </Div>
      )}
    </Card>
  )
}

/* =========================================== Edit medical information ==== */

export function MedicalInfoEditScreen() {
  const nav = useNav()
  const focus: Section | undefined = nav.params.focus
  const record = useMedicalRecord(nav.params.memberId)
  if (record.loading || !record.medical) {
    return (
      <Screen background="bg-canvas" padBottom={false}>
        <ScreenHeader title="Edit medical information" onBack={nav.back} />
        <Div className="gap-3 px-5 pt-4">
          <Skeleton className="h-[110px] w-full" rounded={18} />
          <Skeleton className="h-[150px] w-full" rounded={18} />
        </Div>
      </Screen>
    )
  }
  return <MedicalEditor key={record.member?.id ?? 'self'} record={record} focus={focus} />
}

function MedicalEditor({ record, focus }: { record: ReturnType<typeof useMedicalRecord>; focus?: Section }) {
  const nav = useNav()
  const navigation = useNavigation<any>()
  const medical = record.medical!
  const initial = React.useMemo(
    () => ({
      blood: toDisplayBlood(medical.bloodGroup),
      lists: { allergies: medical.allergies, conditions: medical.conditions, medications: medical.medications, surgeries: medical.surgeries },
      form: {
        bloodGroup: '',
        height: parseMeasure(medical.height)?.toString() ?? '',
        weight: parseMeasure(medical.weight)?.toString() ?? '',
        emergencyName: medical.emergency.name,
        emergencyRelation: medical.emergency.relation,
        emergencyMobile: medical.emergency.mobile,
      },
    }),
    [medical],
  )
  const [blood, setBlood] = React.useState(initial.blood)
  const [lists, setLists] = React.useState<Record<MedicalListKey, string[]>>(initial.lists)
  const [listError, setListError] = React.useState<Partial<Record<MedicalListKey, string>>>({})
  const { control, handleSubmit, watch, setValue, formState } = useForm<MedicalForm>({ resolver: zodResolver(medicalSchema), defaultValues: initial.form })
  const height = watch('height')
  const weight = watch('weight')
  const relation = watch('emergencyRelation')

  const dirty = formState.isDirty || blood !== initial.blood || JSON.stringify(lists) !== JSON.stringify(initial.lists)
  const leaving = React.useRef(false)
  const [pendingLeave, setPendingLeave] = React.useState<any>(null)

  // Unsaved changes are never lost silently: the header's back, Android's back and the gesture all ask.
  React.useEffect(() => {
    if (!navigation?.addListener) return
    return navigation.addListener('beforeRemove', (e: any) => {
      if (!dirty || leaving.current) return
      e.preventDefault()
      setPendingLeave(e.data.action)
    })
  }, [navigation, dirty])

  const add = (key: MedicalListKey) => (value: string) => {
    const r = addEntry(lists[key], value)
    setLists((l) => ({ ...l, [key]: r.list }))
    setListError((errs) => ({ ...errs, [key]: r.error ?? undefined }))
  }
  const remove = (key: MedicalListKey) => (value: string) => {
    setLists((l) => ({ ...l, [key]: l[key].filter((v) => v !== value) }))
    setListError((errs) => ({ ...errs, [key]: undefined }))
  }

  const save = handleSubmit(async (form) => {
    const h = parseMeasure(form.height)
    const w = parseMeasure(form.weight)
    try {
      await record.save({
        ...lists,
        bloodGroup: toApiBlood(blood) ?? '',
        height: withUnit(h, 'cm'),
        weight: withUnit(w, 'kg'),
        emergency: {
          name: form.emergencyName.trim(),
          relation: form.emergencyRelation.trim(),
          mobile: form.emergencyMobile.trim() ? formatMobile(form.emergencyMobile) : '',
        },
      })
    } catch (e) {
      showToast(errorMessage(e, 'Could not save the medical information. Please try again.'), 'critical')
      return
    }
    leaving.current = true
    showToast(record.isSelf ? 'Medical information saved' : `Saved for ${record.member?.name}`)
    nav.back()
  })

  const preview = bmi(parseMeasure(height), parseMeasure(weight), record.member?.age)
  const allergyHints = openSuggestions('allergies', lists.allergies)

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader title="Edit medical information" subtitle={record.isSelf ? undefined : record.member?.name} onBack={nav.back} />
      <Div className="flex-1 gap-3 px-5 pb-[130px] pt-4">
        <Card elevation="tile">
          <Field label="Blood group" hint="Shown to doctors in an emergency.">
            <Div className="flex-row flex-wrap gap-2">
              {[...API_BLOOD_GROUPS.map((g) => g.replace('-', '−')), BLOOD_UNKNOWN].map((g) => {
                const on = g === blood || (g === BLOOD_UNKNOWN && blood === BLOOD_UNKNOWN)
                return (
                  <Btn
                    key={g}
                    onPress={() => setBlood(g)}
                    accessibilityLabel={`Blood group ${g}${on ? ', selected' : ''}`}
                    className={`tap h-[40px] ${g === BLOOD_UNKNOWN ? 'px-3.5' : 'w-[58px]'} items-center justify-center rounded-chip text-body-sm font-bold ${
                      on ? 'bg-brand-600 text-white shadow-cta' : 'bg-white text-ink-700 ring-1 ring-inset ring-ink-200'
                    }`}
                  >
                    {g}
                  </Btn>
                )
              })}
            </Div>
          </Field>
        </Card>

        <Card elevation="tile" className="!bg-critical-50">
          <Div className="mb-2 flex-row items-center gap-2.5">
            <AlertTriangle className="h-[16px] w-[16px] shrink-0 text-critical-600" strokeWidth={2.3} />
            <P className="text-[11px] font-bold uppercase tracking-[.08em] text-critical-700">Allergies</P>
          </Div>
          <P className="mb-2.5 text-caption leading-[17px] text-critical-700/80">Shown to every doctor you consult and printed on every prescription.</P>
          <Div className="mb-2.5 flex-row flex-wrap gap-2">
            {lists.allergies.map((a) => (
              <Span key={a} className="inline-flex flex-row items-center gap-2 rounded-chip bg-white px-3 py-1.5 text-body-sm font-bold text-critical-700">
                {a}
                <Btn accessibilityLabel={`Remove ${a}`} hitSlop={8} onPress={() => remove('allergies')(a)}>
                  <X className="h-[12px] w-[12px]" strokeWidth={2.8} />
                </Btn>
              </Span>
            ))}
          </Div>
          <EntryInput placeholder="Type an allergy and press enter" className="!bg-white" autoFocus={focus === 'allergies'} onAdd={add('allergies')} />
          {listError.allergies && <P className="mt-1.5 text-caption text-critical-700">{listError.allergies}</P>}
          <Suggestions items={allergyHints} tone="critical" onPick={add('allergies')} />
        </Card>

        {LISTS.map((l) => (
          <EditList
            key={l.key}
            title={l.title}
            items={lists[l.key]}
            placeholder={l.placeholder}
            autoFocus={focus === l.key}
            error={listError[l.key]}
            suggestions={openSuggestions(l.key, lists[l.key])}
            onAdd={add(l.key)}
            onRemove={remove(l.key)}
          />
        ))}

        <Card elevation="tile">
          <P className="mb-2.5 text-[11px] font-bold uppercase tracking-[.08em] text-ink-500">Measurements</P>
          <Div className=" grid-cols-2 gap-3">
            <FormInput control={control} name="height" label="Height" placeholder="170" keyboardType="decimal-pad" suffix={<Span className="text-body text-ink-400">cm</Span>} autoFocus={focus === 'measurements'} />
            <FormInput control={control} name="weight" label="Weight" placeholder="65" keyboardType="decimal-pad" suffix={<Span className="text-body text-ink-400">kg</Span>} />
          </Div>
          {preview && (
            <Div className="mt-3 flex-row items-center justify-between rounded-[11px] bg-ink-50 px-3.5 py-2.5">
              <P className="text-body-sm text-ink-600">
                BMI <Span className="font-bold text-ink-900">{preview.value}</Span>
              </P>
              <Span className={`rounded-chip px-2.5 py-1 text-caption font-bold ${BAND_TONE[preview.band]}`}>{preview.band}</Span>
            </Div>
          )}
        </Card>

        <Card elevation="tile">
          <P className="mb-2.5 text-[11px] font-bold uppercase tracking-[.08em] text-ink-500">Emergency contact</P>
          <Div className="gap-3">
            <FormInput control={control} name="emergencyName" label="Name" placeholder="Full name" autoFocus={focus === 'emergency'} />
            <Field label="Relationship">
              <Div className="flex-row flex-wrap gap-2">
                {EMERGENCY_RELATIONS.map((r) => {
                  const on = r === relation
                  return (
                    <Btn
                      key={r}
                      onPress={() => setValue('emergencyRelation', r, { shouldDirty: true })}
                      accessibilityLabel={`${r}${on ? ', selected' : ''}`}
                      className={`tap rounded-chip px-3.5 py-2 text-body-sm font-semibold ${on ? 'bg-brand-600 text-white' : 'bg-white text-ink-700 ring-1 ring-inset ring-ink-200'}`}
                    >
                      {r}
                    </Btn>
                  )
                })}
              </Div>
            </Field>
            <FormInput control={control} name="emergencyMobile" label="Mobile" placeholder="98765 43210" keyboardType="phone-pad" prefix={<Span className="text-body-lg text-ink-500">+91</Span>} />
          </Div>
        </Card>
      </Div>

      <StickyBar>
        <Button loading={formState.isSubmitting} disabled={!dirty} onClick={save} icon={<Check className="h-[18px] w-[18px]" strokeWidth={2.4} />}>
          {dirty ? 'Save medical information' : 'No changes yet'}
        </Button>
      </StickyBar>

      {pendingLeave && (
        <Modal
          tone="caution"
          icon={<AlertTriangle className="h-[26px] w-[26px]" strokeWidth={2} />}
          title="Discard your changes?"
          body="What you’ve changed on this screen hasn’t been saved."
          actions={
            <>
              <Button onClick={() => setPendingLeave(null)}>Keep editing</Button>
              <Button
                variant="tertiary"
                onClick={() => {
                  leaving.current = true
                  const action = pendingLeave
                  setPendingLeave(null)
                  navigation.dispatch(action)
                }}
              >
                Discard changes
              </Button>
            </>
          }
        />
      )}
    </Screen>
  )
}

/** One-tap suggestions under a list. */
function Suggestions({ items, tone = 'brand', onPick }: { items: string[]; tone?: 'brand' | 'critical'; onPick: (v: string) => void }) {
  if (!items.length) return null
  const chip = tone === 'critical' ? 'bg-white/70 text-critical-700 ring-critical-200' : 'bg-ink-50 text-ink-700 ring-ink-100'
  return (
    <Div className="mt-2.5 flex-row flex-wrap gap-1.5">
      {items.slice(0, 8).map((s) => (
        <Btn key={s} onPress={() => onPick(s)} accessibilityLabel={`Add ${s}`} className={`tap flex-row items-center gap-1 rounded-chip px-2.5 py-1.5 ring-1 ring-inset ${chip}`}>
          <Plus className="h-[11px] w-[11px]" strokeWidth={2.6} />
          <Span className="text-caption font-semibold">{s}</Span>
        </Btn>
      ))}
    </Div>
  )
}

/** A text field whose submitted value joins a list, then clears. */
function EntryInput({ onAdd, ...input }: Record<string, any> & { onAdd: (value: string) => void }) {
  const [text, setText] = React.useState('')
  const commit = () => {
    if (text.trim()) onAdd(text)
    setText('')
  }
  return <Input value={text} onChangeText={setText} onSubmitEditing={commit} onBlur={commit} returnKeyType="done" blurOnSubmit={false} {...input} />
}

function EditList({
  title,
  items,
  placeholder,
  autoFocus,
  error,
  suggestions,
  onAdd,
  onRemove,
}: {
  title: string
  items: string[]
  placeholder: string
  autoFocus?: boolean
  error?: string
  suggestions: string[]
  onAdd: (value: string) => void
  onRemove: (value: string) => void
}) {
  return (
    <Card elevation="tile">
      <P className="mb-2.5 text-[11px] font-bold uppercase tracking-[.08em] text-ink-500">{title}</P>
      {items.length > 0 && (
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
      )}
      <EntryInput placeholder={placeholder} autoFocus={autoFocus} onAdd={onAdd} />
      {error && <P className="mt-1.5 text-caption text-critical-700">{error}</P>}
      <Suggestions items={suggestions} onPick={onAdd} />
    </Card>
  )
}
