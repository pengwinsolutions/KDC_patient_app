import type React from 'react'

export type StatusTone = 'dark' | 'light'

export interface ScreenDef {
  /** Stable id used for navigation */
  id: string
  /** Sheet number shown in the gallery, e.g. "09" */
  code: string
  title: string
  /** Short designer's note shown under the mockup in the gallery */
  note?: string
  section: string
  Component: React.ComponentType
  statusTone?: StatusTone
  indicatorTone?: StatusTone
  /** Hide the simulated iOS chrome (splash-like full-bleed screens keep it) */
  chrome?: boolean
}

export interface Section {
  id: string
  title: string
  blurb: string
}

export interface Flow {
  id: string
  title: string
  blurb: string
  steps: string[]
}

/** One product in the KDC+ family. */
export interface AppDef {
  id: 'patient' | 'doctor'
  name: string
  tagline: string
  sections: Section[]
  screens: ScreenDef[]
  flows: Flow[]
  /** Where the prototype starts and where the gallery's tab aliases resolve. */
  entry: string
  aliases: Record<string, string>
}
