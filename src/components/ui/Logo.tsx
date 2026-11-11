import { Div, Img, SvgBox, SvgPath } from '../primitives/index'
import React from 'react'

/**
 * The official KDC+ logo is used as supplied — never redrawn, recoloured or
 * distorted. Three authorised crops of the same master artwork:
 *   lockup   — mark + ECG rule + "Your health in your hands"
 *   mark     — mark + ECG rule (default app identity)
 *   wordmark — KDC+ only (compact headers, favicon)
 */
/** Resolved against the deployed base, so the build also runs from a subfolder. */

const SRC = {
  lockup: require('../../assets/brand/kdc-lockup.png'),
  mark: require('../../assets/brand/kdc-mark.png'),
  wordmark: require('../../assets/brand/kdc-wordmark.png'),
} as const

const ASPECT = {"lockup":2.1067,"mark":2.5159,"wordmark":3.6239}

export function Logo({
  variant = 'mark',
  width = 120,
  className = '',
}: {
  variant?: keyof typeof SRC
  width?: number
  className?: string
}) {
  const img = (
    <Img
      src={SRC[variant]}
      alt="KDC+"
      resizeMode="contain" style={{ width, height: width / ASPECT[variant] }}
      className={/(^|\s)(p[xytblr]?-|bg-)/.test(className) ? '' : ` ${className}`}
    />
  )
  /* On the web the image's padding and background draw a badge around it. */
  return /(^|\s)(p[xytblr]?-|bg-)/.test(className) ? <Div className={`self-start ${className}`}>{img}</Div> : img
}

/** The ECG motif from the logo rule, reused as an ownable brand texture. */
export function EcgLine({
  className = '',
  stroke = '#0068C8',
  width = 320,
  height = 44,
  animate = false,
  opacity = 1,
}: {
  className?: string
  stroke?: string
  width?: number
  height?: number
  animate?: boolean
  opacity?: number
}) {
  return (
    <SvgBox
      viewBox="0 0 320 44"
      width={width}
      height={height}
      fill="none"
      className={className}
      style={{ opacity }}
    >
      <SvgPath
        d="M0 29h118l6-9 7 20 8-34 8 44 7-27 6 6h12l5-10 6 10h137"
        stroke={stroke}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={animate ? 1400 : undefined}
        
      />
    </SvgBox>
  )
}

/** Square app-icon treatment, used in splash and trust blocks. */
export function AppIconTile({ size = 86, className = '' }: { size?: number; className?: string }) {
  return (
    <Div
      className={`relative flex-col items-center justify-center bg-white ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.235,
        boxShadow: '0 1px 2px rgba(11,31,51,.06), 0 18px 34px -14px rgba(11,31,51,.26)',
      }}
    >
      <Logo variant="wordmark" width={size * 0.66} />
    </Div>
  )
}
