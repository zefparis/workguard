import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native'
import { useNavigation, type NavigationProp } from '@react-navigation/native'
import { useWorkguardStore } from '../store/workguardStore'
import type { RootStackParamList } from '../types'

export const Home: React.FC = () => {
  const nav = useNavigation<NavigationProp<RootStackParamList>>()
  const worker = useWorkguardStore((s) => s.worker)
  const resetEnrollment = useWorkguardStore((s) => s.resetEnrollment)

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.brand}>WorkGuard</Text>
        <Text style={styles.tagline}>Biometric + cognitive worker enrollment</Text>

        {worker ? (
          <View style={styles.profile}>
            <Text style={styles.profileLabel}>Enrolled worker</Text>
            <Text style={styles.profileName}>
              {worker.firstName} {worker.lastName}
            </Text>
            <Text style={styles.profileMeta}>
              {worker.jobRole} · {worker.employerSite}
            </Text>
          </View>
        ) : (
          <Text style={styles.none}>No worker enrolled on this device yet.</Text>
        )}

        <View style={{ height: 32 }} />

        <TouchableOpacity
          style={styles.primary}
          onPress={() => {
            resetEnrollment()
            nav.navigate('Enroll')
          }}
        >
          <Text style={styles.primaryText}>{worker ? 'Re-enroll' : 'Enroll worker'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.outline, !worker && styles.disabled]}
          disabled={!worker}
          onPress={() => nav.navigate('CheckIn')}
        >
          <Text style={styles.outlineText}>Daily check-in</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#050a14' },
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  brand: { color: '#06b6d4', fontSize: 32, fontWeight: '800', letterSpacing: 1 },
  tagline: { color: '#9aa8bd', fontSize: 14, marginTop: 4, marginBottom: 32 },
  profile: {
    backgroundColor: '#0b1220',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  profileLabel: { color: '#9aa8bd', fontSize: 12, letterSpacing: 1 },
  profileName: { color: '#e8f0ff', fontSize: 20, fontWeight: '700', marginTop: 4 },
  profileMeta: { color: '#9aa8bd', fontSize: 13, marginTop: 2 },
  none: { color: '#9aa8bd', fontSize: 14 },
  primary: {
    backgroundColor: '#06b6d4',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryText: { color: '#050a14', fontWeight: '800', fontSize: 16 },
  outline: {
    borderColor: '#3b4a63',
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  outlineText: { color: '#9aa8bd', fontSize: 14 },
  disabled: { opacity: 0.4 },
})
