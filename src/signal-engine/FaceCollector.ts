import { SignalBus } from './SignalBus'

/**
 * Face / camera telemetry — frame processor stats, liveness events,
 * capture success/failure ratios. No image data leaves the device via
 * this bus; only boolean / numeric quality indicators.
 */

export const FaceCollector = {
  frameQuality(q: { brightness: number; sharpness?: number; ok: boolean }): void {
    SignalBus.emit('face_frame', q)
  },
  liveness(r: { blink: boolean; motionMs: number; passed: boolean }): void {
    SignalBus.emit('face_liveness', r)
  },
  captureOutcome(o: { ok: boolean; reason?: string }): void {
    SignalBus.emit('face_capture', o)
  },
}
