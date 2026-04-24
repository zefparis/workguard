import { submitSignals } from '../services/api'

/**
 * Lightweight pub/sub + batched exfiltrator for behavioral telemetry.
 * Mirrors the web version's `SignalBus` so the backend `/api/signals`
 * ingestion shape stays identical across surfaces.
 *
 *  • Collectors call `SignalBus.emit(channel, payload)` as events happen.
 *  • Every `FLUSH_INTERVAL_MS` we ship whatever has accumulated per channel
 *    to the backend and clear the local buffer.
 *  • Shipping failures are silent — signals are best-effort.
 */

type Listener = (payload: unknown) => void

const FLUSH_INTERVAL_MS = 1000

class SignalBusImpl {
  private buffers: Map<string, unknown[]> = new Map()
  private listeners: Map<string, Set<Listener>> = new Map()
  private flushTimer: ReturnType<typeof setInterval> | null = null

  start(): void {
    if (this.flushTimer !== null) return
    this.flushTimer = setInterval(() => {
      void this.flush()
    }, FLUSH_INTERVAL_MS)
  }

  stop(): void {
    if (this.flushTimer !== null) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
    void this.flush()
  }

  emit(channel: string, payload: unknown): void {
    const buf = this.buffers.get(channel) ?? []
    buf.push({ ...(payload as object), t: Date.now() })
    this.buffers.set(channel, buf)

    const subs = this.listeners.get(channel)
    if (subs) {
      for (const fn of subs) {
        try {
          fn(payload)
        } catch {
          /* listener errors never break the bus */
        }
      }
    }
  }

  on(channel: string, fn: Listener): () => void {
    const subs = this.listeners.get(channel) ?? new Set()
    subs.add(fn)
    this.listeners.set(channel, subs)
    return () => {
      subs.delete(fn)
    }
  }

  private async flush(): Promise<void> {
    if (this.buffers.size === 0) return
    const tasks: Array<Promise<void>> = []
    for (const [channel, batch] of this.buffers.entries()) {
      if (batch.length === 0) continue
      this.buffers.set(channel, [])
      tasks.push(submitSignals(channel, batch))
    }
    await Promise.all(tasks)
  }
}

export const SignalBus = new SignalBusImpl()
