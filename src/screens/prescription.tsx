import { Div, P, Span, SvgBox, SvgRect } from '../components/primitives/index'
import React from 'react'
import { Download, Share2, ShoppingCart, Pill, Clock, Stethoscope, FileText } from '../components/primitives/icons'
import { Screen, DEVICE } from '../components/ui/Screen'
import { ScreenHeader } from '../components/ui/Nav'
import { Button, IconButton, StickyBar } from '../components/ui/Button'
import { Segmented, MetaChip } from '../components/ui/Display'
import { SearchInput } from '../components/ui/Inputs'
import { PrescriptionCard } from '../components/cards/index'
import { Logo, EcgLine } from '../components/ui/Logo'
import { useNav } from '../navigation/navigation'
import { getDoctor, getPrescription, useCatalog } from '../store/catalog'
import { orderPrescription } from '../flows/prescriptions'
import { showToast } from '../store/toast'
import { LIVE } from '../services/config'
import { usePrescriptionDoc } from '../hooks/useCare'
import { useRxDocs } from '../services/live/prescriptions'
import { searchPrescriptions } from '../domain/catalogue'
import { StateBlock } from '../components/ui/Feedback'

/* ============================================== 26 — Prescription doc ===== */

export function PrescriptionScreen() {
  const nav = useNav()
  /* Live: fetched if it isn't in the loaded list yet; re-read when it arrives. */
  const loaded = usePrescriptionDoc(nav.params.rxId)
  const latest = useCatalog((s) => s.prescription)
  const prescription = LIVE ? loaded ?? (nav.params.rxId ? getPrescription(nav.params.rxId) : latest) : getPrescription(nav.params.rxId)
  const catalogDoctor = getDoctor(prescription.doctorId)
  /* Live: the doctor as the prescription states them (they may have left the directory since). */
  const signed = useRxDocs((s) => s.doctors[prescription.doctorId])
  const d = LIVE && signed
    ? { ...catalogDoctor, name: signed.name, qualification: signed.qualification ?? '', specialty: signed.specialty ?? catalogDoctor.specialty, hospital: signed.clinic ?? catalogDoctor.hospital, regNo: signed.regNo ?? '', council: signed.council ?? '' }
    : catalogDoctor
  const share = () => showToast('Prescription link copied', 'success', prescription.id)
  const download = () => showToast('Prescription saved to Files', 'success', `${prescription.id}.pdf`)
  if (LIVE && !prescription.id) {
    return (
      <Screen background="bg-canvas">
        <ScreenHeader title="Prescription" />
        <Div className="flex-1 justify-center px-5">
          <StateBlock icon={<FileText className="h-[30px] w-[30px]" strokeWidth={1.9} />} title="No prescription yet" body="Prescriptions appear here once a doctor issues them after a consultation." />
        </Div>
      </Screen>
    )
  }

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader
        title="Prescription"
        subtitle={prescription.id}
        right={
          LIVE ? undefined : <>
            <IconButton size={36} label="Share" onClick={share}>
              <Share2 className="h-[16px] w-[16px] text-ink-700" strokeWidth={2.2} />
            </IconButton>
            <IconButton size={36} label="Download" onClick={download}>
              <Download className="h-[16px] w-[16px] text-ink-700" strokeWidth={2.2} />
            </IconButton>
          </>
        }
      />

      <Div className="flex-1 px-4 pb-[130px] pt-4">
        {/* The document itself — deliberately paper-like, one surface, no nesting */}
        <Div className="overflow-hidden rounded-card bg-white shadow-card">
          {/* Letterhead */}
          <Div className="relative px-5 pb-4 pt-5">
            <Div className="flex-row items-start justify-between gap-4">
              <Logo variant="wordmark" width={92} />
              <Div className="text-right">
                <P className="text-[10px] font-bold uppercase tracking-[.1em] text-ink-400">Digital Prescription</P>
                <P className="mt-1 text-caption tabular-nums text-ink-600">{prescription.id}</P>
              </Div>
            </Div>
            <Div className="mt-3 flex-row items-center gap-2">
              <EcgLine width={120} height={14} stroke="#0068C8" opacity={0.5} />
              <Span className="h-px flex-1 bg-gradient-to-r from-gold/60 to-transparent" />
            </Div>
          </Div>

          {/* Doctor block */}
          <Div className="bg-brand-50/60 px-5 py-3.5">
            <Div className="flex-row items-start gap-2.5">
              <Stethoscope className="mt-[2px] h-[16px] w-[16px] shrink-0 text-brand-600" strokeWidth={2.1} />
              <Div className="min-w-0">
                <P className="text-title-sm text-ink-900">{d.name}</P>
                <P className="text-body-sm text-ink-600">{d.qualification}</P>
                <P className="mt-0.5 text-caption text-ink-500">
                  {d.specialty} · {d.hospital}
                </P>
                <P className="mt-1 text-caption text-ink-400">Reg. No. {d.regNo} · {LIVE ? d.council ?? '' : 'Telangana State Medical Council'}</P>
              </Div>
            </Div>
          </Div>

          {/* Patient + date */}
          <Div className=" grid-cols-2 divide-x divide-ink-100 border-b border-ink-100">
            <Div className="px-5 py-3.5">
              <P className="text-[10px] font-bold uppercase tracking-[.08em] text-ink-400">Patient</P>
              <P className="mt-1.5 text-body-lg font-semibold text-ink-900">{prescription.patient.name}</P>
              <P className="text-caption text-ink-500">
                {prescription.patient.age} yrs · {prescription.patient.gender}
              </P>
              <P className="mt-0.5 text-caption tabular-nums text-ink-400">{prescription.patient.id}</P>
            </Div>
            <Div className="px-5 py-3.5">
              <P className="text-[10px] font-bold uppercase tracking-[.08em] text-ink-400">Date issued</P>
              <P className="mt-1.5 text-body-lg font-semibold text-ink-900">{prescription.date}</P>
              <P className="text-caption text-ink-500">{prescription.time}</P>
              <P className="mt-0.5 text-caption text-ink-400">Video consultation</P>
            </Div>
          </Div>

          {/* Vitals */}
          <Block title="Vitals recorded">
            <Div className=" grid-cols-4 gap-2">
              {[
                ['BP', prescription.vitals.bp],
                ['Pulse', prescription.vitals.pulse],
                ['Weight', prescription.vitals.weight],
                ['SpO₂', prescription.vitals.spo2],
              ].map(([k, v]) => (
                <Div key={k} className="rounded-chip bg-ink-50 px-2 py-2 text-center">
                  <P className="text-[10px] font-semibold text-ink-400">{k}</P>
                  <P className="mt-0.5 text-[12px] font-bold tabular-nums text-ink-900">{String(v).split(' ')[0]}</P>
                </Div>
              ))}
            </Div>
          </Block>

          {/* Diagnosis */}
          <Block title="Diagnosis">
            <Div className="gap-1.5">
              {prescription.diagnosis.map((x) => (
                <Div key={x} className="flex-row gap-2.5">
                  <Span className="mt-[7px] h-[5px] w-[5px] shrink-0 rounded-full bg-critical-600" />
                  <P className="text-body-lg font-medium leading-[21px] text-ink-900">{x}</P>
                </Div>
              ))}
            </Div>
          </Block>

          {/* Rx */}
          <Block
            title="Medication"
            trailing={<Span className="rounded-[6px] bg-brand-600 px-1.5 py-[3px] font-display text-[11px] font-extrabold tracking-[.02em] text-white">Rx</Span>}
          >
            <Div className="gap-3">
              {prescription.medicines.map((m, i) => (
                <Div key={m.name} className="rounded-tile bg-ink-50/70 p-3.5">
                  <Div className="flex-row items-start gap-2.5">
                    <Span className="flex-col h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
                      {i + 1}
                    </Span>
                    <Div className="min-w-0 flex-1">
                      <P className="text-body-lg font-bold leading-[20px] text-ink-900">{m.name}</P>
                      <P className="text-body-sm text-ink-500">{m.generic}</P>
                    </Div>
                  </Div>
                  <Div className="mt-2.5  grid-cols-3 gap-2 pl-[32px]">
                    <Spec label="Dosage" value={m.dosage} />
                    <Spec label="Frequency" value={m.frequency} />
                    <Spec label="Duration" value={m.duration} />
                  </Div>
                  <P className="mt-2.5 pl-[32px] text-caption italic leading-[16px] text-ink-500">{m.note}</P>
                </Div>
              ))}
            </Div>
          </Block>

          {/* Advice */}
          <Block title="Advice">
            <Div className="gap-2">
              {prescription.advice.map((a) => (
                <Div key={a} className="flex-row gap-2.5 text-body leading-[21px] text-ink-700">
                  <Span className="mt-[8px] h-[4px] w-[4px] shrink-0 rounded-full bg-ink-300" />
                  {a}
                </Div>
              ))}
            </Div>
          </Block>

          {/* Investigations */}
          <Block title="Investigations advised">
            <Div className="flex-row flex-wrap gap-1.5">
              {prescription.investigations.map((x) => (
                <MetaChip key={x}>{x}</MetaChip>
              ))}
            </Div>
          </Block>

          {/* Follow-up */}
          <Block title="Follow-up" last>
            <Div className="flex-row items-start gap-2.5 rounded-tile bg-brand-50 p-3.5">
              <Clock className="mt-[1px] h-[16px] w-[16px] shrink-0 text-brand-600" strokeWidth={2.2} />
              <P className="text-body-sm leading-[19px] text-brand-700">{prescription.followUp}</P>
            </Div>
          </Block>

          {/* Signature */}
          <Div className="flex-row items-end justify-between border-t border-ink-100 px-5 py-4">
            <Div>
              <P className="text-caption text-ink-400">Digitally signed by</P>
              <P className="mt-0.5 text-body-sm font-bold text-ink-900">{d.name}</P>
              <P className="text-caption text-ink-400">{prescription.date} · {prescription.time}</P>
            </Div>
            <Div className="flex-col h-[52px] w-[52px] items-center justify-center rounded-[10px] bg-ink-900 p-1.5">
              <QrGlyph />
            </Div>
          </Div>

          <P className="border-t border-ink-100 bg-ink-50/60 px-5 py-2.5 text-center text-[10px] leading-[14px] text-ink-400">
            This is a computer-generated prescription issued through KDC+ and is valid without a physical signature.
          </P>
        </Div>
      </Div>

      <StickyBar>
        <Div className="flex-row gap-2.5">
          {!LIVE && (
            <>
              <Button variant="tertiary" block={false} className="w-[54px] !px-0" aria-label="Download" onClick={download}>
                <Download className="h-[18px] w-[18px]" strokeWidth={2.2} />
              </Button>
              <Button variant="tertiary" block={false} className="w-[54px] !px-0" aria-label="Share" onClick={share}>
                <Share2 className="h-[18px] w-[18px]" strokeWidth={2.2} />
              </Button>
            </>
          )}
          <Button
            className="flex-1"
            onClick={async () => {
              await orderPrescription(prescription, d.name)
              nav.navigate('cart', { tab: 'orders' })
            }}
            icon={<ShoppingCart className="h-[17px] w-[17px]" strokeWidth={2.2} />}
          >
            Order Medicines
          </Button>
        </Div>
      </StickyBar>
    </Screen>
  )
}

function Block({
  title,
  children,
  trailing,
  last,
}: {
  title: string
  children: React.ReactNode
  trailing?: React.ReactNode
  last?: boolean
}) {
  return (
    <Div className={`px-5 py-4 ${last ? '' : 'border-b border-ink-100'}`}>
      <Div className="mb-2.5 flex-row items-center justify-between">
        <P className="text-[10px] font-bold uppercase tracking-[.1em] text-ink-400">{title}</P>
        {trailing}
      </Div>
      {children}
    </Div>
  )
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <Div>
      <P className="text-[9.5px] font-semibold uppercase tracking-[.05em] text-ink-400">{label}</P>
      <P className="mt-0.5 text-[12px] font-semibold leading-[15px] text-ink-800">{value}</P>
    </Div>
  )
}

function QrGlyph() {
  return (
    <SvgBox viewBox="0 0 21 21" className="h-full w-full">
      {[
        '111111101101111111', '100000101001000001', '101110100101011101',
        '101110101101011101', '101110100001011101', '100000101101000001',
        '111111101011111111', '000000001000000000', '110110111010110110',
        '001001000111001001', '110011101001110011', '011100010110011100',
        '000000001011010110', '111111101001011001', '100000100110110011',
        '101110101011001100', '101110100101110011', '111111101101001101',
      ].map((row, y) =>
        row.split('').map((c, x) => (c === '1' ? <SvgRect key={`${x}-${y}`} x={x + 1.5} y={y + 1.5} width="1" height="1" fill="#fff" /> : null)),
      )}
    </SvgBox>
  )
}

/* =========================================== 27 — Prescription history ==== */

export function PrescriptionHistoryScreen() {
  const nav = useNav()
  const history = useCatalog((s) => s.prescriptionHistory)
  const [text, setText] = React.useState('')
  const [segment, setSegment] = React.useState<'all' | 'active' | 'past'>('all')
  const visible = searchPrescriptions(history, (id) => getDoctor(id).name, text, segment)
  const active = visible.filter((p) => p.status === 'active')
  const earlier = visible.filter((p) => p.status !== 'active')
  const open = (rxId: string) => nav.navigate('prescription', { params: { rxId } })
  return (
    <Screen background="bg-canvas" padBottom={false}>
      <Div className="sticky z-30 bg-white" style={{ marginTop: -DEVICE.safeTop, paddingTop: DEVICE.safeTop, top: -DEVICE.safeTop }}>
        <ScreenHeader embedded title="Prescriptions" border={false} />
        <Div className="px-5 pb-3">
          <SearchInput placeholder="Search by doctor, medicine or date" value={text} onChange={setText} />
        </Div>
        <Div className="px-5 pb-3.5">
          <Segmented
            options={[
              { id: 'all', label: 'All', count: LIVE ? history.length : 12 },
              { id: 'active', label: 'Active', count: LIVE ? history.filter((p) => p.status === 'active').length : 1 },
              { id: 'past', label: 'Past', count: LIVE ? history.filter((p) => p.status !== 'active').length : 11 },
            ]}
            value={segment}
            onChange={(id) => setSegment(id as typeof segment)}
          />
        </Div>
      </Div>

      <Div className="px-5 pb-[40px] pt-4">
        {visible.length === 0 && (
          <StateBlock compact icon={<FileText className="h-[26px] w-[26px]" strokeWidth={1.9} />} title="No prescriptions found" body="Try a different doctor, medicine or date." />
        )}

        {active.length > 0 && (
          <>
            <P className="mb-2.5 text-caption font-bold uppercase tracking-[.08em] text-ink-400">Active course</P>
            <Div className="gap-2.5">
              {active.map((p) => (
                <PrescriptionCard key={p.id} rx={p} onClick={() => open(p.rxId)} />
              ))}
            </Div>
          </>
        )}

        {earlier.length > 0 && (
          <>
            <P className="mb-2.5 mt-6 text-caption font-bold uppercase tracking-[.08em] text-ink-400">Earlier</P>
            <Div className="gap-2.5">
              {earlier.map((p) => (
                <PrescriptionCard key={p.id} rx={p} onClick={() => open(p.rxId)} />
              ))}
            </Div>
          </>
        )}

        <Div className="mt-6 flex-row items-center gap-3 rounded-card bg-white p-4 shadow-tile">
          <Span className="flex-col h-[38px] w-[38px] shrink-0 items-center justify-center rounded-tile bg-vital-50">
            <Pill className="h-[17px] w-[17px] text-vital-600" strokeWidth={2.1} />
          </Span>
          <P className="min-w-0 flex-1 text-body-sm leading-[18px] text-ink-600">
            Prescriptions are retained for 5 years and can be shared with any doctor on KDC+.
          </P>
        </Div>
      </Div>
    </Screen>
  )
}
