import type { MrzResult } from '../types'

/**
 * Lightweight helpers around the MRZ result produced by the Dynamsoft
 * native scanner. The web version kept the same name for parity with the
 * previous NFC-ID verification path — we keep it here so downstream code
 * paths can stay identical across surfaces.
 */

function yyMmDdToDate(yymmdd: string | undefined): Date | null {
  if (!yymmdd || yymmdd.length !== 6) return null
  const yy = Number(yymmdd.slice(0, 2))
  const mm = Number(yymmdd.slice(2, 4))
  const dd = Number(yymmdd.slice(4, 6))
  if (!Number.isFinite(yy) || !Number.isFinite(mm) || !Number.isFinite(dd)) return null
  const nowYY = new Date().getFullYear() % 100
  const century = yy <= nowYY + 10 ? 2000 : 1900
  const d = new Date(Date.UTC(century + yy, mm - 1, dd))
  return Number.isFinite(d.getTime()) ? d : null
}

export function isOlderThan18(yymmdd: string | undefined): boolean | undefined {
  const dob = yyMmDdToDate(yymmdd)
  if (!dob) return undefined
  const now = new Date()
  const cutoff = new Date(Date.UTC(now.getUTCFullYear() - 18, now.getUTCMonth(), now.getUTCDate()))
  return dob.getTime() <= cutoff.getTime()
}

export function mrzIsExpired(result: MrzResult): boolean | undefined {
  const expiry = yyMmDdToDate(result.expiryDate)
  if (!expiry) return undefined
  return expiry.getTime() < Date.now()
}

/** Pad MRZ date components to the YYMMDD shape the backend expects. */
export function mrzDateParts(year: number, month: number, day: number): string {
  const yy = String(year % 100).padStart(2, '0')
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${yy}${mm}${dd}`
}
