import { Div, P, Span, SvgBox, SvgRect } from '../primitives/index'
import React from 'react'
import { labReport, patient } from '../../mock-data/mock'

/**
 * A rendered page of the lab's PDF.
 *
 * Labs deliver documents, not structured data — so the results table belongs
 * *inside* this page, printed as the lab laid it out. The app never re-renders
 * those values as interface; it shows the document and lets the reader open,
 * zoom, download or forward it.
 *
 * Drawn at a fixed 360 x 509 page and scaled by the caller, so one component
 * serves both the full preview and the thumbnail strip.
 */

export const PAGE_W = 360
export const PAGE_H = 509

const r = labReport

function Rule({ className = '' }: { className?: string }) {
  return <Div className={`h-px bg-[#C9D3DD] ${className}`} />
}

function MetaLine({ k, v }: { k: string; v: string }) {
  return (
    <Div className="flex-row gap-1">
      <Span className="w-[42px] shrink-0 text-[5.5px] uppercase tracking-[.04em] text-[#7A8FA3]">{k}</Span>
      <Span className="min-w-0 flex-1 truncate text-[6px] font-semibold text-[#1A2B3C]">{v}</Span>
    </Div>
  )
}

function PageOne() {
  return (
    <>
      {/* Letterhead */}
      <Div className="flex-row items-start justify-between px-4 pt-4">
        <Div>
          <P className="font-display text-[11px] font-extrabold leading-none tracking-[-0.2px] text-[#0A2A4A]">
            {r.lab}
          </P>
          <P className="mt-[3px] text-[5.5px] leading-[7px] text-[#5A6B7C]">{r.branch}</P>
          <P className="text-[5.5px] leading-[7px] text-[#5A6B7C]">Accredited laboratory · {r.nabl}</P>
        </Div>
        <Div className="shrink-0 rounded-[2px] border border-[#C9D3DD] px-1.5 py-[2px] text-center">
          <P className="text-[5px] font-bold uppercase tracking-[.06em] text-[#5A6B7C]">Report no.</P>
          <P className="text-[6px] font-bold tabular-nums text-[#1A2B3C]">{r.id}</P>
        </Div>
      </Div>

      <Rule className="mx-4 mt-3" />

      {/* Patient block */}
      <Div className=" grid-cols-2 gap-x-5 gap-y-[3px] px-4 py-2.5">
        <MetaLine k="Patient" v={patient.name} />
        <MetaLine k="Collected" v={r.collected} />
        <MetaLine k="Age / Sex" v={`${patient.age} Y / ${patient.gender[0]}`} />
        <MetaLine k="Reported" v={r.reported} />
        <MetaLine k="Patient ID" v={patient.id} />
        <MetaLine k="Ref. by" v={r.refBy} />
      </Div>

      <Rule className="mx-4" />

      <P className="px-4 pb-1.5 pt-2.5 text-center text-[7.5px] font-bold uppercase tracking-[.1em] text-[#0A2A4A]">
        {r.test}
      </P>

      {/* Results table — printed by the lab, not re-rendered by the app */}
      <Div className="px-4">
        <Div className="flex-row border-y border-[#C9D3DD] py-[3px]">
          <Span className="flex-1 text-[5.5px] font-bold uppercase tracking-[.05em] text-[#5A6B7C]">Investigation</Span>
          <Span className="w-[34px] text-right text-[5.5px] font-bold uppercase tracking-[.05em] text-[#5A6B7C]">
            Result
          </Span>
          <Span className="w-[32px] text-right text-[5.5px] font-bold uppercase tracking-[.05em] text-[#5A6B7C]">
            Unit
          </Span>
          <Span className="w-[42px] text-right text-[5.5px] font-bold uppercase tracking-[.05em] text-[#5A6B7C]">
            Reference
          </Span>
        </Div>

        {r.results.map((x) => (
          <Div key={x.name} className="flex-row items-baseline border-b border-[#E4EBF1] py-[3.5px]">
            <Span className="flex-1 pr-1 text-[6px] leading-[8px] text-[#1A2B3C]">{x.name}</Span>
            <Span
              className={`w-[34px] text-right text-[6.5px] font-bold tabular-nums ${
                x.flag === 'normal' ? 'text-[#1A2B3C]' : 'text-[#B9311B]'
              }`}
            >
              {x.value}
              {x.flag !== 'normal' && <Span className="text-[5px]"> H</Span>}
            </Span>
            <Span className="w-[32px] text-right text-[5.5px] tabular-nums text-[#5A6B7C]">{x.unit || '—'}</Span>
            <Span className="w-[42px] text-right text-[5.5px] tabular-nums text-[#5A6B7C]">{x.range}</Span>
          </Div>
        ))}
      </Div>

      <P className="px-4 pt-2 text-[5px] leading-[7px] text-[#7A8FA3]">
        H = above reference range. Method: enzymatic colorimetric, fully automated analyser. Sample: serum, fasting
        12 hours.
      </P>

      {/* Signature */}
      <Div className="absolute inset-x-4 bottom-4">
        <Rule className="mb-2" />
        <Div className="flex-row items-end justify-between">
          <Div>
            <P className="font-display text-[7px] font-bold italic text-[#0A2A4A]">S. Venkatesh</P>
            <P className="mt-[2px] text-[5.5px] font-semibold text-[#1A2B3C]">{r.pathologist}</P>
            <P className="text-[5px] text-[#7A8FA3]">Consultant Pathologist</P>
          </Div>
          <P className="text-[5px] text-[#7A8FA3]">Page 1 of 3</P>
        </Div>
      </Div>
    </>
  )
}

function PageTwo() {
  return (
    <>
      <Div className="flex-row items-baseline justify-between px-4 pt-4">
        <P className="font-display text-[8px] font-extrabold text-[#0A2A4A]">{r.lab}</P>
        <P className="text-[5.5px] tabular-nums text-[#5A6B7C]">{r.id} · {patient.name}</P>
      </Div>
      <Rule className="mx-4 mt-2" />

      <P className="px-4 pb-1.5 pt-3 text-[7px] font-bold uppercase tracking-[.1em] text-[#0A2A4A]">
        Interpretation
      </P>
      <Div className="gap-[5px] px-4">
        {[
          'Total cholesterol and triglycerides are above the desirable range for this age group.',
          'LDL cholesterol is borderline. Correlate clinically with cardiovascular risk factors.',
          'HDL cholesterol is within the desirable range.',
          'Repeat lipid profile after 8 to 12 weeks of dietary and lifestyle modification, or as advised.',
        ].map((t) => (
          <Div key={t} className="flex-row gap-1.5">
            <Span className="mt-[3px] h-[2px] w-[2px] shrink-0 rounded-full bg-[#5A6B7C]" />
            <P className="text-[6px] leading-[8.5px] text-[#1A2B3C]">{t}</P>
          </Div>
        ))}
      </Div>

      <P className="px-4 pb-1.5 pt-4 text-[7px] font-bold uppercase tracking-[.1em] text-[#0A2A4A]">
        Reference intervals — NCEP ATP III
      </P>
      <Div className="px-4">
        {[
          ['Total Cholesterol', 'Desirable < 200 · Borderline 200–239 · High ≥ 240'],
          ['LDL Cholesterol', 'Optimal < 100 · Near optimal 100–129 · Borderline 130–159'],
          ['HDL Cholesterol', 'Low < 40 · Desirable ≥ 60'],
          ['Triglycerides', 'Normal < 150 · Borderline 150–199 · High 200–499'],
        ].map(([k, v]) => (
          <Div key={k} className="border-b border-[#E4EBF1] py-[3.5px]">
            <P className="text-[6px] font-semibold text-[#1A2B3C]">{k}</P>
            <P className="text-[5.5px] leading-[7.5px] text-[#5A6B7C]">{v}</P>
          </Div>
        ))}
      </Div>

      <Div className="absolute inset-x-4 bottom-4">
        <Rule className="mb-2" />
        <P className="text-right text-[5px] text-[#7A8FA3]">Page 2 of 3</P>
      </Div>
    </>
  )
}

function PageThree() {
  return (
    <>
      <Div className="flex-row items-baseline justify-between px-4 pt-4">
        <P className="font-display text-[8px] font-extrabold text-[#0A2A4A]">{r.lab}</P>
        <P className="text-[5.5px] tabular-nums text-[#5A6B7C]">{r.id} · {patient.name}</P>
      </Div>
      <Rule className="mx-4 mt-2" />

      <P className="px-4 pb-1.5 pt-3 text-[7px] font-bold uppercase tracking-[.1em] text-[#0A2A4A]">
        Conditions of reporting
      </P>
      <Div className="gap-[6px] px-4">
        {[
          'Results relate only to the sample received and are not valid for medico-legal purposes.',
          'Laboratory investigations are an aid to diagnosis. Interpretation must be made by a qualified clinician in the context of clinical history and examination.',
          'Report generated electronically. Values may vary between laboratories depending on the method and analyser used.',
          'In case of any unexpected or discordant result, please contact the laboratory immediately for clarification or a repeat analysis, free of charge.',
        ].map((t) => (
          <P key={t} className="text-[6px] leading-[8.5px] text-[#1A2B3C]">
            {t}
          </P>
        ))}
      </Div>

      <Div className="mx-4 mt-5 rounded-[2px] border border-[#C9D3DD] p-2">
        <P className="text-[5.5px] font-bold uppercase tracking-[.06em] text-[#5A6B7C]">Scan to verify</P>
        <Div className="mt-1.5 flex-row items-center gap-2">
          <Div className="flex-col h-[34px] w-[34px] items-center justify-center bg-[#0A2A4A] p-[3px]">
            <QrGlyph />
          </Div>
          <P className="min-w-0 flex-1 text-[5.5px] leading-[7.5px] text-[#5A6B7C]">
            Verify the authenticity of this report at lalpathlabs.com/verify using report number {r.id}.
          </P>
        </Div>
      </Div>

      <Div className="absolute inset-x-4 bottom-4">
        <Rule className="mb-2" />
        <Div className="flex-row items-end justify-between">
          <P className="text-[5.5px] font-bold text-[#5A6B7C]">— End of report —</P>
          <P className="text-[5px] text-[#7A8FA3]">Page 3 of 3</P>
        </Div>
      </Div>
    </>
  )
}

export function ReportPage({ page = 1, className = '' }: { page?: 1 | 2 | 3; className?: string }) {
  return (
    <Div
      className={`relative shrink-0 overflow-hidden bg-white ${className}`}
      style={{ width: PAGE_W, height: PAGE_H }}
    >
      {page === 1 ? <PageOne /> : page === 2 ? <PageTwo /> : <PageThree />}
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
        row
          .split('')
          .map((c, x) => (c === '1' ? <SvgRect key={`${x}-${y}`} x={x + 1.5} y={y + 1.5} width="1" height="1" fill="#fff" /> : null)),
      )}
    </SvgBox>
  )
}
