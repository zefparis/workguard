import React, { useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import {
  MRZScanner,
  EnumResultStatus,
  type MRZScanConfig,
  type MRZScanResult,
} from 'dynamsoft-mrz-scanner-bundle-react-native'
import { ENV } from '../config/env'
import { isOlderThan18 } from '../services/nfcVerification'
import type { MrzResult } from '../types'

interface Props {
  onVerified: (result: MrzResult) => void
  onSkip: () => void
  onError?: (msg: string) => void
}

function toMrzResult(raw: MRZScanResult): MrzResult | null {
  const d = raw.data
  if (!d) return null
  const fullName = [d.firstName, d.lastName].filter(Boolean).join(' ').trim()
  return {
    verified: true,
    name: fullName || undefined,
    nationality: d.nationality ?? undefined,
    // Native bundle returns dates as YYYY-MM-DD strings; normalize to YYMMDD.
    dateOfBirth: normalizeDate(d.dateOfBirth),
    documentNumber: d.documentNumber ?? undefined,
    expiryDate: normalizeDate(d.dateOfExpire),
    isAdult: isOlderThan18(normalizeDate(d.dateOfBirth)),
    mrzValid: true,
  }
}

function normalizeDate(v: string | undefined): string | undefined {
  if (!v) return undefined
  // Accepts "YYYY-MM-DD", "YYYYMMDD", "YYMMDD" — return YYMMDD.
  const digits = v.replace(/\D/g, '')
  if (digits.length === 8) return digits.slice(2)
  if (digits.length === 6) return digits
  return undefined
}

export const MrzScannerComponent: React.FC<Props> = ({ onVerified, onSkip, onError }) => {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const handleScan = useCallback(async () => {
    setErr(null)
    setBusy(true)
    try {
      const config: MRZScanConfig = {
        isGuideFrameVisible: true,
        isTorchButtonVisible: true,
        isCloseButtonVisible: true,
        isBeepEnabled: true,
      }
      const result = await MRZScanner.launch(config)
      if (result.resultStatus === EnumResultStatus.RS_FINISHED) {
        const mapped = toMrzResult(result)
        if (mapped) {
          onVerified(mapped)
          return
        }
        const msg = 'MRZ scanned but no fields parsed.'
        setErr(msg)
        onError?.(msg)
      } else if (result.resultStatus === EnumResultStatus.RS_CANCELED) {
        // User closed the scanner — stay on this screen, let them retry or skip.
      } else {
        const msg = result.errorString ?? `Scan failed (code ${result.errorCode ?? '?'}).`
        setErr(msg)
        onError?.(msg)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to launch MRZ scanner.'
      setErr(msg)
      onError?.(msg)
    } finally {
      setBusy(false)
    }
  }, [onError, onVerified])

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scan your ID document</Text>
      <Text style={styles.sub}>
        Point the rear camera at the MRZ strip — the two machine-readable lines at the bottom of
        your passport or national ID.
      </Text>

      {err && <Text style={styles.err}>{err}</Text>}

      <TouchableOpacity style={styles.primary} onPress={handleScan} disabled={busy}>
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryText}>Scan ID Document</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.outline} onPress={onSkip} disabled={busy}>
        <Text style={styles.outlineText}>Skip ID verification</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { padding: 20, alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: '#e8f0ff', marginBottom: 8, textAlign: 'center' },
  sub: { fontSize: 14, color: '#9aa8bd', textAlign: 'center', marginBottom: 24 },
  err: { color: '#ef4444', marginBottom: 12, textAlign: 'center' },
  primary: {
    backgroundColor: '#06b6d4',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
    minWidth: 240,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  outline: {
    borderColor: '#3b4a63',
    borderWidth: 1,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 10,
    minWidth: 240,
    alignItems: 'center',
  },
  outlineText: { color: '#9aa8bd', fontSize: 14 },
})
