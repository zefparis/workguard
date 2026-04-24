import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'

interface Props {
  verdict: 'AUTHORIZED' | 'DEGRADED' | 'BLOCKED' | 'ENROLLED'
  title?: string
  subtitle?: string
  details?: Array<{ label: string; value: string }>
  onDone?: () => void
  doneLabel?: string
}

const VERDICT_COLOR: Record<Props['verdict'], string> = {
  AUTHORIZED: '#22c55e',
  ENROLLED: '#06b6d4',
  DEGRADED: '#facc15',
  BLOCKED: '#ef4444',
}

export const GuardResult: React.FC<Props> = ({
  verdict,
  title,
  subtitle,
  details = [],
  onDone,
  doneLabel = 'Done',
}) => {
  const color = VERDICT_COLOR[verdict]
  return (
    <View style={styles.container}>
      <View style={[styles.badge, { borderColor: color }]}>
        <Text style={[styles.badgeText, { color }]}>{verdict}</Text>
      </View>
      {title && <Text style={styles.title}>{title}</Text>}
      {subtitle && <Text style={styles.sub}>{subtitle}</Text>}

      {details.length > 0 && (
        <View style={styles.detailBox}>
          {details.map((d) => (
            <View key={d.label} style={styles.row}>
              <Text style={styles.rowLabel}>{d.label}</Text>
              <Text style={styles.rowValue}>{d.value}</Text>
            </View>
          ))}
        </View>
      )}

      {onDone && (
        <TouchableOpacity style={[styles.primary, { backgroundColor: color }]} onPress={onDone}>
          <Text style={styles.primaryText}>{doneLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { padding: 24, alignItems: 'center' },
  badge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 2,
    marginBottom: 16,
  },
  badgeText: { fontWeight: '800', letterSpacing: 2, fontSize: 13 },
  title: { color: '#e8f0ff', fontSize: 22, fontWeight: '700', textAlign: 'center' },
  sub: { color: '#9aa8bd', fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 20 },
  detailBox: {
    marginTop: 24,
    width: '100%',
    backgroundColor: '#0b1220',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  rowLabel: { color: '#9aa8bd', fontSize: 13 },
  rowValue: { color: '#e8f0ff', fontSize: 13, fontWeight: '600' },
  primary: {
    marginTop: 32,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 10,
    minWidth: 220,
    alignItems: 'center',
  },
  primaryText: { color: '#0b1220', fontWeight: '800', fontSize: 16 },
})
