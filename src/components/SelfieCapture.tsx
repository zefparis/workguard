import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native'
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  type CameraDevice,
} from 'react-native-vision-camera'
import RNFS from 'react-native-fs'
import { FaceCollector } from '../signal-engine/FaceCollector'

/**
 * Front-camera selfie capture. VisionCamera handles the native pipeline;
 * we just request permission, show the preview, snap a photo, base64-encode
 * it, and hand it up to the parent for POSTing.
 *
 * Liveness: a future frame processor hook would run a lightweight
 * blink-detection plugin — for now we log a single capture outcome to the
 * FaceCollector so the backend can reason about retries/failures.
 */

interface Props {
  onCaptured: (base64: string) => void
  onError: (msg: string) => void
}

export const SelfieCapture: React.FC<Props> = ({ onCaptured, onError }) => {
  const camRef = useRef<Camera>(null)
  const device: CameraDevice | undefined = useCameraDevice('front')
  const { hasPermission, requestPermission } = useCameraPermission()
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!hasPermission) {
      void requestPermission().then((granted) => {
        if (!granted) onError('Camera permission denied.')
      })
    }
  }, [hasPermission, onError, requestPermission])

  const handleCapture = useCallback(async () => {
    if (!camRef.current) return
    setBusy(true)
    try {
      const photo = await camRef.current.takePhoto({
        flash: 'off',
        enableShutterSound: false,
      })
      // takePhoto returns a file path; read it as base64.
      const path = Platform.OS === 'ios' ? photo.path : `file://${photo.path}`
      const base64 = await RNFS.readFile(path, 'base64')
      FaceCollector.captureOutcome({ ok: true })
      onCaptured(base64)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Selfie capture failed.'
      FaceCollector.captureOutcome({ ok: false, reason: msg })
      onError(msg)
    } finally {
      setBusy(false)
    }
  }, [onCaptured, onError])

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#06b6d4" />
        <Text style={styles.sub}>Requesting camera access…</Text>
      </View>
    )
  }

  if (!device) {
    return (
      <View style={styles.center}>
        <Text style={styles.err}>No front camera available on this device.</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Selfie</Text>
      <Text style={styles.sub}>Center your face in the frame and tap capture.</Text>

      <View style={styles.cameraBox}>
        <Camera
          ref={camRef}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive
          photo
          onInitialized={() => setReady(true)}
          onError={(e) => onError(e.message)}
        />
      </View>

      <TouchableOpacity
        style={[styles.primary, (!ready || busy) && styles.disabled]}
        onPress={handleCapture}
        disabled={!ready || busy}
      >
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Capture</Text>}
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { padding: 20, alignItems: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: '#e8f0ff', marginBottom: 8 },
  sub: { fontSize: 14, color: '#9aa8bd', textAlign: 'center', marginBottom: 16 },
  err: { color: '#ef4444', textAlign: 'center' },
  cameraBox: {
    width: 300,
    aspectRatio: 3 / 4,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0b1220',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#06b6d4',
  },
  primary: {
    backgroundColor: '#06b6d4',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 10,
    minWidth: 200,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  disabled: { opacity: 0.5 },
})
